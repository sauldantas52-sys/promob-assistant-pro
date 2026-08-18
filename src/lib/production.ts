import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProductionStepType = 'corte' | 'usinagem' | 'borda' | 'separacao' | 'montagem' | 'expedicao';
export type ProductionStatus = 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado';

export interface ProductionStep {
  id: string;
  project_id: string;
  module_id?: string | null;
  part_id?: string | null;
  physical_id?: string | null;
  step_type: ProductionStepType;
  status: ProductionStatus;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export const initializeProjectProduction = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    projectId: z.string(),
    companyId: z.string(),
    steps: z.array(z.object({
      physicalId: z.string(),
      partId: z.string(),
      moduleId: z.string().nullable(),
    }))
  }).parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabase.rpc('initialize_production_tracking', {
      p_project_id: data.projectId,
      p_company_id: data.companyId,
      p_steps: data.steps
    });
    
    if (error) throw error;
    return { success: true };
  });

export async function logProductionAction(projectId: string, action: string, metadata: any = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase.from('production_logs') as any).insert({
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data: step, error: stepError } = await supabase
    .from('production_steps')
    .select('project_id, status')
    .eq('id', stepId)
    .single();
  
  if (stepError) throw stepError;

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

  await (supabase.from('production_logs') as any).insert({
    project_id: step.project_id,
    user_id: user.id,
    action: `Alteração de status da etapa: ${status}`,
    status_from: step.status,
    status_to: status,
    notes: notes || null
  });
}

