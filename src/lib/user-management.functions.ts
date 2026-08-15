
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const inviteUser = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    email: z.string().email(),
    fullName: z.string().min(2),
    role: z.string(),
    companyId: z.string().uuid()
  }).parse(data))
  .handler(async ({ data }) => {
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
