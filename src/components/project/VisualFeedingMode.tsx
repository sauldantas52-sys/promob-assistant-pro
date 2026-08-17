import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Box, 
  FileText, 
  Layers, 
  MessageSquare,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VisualFeedingModeProps {
  projectId: string;
  projectName?: string;
}

export function VisualFeedingMode({ projectId, projectName }: VisualFeedingModeProps) {
  const queryClient = useQueryClient();

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ["modules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*, parts(*)")
        .eq("project_id", projectId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: identifications } = useQuery({
    queryKey: ["visual-identifications", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visual_identifications" as any)
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const upsertIdentification = useMutation({
    mutationFn: async ({ 
      moduleId, 
      observation, 
      confidence 
    }: { 
      moduleId: string; 
      observation: string; 
      confidence: string 
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const { error } = await (supabase as any).from("visual_identifications").upsert({
        project_id: projectId,
        module_id: moduleId,
        observation,
        confidence_level: confidence,
        created_by: userData.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: "project_id,module_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conferência visual salva.");
      queryClient.invalidateQueries({ queryKey: ["visual-identifications", projectId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  if (loadingModules) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando Módulos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-lime-600" /> Alimentação Visual Industrial
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Conferência de Fidelidade: DXF ↔ Módulos ↔ Peças
          </p>
        </div>
        <Badge variant="outline" className="rounded-full bg-slate-50 border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-widest px-3 py-1">
          {modules?.length || 0} Módulos Detectados
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {modules?.map((module) => {
            const ident = identifications?.find((i: any) => i.module_id === module.id);
            const isConfirmed = ident?.confidence_level === 'confirmado';

            return (
              <Card key={module.id} className={cn(
                "rounded-[2rem] border-2 transition-all duration-300",
                isConfirmed ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 bg-white"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
                        isConfirmed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        <Box className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{module.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[8px] uppercase font-black px-2">
                            {module.width_mm}x{module.height_mm}x{module.depth_mm}mm
                          </Badge>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[8px] uppercase font-black px-2">
                            {module.parts?.length || 0} Peças
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm"
                        variant={isConfirmed ? "default" : "outline"}
                        className={cn(
                          "rounded-xl h-8 text-[9px] font-black uppercase tracking-widest",
                          isConfirmed ? "bg-emerald-600 text-white" : "text-slate-500"
                        )}
                        onClick={() => upsertIdentification.mutate({ 
                          moduleId: module.id, 
                          confidence: isConfirmed ? 'pendente' : 'confirmado',
                          observation: ident?.observation || ''
                        })}
                      >
                        {isConfirmed ? <ShieldCheck className="h-3 w-3 mr-2" /> : <Circle className="h-3 w-3 mr-2" />}
                        {isConfirmed ? "Confirmado" : "Confirmar"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400">
                      <MessageSquare className="h-3 w-3" /> Observações do Projetista
                    </div>
                    <Textarea 
                      placeholder="Ex: Furação especial confirmada no DXF..."
                      className="text-xs min-h-[60px] rounded-xl border-slate-100 bg-slate-50/50 resize-none focus-visible:ring-lime-500"
                      defaultValue={ident?.observation || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (ident?.observation || '')) {
                          upsertIdentification.mutate({
                            moduleId: module.id,
                            confidence: ident?.confidence_level || 'pendente',
                            observation: e.target.value
                          });
                        }
                      }}
                    />
                  </div>

                  {module.parts && module.parts.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 mb-3">
                        <Layers className="h-3 w-3" /> Explosão de Peças
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {module.parts.slice(0, 4).map((part: any) => (
                          <div key={part.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="h-6 w-6 rounded bg-white border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400">
                              {part.quantity}
                            </div>
                            <span className="text-[9px] font-bold text-slate-600 uppercase truncate">{part.name}</span>
                          </div>
                        ))}
                        {module.parts.length > 4 && (
                          <div className="flex items-center justify-center p-2 rounded-lg bg-slate-50/50 border border-dashed border-slate-200 text-[8px] font-black text-slate-400 uppercase">
                            + {module.parts.length - 4} Outros Itens
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none bg-slate-900 text-white p-6 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-lime-400 mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Resumo da Auditoria
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Módulos</span>
                <span className="text-lg font-black">{modules?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400">Confirmados</span>
                <span className="text-lg font-black text-emerald-400">
                  {identifications?.filter((i: any) => i.confidence_level === 'confirmado').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Status Geral</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  {identifications?.filter((i: any) => i.confidence_level === 'confirmado').length === modules?.length 
                    ? "100% Auditado" 
                    : "Em Conferência"}
                </span>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-[2rem] bg-lime-500 text-slate-950">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Recomendação Técnica</p>
              <p className="text-[11px] font-bold leading-relaxed">
                Compare as furações do DXF com o manual de montagem PDF antes de confirmar cada módulo.
              </p>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-100 p-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
              <History className="h-4 w-4" /> Últimas Atividades
            </h3>
            <div className="space-y-4">
              {identifications?.slice(0, 3).map((ident: any) => (
                <div key={ident.id} className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-slate-900 truncate">Módulo Confirmado</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                      {new Date(ident.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
              {(!identifications || identifications.length === 0) && (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4 italic">
                  Nenhuma atividade registrada.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}