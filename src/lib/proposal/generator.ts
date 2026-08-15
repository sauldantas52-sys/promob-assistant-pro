import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * CommercialProposalService - Motor de propostas e contratos oficiais.
 */
export const CommercialProposalService = {
  /**
   * Gera uma nova versão de orçamento para o projeto.
   */
  async createQuote(params: {
    projectId: string;
    companyId: string;
    items: Json[];
    total: number;
  }) {
    const { data, error } = await supabase
      .from("project_quotes")
      .insert({
        project_id: params.projectId,
        company_id: params.companyId,
        status: "rascunho",
        total_value: params.total,
        data: { items: params.items },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Aprovação comercial do projeto.
   * Libera o bloqueio comercial para permitir o avanço para a fábrica.
   */
  async approveQuote(quoteId: string, projectId: string) {
    // 1. Marcar orçamento como aprovado
    const { error: qError } = await supabase
      .from("project_quotes")
      .update({ status: "aprovado", updated_at: new Date().toISOString() })
      .eq("id", quoteId);

    if (qError) throw qError;

    // 2. Registrar a aprovação sem saltar os gates sequenciais da produção.
    const { error: pError } = await supabase
      .from("projects")
      .update({
        commercial_approved: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (pError) throw pError;
  },
};
