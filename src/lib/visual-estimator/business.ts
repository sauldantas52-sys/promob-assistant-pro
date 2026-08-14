import { supabase } from "@/integrations/supabase/client";

/**
 * WhatsAppService - Notificações operacionais automáticas.
 */
export const WhatsAppService = {
  async sendProductionUpdate(projectId: string, message: string) {
    // Integração mock com API de mensageria
    console.log(`[WhatsApp] Notificação Projeto ${projectId}: ${message}`);
    
    await (supabase.from('production_logs') as any).insert({
      project_id: projectId,
      event_type: 'whatsapp_notification',
      description: `Mensagem enviada: ${message.substring(0, 50)}...`,
      metadata: { channel: 'WhatsApp', success: true }
    });

    return { sent: true, provider: "MockGateway" };
  }
};

/**
 * BusinessEngine - Motor de regras de negócio e validações cruzadas.
 */
export const BusinessEngine = {
  /**
   * Valida se o projeto pode avançar para expedição.
   */
  async canShip(projectId: string) {
    const { data: project } = await supabase
      .from('projects')
      .select('status, machining_blocked, commercial_approved')
      .eq('id', projectId)
      .single();

    if (!project) return false;
    
    // Regra: Não expedir se não estiver aprovado comercialmente ou se usinagem ainda estiver bloqueada (opcional dependendo do fluxo)
    return project.status === 'concluido' && project.commercial_approved === true;
  }
};
