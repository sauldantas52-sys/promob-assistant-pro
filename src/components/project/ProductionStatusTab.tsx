import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { updateStepStatus } from "@/lib/production";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { toast } from "sonner";
import { 
  Scissors, 
  Drill, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Layers,
  ChevronRight,
  Activity,
  Zap
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function ProductionStatusTab({ projectId }: { projectId: string }) {
  const { data: steps, isLoading: loadingSteps } = useQuery({
    queryKey: ["production_steps", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_steps")
        .select(`
          *,
          parts(name, material, thickness_mm, width_mm, length_mm)
        `)
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!steps) return null;
    
    const types = ['corte', 'usinagem', 'borda'];
    const summary = types.reduce((acc, type) => {
      const typeSteps = steps.filter(s => s.step_type === type);
      const total = typeSteps.length;
      const completed = typeSteps.filter(s => s.status === 'concluido').length;
      const percent = total > 0 ? (completed / total) * 100 : 0;
      
      acc[type] = { total, completed, percent };
      return acc;
    }, {} as Record<string, { total: number, completed: number, percent: number }>);

    return summary;
  }, [steps]);

  if (loadingSteps) {
    return (
      <div className="p-12 text-center space-y-4">
        <Clock className="h-12 w-12 text-slate-200 mx-auto animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando dados de fábrica...</p>
      </div>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <Card className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-16 text-center">
        <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Rastreabilidade em Processamento</h3>
        <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest max-w-xs mx-auto">
          Os dados industriais estão sendo vinculados às peças. Se o projeto foi importado recentemente, aguarde alguns segundos e recarregue.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" /> Fluxo de Produção Industrial 4.0
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Monitoramento em Tempo Real • Chão de Fábrica
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm group"
            onClick={async () => {
              const pendingSteps = steps.filter(s => s.status !== 'concluido');
              if (pendingSteps.length === 0) {
                toast.info("Toda a produção já está concluída.");
                return;
              }
              
              if (!confirm(`Deseja finalizar TODAS as ${pendingSteps.length} etapas pendentes deste projeto?`)) return;

              try {
                toast.promise(
                  Promise.all(pendingSteps.map(s => updateStepStatus(s.id, 'concluido', 'Finalização global via painel industrial'))),
                  {
                    loading: 'Finalizando projeto completo...',
                    success: 'Projeto finalizado com sucesso!',
                    error: 'Erro na finalização global.'
                  }
                );
              } catch (err) {
                console.error(err);
              }
            }}
          >
            <Zap className="h-3.5 w-3.5 mr-2 text-amber-500 group-hover:text-amber-400" />
            Finalizar Lote Completo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { type: 'corte', icon: Scissors, color: 'text-red-600', bg: 'bg-red-50', label: 'Corte Industrial' },
          { type: 'borda', icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Fita de Borda' },
          { type: 'usinagem', icon: Drill, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Usinagem CNC' },
        ].map((step) => {
          const s = stats?.[step.type];
          return (
            <Card key={step.type} className="rounded-3xl border-none shadow-sm overflow-hidden">
              <div className={cn("p-6 space-y-4", step.bg)}>
                <div className="flex items-center justify-between">
                  <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center bg-white shadow-sm", step.color)}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/80 backdrop-blur-sm text-slate-900 border-none text-[10px] font-black">
                    {s?.completed}/{s?.total} PEÇAS
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-70">{step.label}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">{s?.percent.toFixed(0)}%</p>
                </div>
                <Progress value={s?.percent} className="h-2 bg-white/50" />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-950 py-4 px-8 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Listagem Real de Módulos e Peças</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Sincronização Ativa</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-white/5">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Gabarito: 409 Peças</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Peça</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Corte</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Borda</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Usinagem</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {/* Agrupamos por physical_id para mostrar o status de cada etapa na mesma linha */}
                {Array.from(new Set(steps.map(s => s.physical_id))).map(pid => {
                  const pieceSteps = steps.filter(s => s.physical_id === pid);
                  const pieceInfo = pieceSteps[0]?.parts;
                  const getStepStatus = (type: string) => pieceSteps.find(s => s.step_type === type)?.status || 'pendente';
                  
                  return (
                    <tr key={pid} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase text-slate-900">{pieceInfo?.name || pid}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {pieceInfo?.material} · {pieceInfo?.thickness_mm}mm · {pieceInfo?.length_mm}x{pieceInfo?.width_mm}
                          </span>
                        </div>
                      </td>
                      {['corte', 'borda', 'usinagem'].map(type => {
                        const status = getStepStatus(type);
                        return (
                          <td key={type} className="px-4 py-4 text-center">
                            <div className="flex justify-center">
                              {status === 'concluido' ? (
                                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                              ) : status === 'em_andamento' ? (
                                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none transition-all active:scale-95"
                            onClick={async () => {
                              const stepsToComplete = pieceSteps.filter(s => s.status !== 'concluido');
                              if (stepsToComplete.length === 0) {
                                toast.info("Peça já está concluída em todas as etapas.");
                                return;
                              }
                              
                              try {
                                toast.promise(
                                  Promise.all(stepsToComplete.map(s => updateStepStatus(s.id, 'concluido', 'Finalização rápida por lote'))),
                                  {
                                    loading: 'Finalizando peça...',
                                    success: 'Peça finalizada com sucesso!',
                                    error: 'Erro ao finalizar peça.'
                                  }
                                );
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                            Finalizar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm" asChild title="Abrir Fluxo de Produção">
                             <Link to="/production">
                               <ChevronRight className="h-4 w-4 text-slate-400" />
                             </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
