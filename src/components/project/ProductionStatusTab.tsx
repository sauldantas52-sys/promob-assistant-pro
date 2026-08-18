import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Scissors, 
  Drill, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Layers,
  ChevronRight
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
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Rastreabilidade não iniciada</h3>
        <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest max-w-xs mx-auto">
          Libere o projeto para produção no Pipeline para começar o acompanhamento de corte e usinagem.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" /> Status de Produção Real
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Monitoramento de Peças em Tempo Real • Chão de Fábrica
          </p>
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
        <CardHeader className="bg-slate-900 py-4 px-6">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Listagem Detalhada de Peças</CardTitle>
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
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-white hover:shadow-sm" asChild>
                           <Link to="/production">
                             <ChevronRight className="h-4 w-4 text-slate-400" />
                           </Link>
                        </Button>
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
