import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  Box, 
  LayoutGrid, 
  CheckCircle2, 
  Clock, 
  Eye, 
  ChevronRight,
  ClipboardList,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PartMetadata } from "@/lib/promob-import";


interface AssemblyBookTabProps {
  projectId: string;
  onView3D?: (moduleId: string) => void;
}

export function AssemblyBookTab({ projectId, onView3D }: AssemblyBookTabProps) {
  const queryClient = useQueryClient();

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ["modules_assembly", projectId],
    queryFn: async () => {
      console.log(`[AssemblyBook] Buscando módulos para ${projectId}`);
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: parts, isLoading: loadingParts } = useQuery({
    queryKey: ["parts_assembly", projectId],
    queryFn: async () => {
      console.log(`[AssemblyBook] Buscando peças para ${projectId}`);
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"); // Removido filtro de kind para auditoria completa
      if (error) throw error;
      return data;
    },
  });

  const toggleModuleCompletion = useMutation({
    mutationFn: async ({ moduleId, completed }: { moduleId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("modules")
        .update({ is_completed: completed })
        .eq("id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["modules_assembly", projectId] });
      toast.success("Status de montagem atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (loadingModules || loadingParts) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando Caderno...</div>;
  }

  const modulesWithParts = (modules || []).map(m => ({
    ...m,
    parts: (parts || []).filter(p => p.module_id === m.id)
  }));

  const looseParts = (parts || []).filter(p => !p.module_id && p.kind === 'peca');

  const totalModules = modulesWithParts.length;
  const completedModules = modulesWithParts.filter(m => m.is_completed).length;
  const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-blue-600" /> Caderno de Montagem Industrial
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
            Instruções técnicas para bancada de montagem • Fidelidade 6.0
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6 min-w-[240px]">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Progresso Geral</span>
              <span className="text-xs font-black text-blue-600">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-black text-slate-900 leading-none">{completedModules}/{totalModules}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Módulos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {modulesWithParts.map((mod, idx) => (
          <Card 
            key={mod.id} 
            className={cn(
              "rounded-[2.5rem] border-none shadow-sm transition-all overflow-hidden",
              mod.is_completed ? "bg-green-50/50" : "bg-white hover:shadow-md"
            )}
          >
            <CardHeader className="p-6 md:p-8 border-b border-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                    mod.is_completed ? "bg-green-500 text-white" : "bg-blue-50 text-blue-600"
                  )}>
                    {mod.is_completed ? <CheckCircle2 className="h-6 w-6" /> : <Box className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">G{idx + 1}</span>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                        {mod.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {mod.parts.length} Peças</span>
                      <span className="flex items-center gap-1"><LayoutGrid className="h-3 w-3" /> {mod.width_mm}x{mod.height_mm}x{mod.depth_mm}mm</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onView3D && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl border-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest h-10 px-4 hover:bg-slate-50"
                      onClick={() => onView3D(mod.id)}
                    >
                      <Eye className="mr-2 h-4 w-4 text-blue-600" /> Ver no 3D
                    </Button>
                  )}
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Concluído</span>
                    <Checkbox 
                      checked={!!mod.is_completed}
                      onCheckedChange={(checked) => toggleModuleCompletion.mutate({ moduleId: mod.id, completed: !!checked })}
                      className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                  </div>

                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Peça</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Dimensões (LxC)</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Espessura</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Material</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Fita de Borda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {mod.parts.map((part) => {
                      const metadata = (part.metadata as any) as PartMetadata | undefined;
                      return (
                        <tr key={part.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-4">
                            <p className="text-xs font-black text-slate-900 uppercase group-hover:text-blue-600 transition-colors">{part.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{metadata?.piece_code || 'ID: ' + part.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-8 py-4 text-xs font-bold text-slate-600">
                            {part.width_mm} x {part.length_mm} <span className="text-[9px] text-slate-400 ml-1">mm</span>
                          </td>
                          <td className="px-8 py-4">
                            <Badge variant="outline" className="rounded-md font-black text-[9px] border-slate-200">
                              {part.thickness_mm}mm
                            </Badge>
                          </td>
                          <td className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">
                            {part.material || '-'}
                          </td>
                          <td className="px-8 py-4">
                            {part.edge_banding ? (
                              <div className="flex gap-1">
                                {(metadata?.edge_top ?? 0) > 0 && <Badge className="bg-blue-100 text-blue-600 border-none text-[8px] font-black font-mono">F1</Badge>}
                                {(metadata?.edge_bottom ?? 0) > 0 && <Badge className="bg-blue-100 text-blue-600 border-none text-[8px] font-black font-mono">F2</Badge>}
                                {(metadata?.edge_left ?? 0) > 0 && <Badge className="bg-blue-100 text-blue-600 border-none text-[8px] font-black font-mono">F3</Badge>}
                                {(metadata?.edge_right ?? 0) > 0 && <Badge className="bg-blue-100 text-blue-600 border-none text-[8px] font-black font-mono">F4</Badge>}
                                {!(metadata?.edge_top) && !(metadata?.edge_bottom) && !(metadata?.edge_left) && !(metadata?.edge_right) && (
                                  <span className="text-[9px] font-bold text-slate-400">Sim</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-300">Sem Fita</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}

        {looseParts.length > 0 && (
          <Card className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/30 overflow-hidden">
            <CardHeader className="p-6 md:p-8 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Itens Avulsos / Sem Módulo</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {looseParts.length} Peças identificadas fora da estrutura de módulos Promob
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Peça</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Dimensões</th>
                      <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Material</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {looseParts.map(part => (
                      <tr key={part.id} className="hover:bg-white transition-colors">
                        <td className="px-8 py-4 text-xs font-black uppercase text-slate-700">{part.name}</td>
                        <td className="px-8 py-4 text-xs font-bold text-slate-500">{part.width_mm}x{part.length_mm}mm</td>
                        <td className="px-8 py-4 text-xs font-bold text-slate-500 uppercase">{part.material || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
