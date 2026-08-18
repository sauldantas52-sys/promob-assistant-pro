import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/AppShell';
import { PieceDetails } from '@/components/factory/PieceDetails';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProductionStep, ProductionStepType, ProductionStatus } from '@/lib/production';

export const Route = createFileRoute('/_authenticated/assembly/piece/$physicalId')({
  component: PieceDetailsPage,
});

function PieceDetailsPage() {
  const { physicalId } = Route.useParams();

  const { data: pieceData, isLoading, error } = useQuery({
    queryKey: ['piece-detail', physicalId],
    queryFn: async () => {
      // 1. First find the production steps to get part_id and project_id
      const { data: stepsRaw, error: stepsError } = await supabase
        .from('production_steps')
        .select('*')
        .eq('physical_id', physicalId);

      if (stepsError) throw stepsError;
      if (!stepsRaw || stepsRaw.length === 0) throw new Error('Peça não encontrada no fluxo de produção.');

      const firstStep = stepsRaw[0];
      const partId = firstStep.part_id;
      const projectId = firstStep.project_id;

      if (!partId) throw new Error('Part ID não encontrado para esta peça física.');
      if (!projectId) throw new Error('Project ID não encontrado para esta peça física.');

      // Map raw steps to ProductionStep interface
      const steps: ProductionStep[] = stepsRaw.map(s => ({
        id: s.id,
        project_id: s.project_id,
        module_id: s.module_id,
        part_id: s.part_id,
        physical_id: s.physical_id,
        step_type: s.step_type as ProductionStepType,
        status: s.status as ProductionStatus,
        notes: s.notes,
        started_at: s.started_at,
        completed_at: s.completed_at
      }));

      // 2. Fetch technical part data
      const { data: part, error: partError } = await supabase
        .from('parts')
        .select('*, modules(*)')
        .eq('id', partId)
        .single();

      if (partError) throw partError;

      // 3. Fetch cut plan info if exists
      const { data: cutPlans, error: cpError } = await supabase
        .from('cut_plans')
        .select('*, cut_sheets(*)')
        .eq('project_id', projectId)
        .eq('is_official', true)
        .maybeSingle();

      return {
        steps,
        part,
        cutPlan: cutPlans,
        projectId,
        physicalId
      };
    }
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-500">Localizando peça...</p>
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500" />
              <div className="space-y-1">
                <h2 className="text-lg font-black uppercase tracking-tight text-red-900">QR NÃO RECONHECIDO</h2>
                <p className="text-sm text-red-700">{error instanceof Error ? error.message : 'Erro ao carregar dados da peça.'}</p>
              </div>
            </CardContent>
          </Card>
        ) : pieceData ? (
          <PieceDetails 
            piece={pieceData.part} 
            steps={pieceData.steps} 
            physicalId={pieceData.physicalId}
            cutPlan={pieceData.cutPlan}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
