import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const sendOrderToWhatsAppSchema = z.object({
  orderId: z.string().uuid(),
});

function digitsOnly(str: string) {
  return str.replace(/\D/g, "");
}

export const sendOrderToWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => sendOrderToWhatsAppSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .single();

    if (!profile) throw new Error("Perfil não encontrado.");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (
      !role ||
      !["admin", "comercial", "projetista", "escritorio"].includes(role.role)
    ) {
      throw new Error("Seu perfil não pode enviar ordens terceirizadas.");
    }

    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from("outsourcing_orders" as any)
      .select(
        "id, company_id, project_id, order_number, status, message_text, xml_file_id, supplier_id, suppliers(name, whatsapp, company_id), projects(company_id), project_files(file_name, storage_path, file_type, project_id)",
      )
      .eq("id", data.orderId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (orderError || !order) throw new Error("Ordem terceirizada não encontrada.");
    
    const typedOrder = order as any;
    
    if (!typedOrder.xml_file_id || !typedOrder.project_files?.storage_path) {
      throw new Error("A ordem não possui um XML armazenado.");
    }
    
    if (!typedOrder.suppliers?.whatsapp) throw new Error("O fornecedor não possui WhatsApp cadastrado.");
    
    if (
      typedOrder.suppliers.company_id !== profile.company_id ||
      typedOrder.projects.company_id !== profile.company_id ||
      typedOrder.project_files.project_id !== typedOrder.project_id
    ) {
      throw new Error("Violação de segurança: inconsistência de dados do cliente.");
    }

    const recipient = digitsOnly(typedOrder.suppliers.whatsapp);
    if (recipient.length < 10 || recipient.length > 15) {
      throw new Error("O WhatsApp do fornecedor é inválido.");
    }
    
    const messageText =
      typedOrder.message_text ||
      `Olá, prezado fornecedor. Segue o XML da ordem ${typedOrder.order_number} para produção.`;

    const outboxId = crypto.randomUUID();
    const { error: outboxError } = await (supabaseAdmin as any).from("communication_outbox" as any).insert({
      id: outboxId,
      company_id: profile.company_id,
      outsourcing_order_id: typedOrder.id,
      channel: "whatsapp",
      recipient,
      message_text: messageText,
      attachment_path: typedOrder.project_files.storage_path,
      status: "processing",
      attempt_count: 1,
      created_by: context.userId,
    });
    
    if (outboxError) {
      if ((outboxError as any).code === "23505") {
        throw new Error("Esta ordem já está em envio ou foi enviada.");
      }
      throw new Error("Não foi possível registrar a tentativa de envio.");
    }

    let providerAccepted = false;
    let messageRequestStarted = false;

    try {
      messageRequestStarted = true;
      const response = await fetch("https://api.mock-whatsapp-industrial.com/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          message: messageText,
          file: typedOrder.project_files.storage_path,
          metadata: {
            order_id: typedOrder.id,
            company_id: profile.company_id,
          },
        }),
      });

      if (response.ok) {
        providerAccepted = true;
      }
    } catch (e) {
      console.error("WhatsApp Mock Provider Error:", e);
    }

    if (providerAccepted) {
      await (supabaseAdmin as any)
        .from("communication_outbox" as any)
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", outboxId);

      await (supabaseAdmin as any)
        .from("outsourcing_orders" as any)
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedOrder.id);

      return { success: true, message: "Ordem enviada com sucesso!" };
    } else {
      await (supabaseAdmin as any)
        .from("communication_outbox" as any)
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", outboxId);
      throw new Error("Falha no provedor de envio de WhatsApp. Tente novamente mais tarde.");
    }
  });
