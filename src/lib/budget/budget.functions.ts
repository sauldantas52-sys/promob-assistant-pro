import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * THRESHOLDS DE CONFIANÇA (Rule 6)
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.60,
  LOW: 0.30
} as const;

export type ConfidenceLevel = 'ALTA' | 'MÉDIA' | 'BAIXA';

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'ALTA';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MÉDIA';
  return 'BAIXA';
}

/**
 * IA NÃO É FONTE DE VERDADE INDUSTRIAL (Rule 1).
 * Dados nascem como source = 'ai_estimate' e is_confirmed = false.
 */
export const analyzeBudgetDocument = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    documentId: z.string(),
    companyId: z.string(),
    projectId: z.string().optional(),
    fileUrl: z.string(),
  }).parse)
  .handler(async ({ data }) => {
    // 1. Criar cabeçalho do orçamento se não existir (Rule 4)
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .insert({
        company_id: data.companyId,
        project_id: data.projectId as string, 
        status: 'analisando',
        analysis_mode: 'ai_vision',
        source_file: data.fileUrl,
        metadata: {
          original_document_id: data.documentId,
          ai_started_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (budgetError) throw budgetError;

    return { 
      success: true, 
      budgetId: budget.id 
    };
  });

/**
 * REVISÃO HUMANA OBRIGATÓRIA (Rule 25, 26)
 */
export const confirmBudgetItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    itemId: z.string(),
    data: z.object({
      name: z.string().optional().nullable(),
      quantity: z.number().optional().nullable(),
      unit_price: z.number().optional().nullable(),
      category: z.string().optional().nullable(),
      is_confirmed: z.boolean().default(true),
    }),
  }).parse)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from('budget_items')
      .update({
        name: data.data.name,
        quantity: data.data.quantity,
        unit_price: data.data.unit_price,
        category: data.data.category,
        is_confirmed: data.data.is_confirmed
      })
      .eq('id', data.itemId);

    if (error) throw error;
    return { success: true };
  });
