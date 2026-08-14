import { supabase } from "@/integrations/supabase/client";

/**
 * CutPlanService - Integração com o motor oficial do Cut Pro.
 * Finalidade: Processar resultados oficiais e gerenciar métricas industriais.
 */
export const CutPlanService = {
  /**
   * Importa o resultado oficial do Cut Pro.
   * Não deve ser substituído por otimizações locais para fins de produção.
   */
  async importOfficialResult(projectId: string, cutProData: any) {
    const { error } = await supabase
      .from("projects")
      .update({
        official_cut_plan_validated: true,
        cutting_status: 'pronto',
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (error) throw error;
    
    // Registrar métricas no log de produção
    await (supabase.from('production_logs') as any).insert({
      project_id: projectId,
      event_type: 'cut_plan_imported',
      description: 'Plano de corte oficial Cut Pro validado.',
      metadata: {
        boards: cutProData.boards_count,
        waste_percent: cutProData.waste_percent,
        total_cuts: cutProData.total_cuts
      }
    });
  },

  /**
   * Gera uma estimativa preliminar (uso interno/orçamentário).
   * Não libera produção.
   */
  async getPreliminaryEstimate(parts: any[]) {
    // Implementação mock da lógica de nesting para orçamento
    const totalArea = parts.reduce((acc, p) => acc + (p.width_mm * p.length_mm * p.quantity), 0) / 1000000;
    return {
      estimated_boards: Math.ceil(totalArea / 5.06), // Base chapa 2.75x1.84
      waste_percent: 15,
      is_official: false,
      warning: "PENDENTE VALIDAÇÃO OFICIAL CUT PRO"
    };
  }
};
