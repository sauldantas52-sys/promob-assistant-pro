import { createServerFn } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Nota: Devido a restrições de segurança do Supabase Cloud, 
 * a criação de usuários autenticados reais via API (Auth Admin)
 * requer a chave de serviço que não está disponível para o agente.
 * 
 * Por este motivo, implementamos a lógica de rastreio e auditoria.
 * O fluxo recomendado para o administrador é enviar o link de cadastro da aplicação
 * e o sistema forçará as regras de troca de senha e isolamento por empresa.
 */

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    email: z.string().email(),
    fullName: z.string().min(2),
    role: z.string(),
    companyId: z.string().uuid()
  }).parse(data))
  .handler(async ({ data }) => {
    // Registro de auditoria do convite
    const { error: logError } = await supabase.from("production_logs").insert({
      project_id: "",
      step: "convite_usuario",
      notes: `Admin solicitou convite para ${data.email} (${data.role})`,
      status: "concluido"
    } as any);

    if (logError) throw logError;

    return { 
      success: true, 
      message: "Convite registrado. Instrua o usuário a se cadastrar com este e-mail." 
    };
  });
