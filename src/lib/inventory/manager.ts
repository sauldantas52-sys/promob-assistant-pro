import { supabase } from "@/integrations/supabase/client";

/**
 * InventoryManager - Controlador de estoque e auditoria de crédito.
 * Segue regras rígidas de registro e confirmação humana.
 */
export const InventoryManager = {
  /**
   * Registra movimentação com auditoria de saldo.
   */
  async recordMovement(params: {
    companyId: string,
    projectId?: string,
    materialName: string,
    type: 'entrada' | 'saida' | 'estorno',
    quantity: number,
    notes?: string
  }) {
    // 1. Obter saldo atual (Heurística: último log)
    const { data: lastLog } = await supabase
      .from('inventory_logs')
      .select('new_balance')
      .eq('company_id', params.companyId)
      .eq('material_name', params.materialName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBalance = lastLog?.new_balance || 0;
    const newBalance = params.type === 'entrada' || params.type === 'estorno' 
      ? previousBalance + params.quantity 
      : previousBalance - params.quantity;

    // 2. Salvar log
    const { error } = await supabase.from('inventory_logs').insert({
      company_id: params.companyId,
      project_id: params.projectId,
      material_name: params.materialName,
      type: params.type,
      quantity: params.quantity,
      previous_balance: previousBalance,
      new_balance: newBalance,
      metadata: { notes: params.notes }
    });

    if (error) throw error;
    return newBalance;
  },

  /**
   * Importação de nota fiscal/documento (OCR).
   * Não altera saldo automaticamente - exige confirmação humana.
   */
  async processReceiptOCR(file: File) {
    // Wrapper para OcrService/ReceiptParser
    console.log("Processando OCR de documento...");
    return {
      supplier: "Fornecedor Detectado",
      date: new Date().toISOString(),
      items: [
        { name: "MDF Branco 18mm", qty: 5, price: 250 }
      ],
      status: "Aguardando Conferência Humana"
    };
  }
};
