import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const seedIntegrationTestData = createServerFn({ method: "POST" })
  .inputValidator((data: any) => z.object({
    userId: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const admin = supabaseAdmin as any;
    
    // 1. Create Company
    const { data: company, error: cErr } = await admin
      .from("companies")
      .insert({ name: "Fábrica Piloto SKP (Test)" })
      .select()
      .single();
    
    if (cErr) return { error: cErr.message };

    // 2. Create Profile
    const { error: pErr } = await admin
      .from("profiles")
      .insert({
        id: data.userId,
        company_id: company.id,
        full_name: "Operador de Teste",
        role: "admin"
      });
    
    if (pErr) return { error: pErr.message };

    // 3. Create Project
    const { data: project, error: projErr } = await admin
      .from("projects")
      .insert({
        company_id: company.id,
        name: "PROJETO TESTE INTEGRAÇÃO SKP",
        status: "pilot",
        machining_blocked: true,
        data: { is_test: true }
      })
      .select()
      .single();

    if (projErr) return { error: projErr.message };

    return { projectId: project.id, companyId: company.id };
  });
