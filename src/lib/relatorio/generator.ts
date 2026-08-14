import { supabase } from "@/integrations/supabase/client";

/**
 * ContractGenerator - Motor de geração de instrumentos jurídicos e termos.
 */
export const ContractGenerator = {
  /**
   * Gera um rascunho de contrato baseado no orçamento aprovado.
   */
  async generateDraft(projectId: string, quoteId: string) {
    const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single();
    const { data: quote } = await supabase.from('project_quotes').select('total_value').eq('id', quoteId).single();

    return {
      title: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS - ${project?.name}`,
      clauses: [
        "Cláusula 1: Objeto do serviço conforme lista técnica Promob.",
        "Cláusula 2: Prazos de fabricação condicionados à validação técnica.",
        `Cláusula 3: Valor total de R$ ${quote?.total_value?.toLocaleString('pt-BR')}.`,
        "Cláusula 4: A usinagem CNC está bloqueada até auditoria física."
      ],
      generated_at: new Date().toISOString(),
      status: "PENDENTE ASSINATURA"
    };
  }
};

/**
 * RelatorioService - Consolidação de métricas industriais.
 */
export const RelatorioService = {
  async generateIndustrialReport(projectId: string) {
    const { data: logs } = await supabase
      .from('production_logs')
      .select('*')
      .eq('project_id', projectId);

    return {
      total_events: logs?.length || 0,
      safety_lock: "machining_blocked = true",
      generated_at: new Date().toISOString()
    };
  }
};
