import { supabase } from "@/integrations/supabase/client";

export type ProductionStepType = 'corte' | 'usinagem' | 'borda' | 'separacao' | 'montagem';
export type ProductionStatus = 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado';

export interface ProductionStep {
  id: string;
  project_id: string;
  module_id?: string | null;
  part_id?: string | null;
  step_type: ProductionStepType;
  status: ProductionStatus;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export async function logProductionAction(projectId: string, action: string, metadata: any = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('production_logs').insert({
    project_id: projectId,
    user_id: user.id,
    action,
    metadata
  });
}

export async function updateStepStatus(
  stepId: string, 
  status: ProductionStatus, 
  notes?: string
) {
  const updateData: any = { 
    status, 
    updated_at: new Date().toISOString() 
  };

  if (status === 'em_andamento') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'concluido') {
    updateData.completed_at = new Date().toISOString();
  }

  if (notes) updateData.notes = notes;

  const { error } = await supabase
    .from('production_steps')
    .update(updateData)
    .eq('id', stepId);

  if (error) throw error;
}
