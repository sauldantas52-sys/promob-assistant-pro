import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  PackageCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Wrench,
  Boxes,
  ClipboardList,
  LayoutDashboard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/picking")({
  head: () => ({
    meta: [
      { title: "Separação e Conferência | Monta AI" },
    ],
  }),
  component: PickingPage,
});

function PickingPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const projects = useQuery({
    queryKey: ["picking-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, client_name, environment, status,
          parts(id, name, kind, quantity, unit, is_completed, storage_location, assembly_group_id)
        `)
        .in("status", ["usinagem", "separacao"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updatePart = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string, is_completed: boolean }) => {
      const { error } = await supabase
        .from("parts")
        .update({ is_completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["picking-projects"] });
    },
  });

  const list = projects.data ?? [];

  return (
    <AppShell>
      <div className="space-y-16 p-8 md:p-16 max-w-[1800px] mx-auto animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate({ to: "/dashboard" })} 
              className="rounded-full px-4 text-slate-400 hover:text-blue-600 gap-2 mb-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
            </Button>
            <div className="flex items-center gap-4">
              <span className="h-2 w-10 bg-indigo-600 rounded-full" />
              <p className="text-[12px] font-black uppercase tracking-[0.5em] text-indigo-600">Gestão de Itens e Volumes</p>
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-slate-900 uppercase leading-[0.8] mb-4">Separação</h1>
            <p className="text-base font-black text-slate-500 uppercase tracking-[0.4em]">Conferência física de ferragens e peças especiais.</p>
          </div>
        </header>

        <div className="grid gap-6">
          {list.map((project) => {
            const parts = project.parts || [];
            const pickingItems = parts.filter(p => 
              p.kind === 'ferragem' || p.kind === 'acessorio'
            );
            
            // Grupos G1, G2, G3, AV
            const g1 = pickingItems.filter(p => p.assembly_group_id === 'G1' || (typeof p.assembly_group_id === 'string' && p.assembly_group_id.includes('G1')));
            const g2 = pickingItems.filter(p => p.assembly_group_id === 'G2' || (typeof p.assembly_group_id === 'string' && p.assembly_group_id.includes('G2')));
            const g3 = pickingItems.filter(p => p.assembly_group_id === 'G3' || (typeof p.assembly_group_id === 'string' && p.assembly_group_id.includes('G3')));
            const av = pickingItems.filter(p => !g1.includes(p) && !g2.includes(p) && !g3.includes(p));

            const total = pickingItems.length;
            const done = pickingItems.filter(i => i.is_completed).length;
            const progress = total > 0 ? (done / total) * 100 : 0;

            return (
              <Card key={project.id} className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[4rem] overflow-hidden bg-white mb-12 transition-all duration-700 hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.15)]">
                <CardHeader className="pb-10 pt-16 px-16 bg-slate-50/30 border-b border-slate-100">
                  <div className="flex flex-wrap justify-between items-center gap-10">
                    <div className="space-y-4">
                      <CardTitle className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">{project.name}</CardTitle>
                      <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                        {project.client_name || "CLIENTE ANÔNIMO"} <span className="h-1.5 w-1.5 rounded-full bg-slate-200" /> {project.environment || "AMBIENTE GERAL"}
                      </p>
                    </div>
                    <Badge className={cn("px-10 py-4 text-[11px] font-black uppercase tracking-[0.3em] border-none rounded-full shadow-2xl transition-all duration-500", progress === 100 ? "bg-emerald-600 text-white" : "bg-blue-600 text-white")}>
                      {done} / {total} ITENS PROCESSADOS
                    </Badge>
                  </div>
                  <div className="mt-12 w-full bg-slate-100 h-6 rounded-full overflow-hidden shadow-inner border border-slate-200 p-1.5">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)] rounded-full" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { label: "G1 - Módulos Base", items: g1, color: "bg-teal-600" },
                      { label: "G2 - Complementares", items: g2, color: "bg-slate-600" },
                      { label: "G3 - Acabamentos", items: g3, color: "bg-indigo-600" },
                      { label: "AV - Avulsos / Ferragens", items: av, color: "bg-orange-600" }
                    ].map(group => group.items.length > 0 && (
                      <div key={group.label} className="bg-white">
                        <div className="px-16 py-6 bg-slate-50 flex items-center gap-4 border-y border-slate-100">
                          <div className={cn("h-4 w-4 rounded-full", group.color)} />
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">{group.label}</p>
                        </div>
                        {group.items.map(item => (
                          <div key={item.id} className="px-16 py-10 flex items-center justify-between gap-8 transition-all hover:bg-slate-50 border-b border-slate-50 last:border-b-0">
                            <div className="flex items-center gap-8">
                              <Button 
                                variant={item.is_completed ? "default" : "outline"}
                                size="icon"
                                className={cn(
                                  "h-16 w-16 shrink-0 rounded-[1.5rem] transition-all duration-300 border-2",
                                  item.is_completed ? "bg-emerald-600 border-emerald-600 shadow-xl shadow-emerald-600/20" : "bg-white border-slate-200 shadow-sm"
                                )}
                                onClick={() => updatePart.mutate({ id: item.id, is_completed: !item.is_completed })}
                              >
                                {item.is_completed ? <CheckCircle2 className="h-8 w-8 text-white" /> : <div className="h-8 w-8 rounded-full border-4 border-slate-100" />}
                              </Button>
                              <div>
                                <p className={cn(
                                  "text-xl font-black tracking-tighter uppercase leading-none mb-2 transition-all",
                                  item.is_completed ? "text-slate-400 line-through" : "text-slate-900"
                                )}>
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-6">
                                  <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Quantidade: {item.quantity} {item.unit}</p>
                                  {item.storage_location && (
                                    <Badge variant="outline" className="text-[10px] font-black text-blue-600 border-blue-200 uppercase tracking-widest bg-blue-50">
                                      {item.storage_location}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-orange-500 hover:bg-orange-50 rounded-full" title="Marcar falta">
                                <AlertTriangle className="h-5 w-5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-red-50 rounded-full" title="Danificado">
                                <XCircle className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {total === 0 && (
                      <div className="p-32 text-center text-sm text-muted-foreground flex flex-col items-center gap-6">
                        <Boxes className="h-16 w-16 opacity-20" />
                        <p className="font-black uppercase tracking-[0.4em]">Nenhum item para separação</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="p-16 bg-slate-50/30 flex flex-wrap justify-between items-center gap-10">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-8 bg-blue-600 rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Protocolo de Picking Finalizado</p>
                  </div>
                  <div className="flex gap-6">
                    <Button 
                      asChild 
                      className="h-20 px-12 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-slate-900/40 gap-6 transition-all duration-500 active:scale-95 group"
                    >
                      <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                        <ClipboardList className="h-7 w-7 text-blue-400" />
                        Acessar Dossiê Completo
                      </Link>
                    </Button>
                    {progress === 100 && (
                      <Button className="h-20 px-12 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-emerald-600/40 gap-6 transition-all duration-500 active:scale-95 group">
                        <CheckCircle2 className="h-7 w-7 text-white" /> Liberar para Montagem
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {list.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Boxes className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>Nenhum projeto em fase de separação no momento.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
