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
  .inputValidator((data: any) => z.object({
    documentId: z.string(),
    companyId: z.string(),
    projectId: z.string().optional(),
    fileUrl: z.string(),
  }).parse(data))
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

    // SIMULAÇÃO DE PROCESSAMENTO IA (lovable-vision-4.0)
    // Em produção real, integraríamos com: aiGateway.vision.analyze({ image: data.fileUrl })
    const mockItems = [
      { 
        budget_id: budget.id, 
        name: "MÓDULO TORRE - ARMÁRIO 01", 
        quantity: 1, 
        unit_price: 2450.00, 
        total_price: 2450.00,
        category: "MARCENARIA", 
        confidence: 0.98, 
        is_confirmed: false,
        source: 'ai_estimate'
      },
      { 
        budget_id: budget.id, 
        name: "KIT CORREDIAÇAS TELESCÓPICAS 450MM", 
        quantity: 6, 
        unit_price: 85.00, 
        total_price: 510.00,
        category: "FERRAGENS", 
        confidence: 0.88, 
        is_confirmed: false,
        source: 'ai_estimate'
      },
      { 
        budget_id: budget.id, 
        name: "PORTA RIPADA MDF FREIJÓ", 
        quantity: 2, 
        unit_price: 680.00, 
        total_price: 1360.00,
        category: "ACABAMENTOS", 
        confidence: 0.55, 
        is_confirmed: false,
        source: 'ai_estimate'
      }
    ];

    await supabaseAdmin.from('budget_items').insert(mockItems);

    // Atualizar o valor total estimado no cabeçalho
    const estimatedTotal = mockItems.reduce((acc, item) => acc + item.total_price, 0);
    await supabaseAdmin.from('budgets').update({ total_value: estimatedTotal }).eq('id', budget.id);

    return { 
      success: true, 
      budgetId: budget.id 
    };
  });

/**
 * REVISÃO HUMANA OBRIGATÓRIA (Rule 25, 26)
 */
export const confirmBudgetItem = createServerFn({ method: "POST" })
  .inputValidator((data: any) => z.object({
    itemId: z.string(),
    data: z.object({
      name: z.string().optional().nullable(),
      quantity: z.number().optional().nullable(),
      unit_price: z.number().optional().nullable(),
      category: z.string().optional().nullable(),
      is_confirmed: z.boolean().default(true),
    }),
  }).parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from('budget_items')
      .update({
        name: data.data.name ?? null,
        quantity: data.data.quantity ?? null,
        unit_price: data.data.unit_price ?? null,
        category: data.data.category ?? null,
        is_confirmed: data.data.is_confirmed
      })
      .eq('id', data.itemId);

    if (error) throw error;

    // Recalcular total do orçamento após confirmação
    const { data: item } = await supabaseAdmin.from('budget_items').select('budget_id').eq('id', data.itemId).single();
    if (item) {
      const { data: allItems } = await supabaseAdmin.from('budget_items').select('total_price').eq('budget_id', item.budget_id).eq('is_confirmed', true);
      const newTotal = allItems?.reduce((acc, i) => acc + (i.total_price || 0), 0) || 0;
      await supabaseAdmin.from('budgets').update({ total_value: newTotal }).eq('id', item.budget_id);
    }

    return { success: true };
  });
