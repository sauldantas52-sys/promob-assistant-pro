import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const analyzeBudgetDocument = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    documentId: z.string(),
    fileUrl: z.string(),
  }).parse)
  .handler(async ({ data }) => {
    // This is the entry point for IA analysis. 
    // The orchestration logic will be implemented here.
    return { success: true, analysisId: "pending" };
  });

export const confirmBudgetItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    itemId: z.string(),
    data: z.object({
      description: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
    }),
  }).parse)
  .handler(async ({ data }) => {
    // Human revision logic.
    return { success: true };
  });
