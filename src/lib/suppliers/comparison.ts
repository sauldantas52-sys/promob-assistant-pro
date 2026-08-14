import { supabase } from "@/integrations/supabase/client";

/**
 * SupplierService - Comparação de fornecedores e cotações.
 */
export const SupplierService = {
  /**
   * Obtém a melhor oferta para um material específico.
   */
  async getBestOffer(companyId: string, materialName: string) {
    const { data, error } = await supabase
      .from("supplier_prices")
      .select("*")
      .eq("company_id", companyId)
      .eq("material_name", materialName)
      .eq("availability", true)
      .order("price_per_unit", { ascending: true });

    if (error) throw error;
    
    // Calcula o custo total (preço + frete)
    const offers = (data || []).map(offer => ({
      ...offer,
      total_cost: Number(offer.price_per_unit) + Number(offer.shipping_cost || 0)
    }));

    return offers.sort((a, b) => a.total_cost - b.total_cost)[0];
  },

  /**
   * Registra histórico de cotação/mensagem via WhatsAppService (mock).
   */
  async logSupplierContact(projectId: string, supplierName: string, message: string) {
    await (supabase.from('production_logs') as any).insert({
      project_id: projectId,
      event_type: 'supplier_contact',
      description: `Contato enviado para ${supplierName}`,
      metadata: { message, channel: 'WhatsApp' }
    });
  }
};
