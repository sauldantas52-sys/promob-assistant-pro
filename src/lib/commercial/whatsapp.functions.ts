import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendOrderSchema = z.object({ orderId: z.string().uuid() });

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export const sendOutsourcingOrderWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => sendOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const accessToken = process.env["WHATSAPP_ACCESS_TOKEN"];
    const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
    const graphVersion = process.env["WHATSAPP_GRAPH_VERSION"] || "v21.0";
    if (!accessToken || !phoneNumberId) {
      throw new Error("WhatsApp Business ainda não está configurado no servidor.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile }, { data: role }] = await Promise.all([
      supabaseAdmin.from("profiles").select("company_id").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
    ]);
    if (
      !profile?.company_id ||
      !role ||
      !["admin", "comercial", "projetista", "escritorio"].includes(role.role)
    ) {
      throw new Error("Seu perfil não pode enviar ordens terceirizadas.");
    }

    const { data: order, error: orderError } = (await supabase) as anyAdmin
      .from("outsourcing_orders" as any)
      .select(
        "id, company_id, project_id, order_number, status, message_text, xml_file_id, supplier_id, suppliers(name, whatsapp, company_id), projects(company_id), project_files(file_name, storage_path, file_type, project_id)",
      )
      .eq("id", data.orderId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (orderError || !order) throw new Error("Ordem terceirizada não encontrada.");
    if (!order.xml_file_id || !order.project_files?.storage_path) {
      throw new Error("A ordem não possui um XML armazenado.");
    }
    if (!order.suppliers?.whatsapp) throw new Error("O fornecedor não possui WhatsApp cadastrado.");
    if (
      order.suppliers.company_id !== profile.company_id ||
      order.projects?.company_id !== profile.company_id ||
      order.project_files?.project_id !== order.project_id ||
      order.project_files?.file_type !== "xml"
    ) {
      throw new Error("As referências da ordem não pertencem ao mesmo projeto e empresa.");
    }
    if (!["draft", "reviewed"].includes(order.status)) {
      throw new Error("A ordem não está disponível para envio.");
    }

    const recipient = digitsOnly(order.suppliers.whatsapp);
    if (recipient.length < 10 || recipient.length > 15) {
      throw new Error("O WhatsApp do fornecedor é inválido.");
    }
    const messageText =
      order.message_text ||
      `Olá, prezado fornecedor. Segue o XML da ordem ${order.order_number} para produção.`;

    const outboxId = crypto.randomUUID();
    const { error: outboxError } = await supabaseAdmin.from("communication_outbox" as any).insert({
      id: outboxId,
      company_id: profile.company_id,
      outsourcing_order_id: order.id,
      channel: "whatsapp",
      recipient,
      message_text: messageText,
      attachment_path: order.project_files.storage_path,
      status: "processing",
      attempt_count: 1,
      created_by: context.userId,
    });
    if (outboxError) {
      if (outboxError.code === "23505") {
        throw new Error("Esta ordem já está em envio ou foi enviada.");
      }
      throw new Error("Não foi possível registrar a tentativa de envio.");
    }

    let providerAccepted = false;
    let messageRequestStarted = false;
    let messageResponseReceived = false;
    try {
      const { data: object, error: downloadError } = await supabaseAdmin.storage
        .from("project-files")
        .download(order.project_files.storage_path);
      if (downloadError || !object) throw new Error("Não foi possível carregar o XML da ordem.");

      const mediaForm = new FormData();
      mediaForm.set("messaging_product", "whatsapp");
      mediaForm.set("type", object.type || "application/xml");
      mediaForm.set("file", object, order.project_files.file_name || `${order.order_number}.xml`);
      const mediaResponse = await fetch(
        `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/media`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: mediaForm },
      );
      const media = (await mediaResponse.json()) as { id?: string; error?: { message?: string } };
      if (!mediaResponse.ok || !media.id) {
        throw new Error(media.error?.message || "A Meta recusou o upload do XML.");
      }

      messageRequestStarted = true;
      const messageResponse = await fetch(
        `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient,
            type: "document",
            document: {
              id: media.id,
              filename: order.project_files.file_name || `${order.order_number}.xml`,
              caption: messageText,
            },
          }),
        },
      );
      const message = (await messageResponse.json()) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string };
      };
      messageResponseReceived = true;
      const providerMessageId = message.messages?.[0]?.id;
      if (!messageResponse.ok || !providerMessageId) {
        throw new Error(message.error?.message || "A Meta recusou o envio da ordem.");
      }
      providerAccepted = true;

      const [outboxUpdate, orderUpdate] = await Promise.all([
        supabaseAdmin
          .from("communication_outbox" as any)
          .update({
            status: "sent",
            provider_message_id: providerMessageId,
            sent_at: new Date().toISOString(),
          })
          .eq("id", outboxId),
        supabaseAdmin
          .from("outsourcing_orders" as any)
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", order.id),
      ]);
      if (outboxUpdate.error || orderUpdate.error) {
        throw new Error("A mensagem foi aceita, mas a confirmação local falhou. Não reenvie.");
      }
      return { success: true };
    } catch (error) {
      const deliveryUnknown =
        messageRequestStarted && !messageResponseReceived && !providerAccepted;
      const { error: failureUpdateError } = await supabaseAdmin
        .from("communication_outbox" as any)
        .update({
          status: providerAccepted ? "sent" : deliveryUnknown ? "delivery_unknown" : "failed",
          last_error: error instanceof Error ? error.message.slice(0, 500) : "Falha de envio",
          ...(providerAccepted ? { sent_at: new Date().toISOString() } : {}),
        })
        .eq("id", outboxId);
      const { error: orderRecoveryError } = providerAccepted
        ? await supabaseAdmin
            .from("outsourcing_orders" as any)
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", order.id)
        : { error: null };
      if (failureUpdateError || orderRecoveryError) {
        throw new Error("Falha no envio e no registro da auditoria. Não reenvie sem conferir.");
      }
      if (deliveryUnknown) {
        throw new Error(
          "A resposta da Meta não chegou. O reenvio foi bloqueado até a entrega ser conciliada.",
        );
      }
      throw error;
    }
  });
