import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProductionStepType = 'corte' | 'usinagem' | 'borda' | 'separacao' | 'montagem' | 'expedicao';
export type ProductionStatus = 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado' | 'nao_necessaria';

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
  .validator((data) => z.object({
    projectId: z.string(),
    companyId: z.string(),
    steps: z.array(z.object({
      physicalId: z.string(),
      partId: z.string(),
      moduleId: z.string().nullable(),
      needsEdge: z.boolean().optional(),
    }))
  }) as any)

  .handler(async ({ data }) => {
    const { error } = await supabase.rpc('initialize_production_tracking', {
      p_project_id: data.projectId,
      p_company_id: data.companyId,
      p_steps: data.steps
    });
    
    if (error) throw error;
    return { success: true };
  });

export async function logProductionAction(
  projectId: string, 
  action: string, 
  metadata: { physical_id: string; [key: string]: any }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  await (supabase.from('production_logs') as any).insert({
    project_id: projectId,
    user_id: user.id,
    company_id: profile?.company_id,
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  const { data: step, error: stepError } = await supabase
    .from('production_steps')
    .select('project_id, physical_id, step_type, status')
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
    company_id: profile?.company_id,
    action: `update_status:${step.step_type}`,
    status_from: step.status,
    status_to: status,
    notes: notes || null,
    metadata: {
      physical_id: step.physical_id,
      step_type: step.step_type,
      step_id: stepId
    }
  });
}

