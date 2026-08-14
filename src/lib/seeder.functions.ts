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
      .insert({ name: "Fábrica Piloto Audit (Test)" })
      .select()
      .single();
    
    if (cErr) return { error: cErr.message };

    // 2. Upsert Profile
    await admin.from("profiles").upsert({
      id: data.userId,
      company_id: company.id,
      full_name: "Auditor Industrial"
    });

    // 3. Create Project - Pilot Security Test
    const { data: project, error: projErr } = await admin
      .from("projects")
      .insert({
        company_id: company.id,
        name: "PROJETO AUDITORIA GATES 4.0",
        client_name: "Laboratório de Testes",
        status: "orcamento",
        environment: "Cozinha Industrial",
        machining_blocked: true
      })
      .select()
      .single();

    if (projErr) return { error: projErr.message };

    // 4. Ensure validation_checks is empty for this project (default state)
    await admin
      .from("validation_checks")
      .delete()
      .eq("project_id", project.id);

    return { projectId: project.id, companyId: company.id };
  });
