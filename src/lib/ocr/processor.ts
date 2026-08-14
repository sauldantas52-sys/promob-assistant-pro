import { supabase } from "@/integrations/supabase/client";

/**
 * ReceiptParser - Extrator de metadados de documentos industriais e financeiros.
 * Responsável por converter OCR em dados estruturados.
 */
export const ReceiptParser = {
  /**
   * Converte o texto bruto do OCR em um objeto estruturado de conferência.
   */
  async parseOCRResult(rawText: string) {
    // Lógica de regex para identificar fornecedores e valores comuns (Mock oficial)
    const isSupplierA = rawText.includes("FORNECEDOR A");
    const totalMatch = rawText.match(/R\$\s?(\d+[,.]\d+)/);
    const totalValue = totalMatch ? parseFloat(totalMatch[1].replace(',', '.')) : 0;

    return {
      parsed_at: new Date().toISOString(),
      confidence: 0.85,
      extracted_data: {
        supplier: isSupplierA ? "Fornecedor A Industrial" : "Desconhecido",
        total: totalValue,
        currency: "BRL",
        items_count: (rawText.match(/\d+x/g) || []).length
      }
    };
  }
};

/**
 * StoreCreditService - Auditoria de saldos e lançamentos financeiros.
 */
export const StoreCreditService = {
  /**
   * Verifica o saldo disponível para um fornecedor.
   */
  async getSupplierBalance(companyId: string, supplierName: string) {
    const { data } = await supabase
      .from('inventory_logs')
      .select('new_balance')
      .eq('company_id', companyId)
      .eq('material_name', supplierName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.new_balance || 0;
  }
};
