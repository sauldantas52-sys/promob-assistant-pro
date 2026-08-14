import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const calculateProjectBudget = createServerFn({ method: "POST" })
  .inputValidator((data: any) => z.object({
    projectId: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const admin = supabaseAdmin as any;

    // 1. Get project parts
    const { data: parts, error: pError } = await admin
      .from("parts")
      .select("material, width_mm, length_mm, quantity")
      .eq("project_id", data.projectId);

    if (pError) throw new Error("Failed to load parts");

    // 2. Get pricing configs for the company
    const { data: project } = await admin.from("projects").select("company_id").eq("id", data.projectId).single();
    const { data: pricing } = await admin.from("pricing_configs").select("*").eq("company_id", project.company_id);

    let totalMaterialCost = 0;
    
    parts?.forEach((part: any) => {
      const config = pricing?.find((c: any) => c.material_name === part.material) || { cost_per_m2: 120, markup_percent: 30 };
      const areaM2 = (part.width_mm * part.length_mm) / 1000000;
      const cost = areaM2 * config.cost_per_m2 * part.quantity;
      totalMaterialCost += cost * (1 + (config.markup_percent / 100));
    });

    return {
      total: totalMaterialCost,
      currency: "BRL"
    };
  });
