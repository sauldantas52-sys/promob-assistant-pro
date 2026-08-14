import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Wrench, 
  Boxes, 
  Ruler, 
  CheckCircle2, 
  Factory, 
  Scan, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  ChevronRight,
  Info,
  CheckCircle,
  PackageCheck,
  History,
  ClipboardList,
  Camera,
  Image as ImageIcon,
  LayoutDashboard
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, statusTone } from "@/lib/project-status";
import { toast } from "sonner";
import { useState } from "react";
import { AssemblyLabel } from "@/components/AssemblyLabel";
import { ConferenceDialog } from "@/components/ConferenceDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assembly")({
  head: () => ({
    meta: [
      { title: "Montagem | Monta AI — Promob Assistant Pro" },
      {
        name: "description",
        content:
          "Tela do montador: módulos do ambiente, medidas, ferragens e conferência rápida direto no celular.",
      },
      { property: "og:title", content: "Montagem | Monta AI" },
      { property: "og:description", content: "Roteiro de montagem por ambiente e módulo." },
    ],
  }),
  component: () => (
    <AppShell>
      <AssemblyContent />
    </AppShell>
  ),
});

function AssemblyContent() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const projects = useQuery({
    queryKey: ["assembly-projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, client_name, environment, status, 
          modules(id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed, data_source),
          parts(id, name, kind, quantity, unit, is_completed, material, thickness_mm, width_mm, length_mm, edge_banding, storage_location, assembly_group_id, visibility_type, data_source),
          assembly_groups(id, module_id, code, name, color, is_locked, lock_reason, conference_status, sealed_at)
        `)
        .in("status", ["separacao", "montagem", "assistencia"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = projects.data ?? [];

  return (
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
            <span className="h-2 w-10 bg-emerald-600 rounded-full" />
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-emerald-600">Protocolo de Instalação</p>
          </div>
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-slate-900 uppercase leading-[0.8] mb-4">Montagem</h1>
          <p className="text-base font-black text-slate-500 uppercase tracking-[0.4em]">Guia técnico mobile para montadores especializados.</p>
        </div>
      </header>

      {list.length === 0 ? (
        <Card className="border-[4px] border-dashed border-slate-200 rounded-[4rem] bg-slate-50/50">
          <CardContent className="flex flex-col items-center gap-6 py-32 text-center">
            <Wrench className="h-24 w-24 text-slate-200" />
            <p className="text-2xl font-black uppercase tracking-[0.4em] text-slate-400">Sem Montagens Agendadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((project) => (
            <Card key={project.id} className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[4rem] overflow-hidden bg-white mb-12 transition-all duration-700 hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.15)]">
              <CardHeader className="pb-10 pt-16 px-16 bg-slate-50/30 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-10">
                  <div className="space-y-4">
                    <CardTitle className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">{project.name}</CardTitle>
                    <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                      {project.client_name || "CLIENTE ANÔNIMO"} <span className="h-1.5 w-1.5 rounded-full bg-slate-200" /> {project.environment || "AMBIENTE GERAL"}
                    </p>
                  </div>
                  <Badge className={cn("px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.3em] border-none rounded-[1.5rem] shadow-2xl", statusTone(project.status))}>
                    {statusLabel(project.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-12 p-16">
                <Tabs defaultValue="modules" className="space-y-12">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-2 h-20 rounded-[2.5rem] border border-slate-200">
                    <TabsTrigger value="modules" className="rounded-[2rem] data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-2xl font-black text-[11px] uppercase tracking-[0.3em]">Módulos</TabsTrigger>
                    <TabsTrigger value="groups" className="rounded-[2rem] data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-2xl font-black text-[11px] uppercase tracking-[0.3em]">Grupos G1/G2</TabsTrigger>
                    <TabsTrigger value="hardware" className="rounded-[2rem] data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-2xl font-black text-[11px] uppercase tracking-[0.3em]">Instruções</TabsTrigger>
                    <TabsTrigger value="evidence" className="rounded-[2rem] data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-2xl font-black text-[11px] uppercase tracking-[0.3em]">Evidências</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="modules" className="space-y-8 mt-10">
                    <div className="grid gap-4">
                      {(project.modules ?? []).map((m) => (
                        <div key={m.id} className={cn(
                          "rounded-[2.5rem] border-2 p-10 transition-all duration-500 flex flex-wrap items-center justify-between gap-10",
                          m.is_completed ? "bg-emerald-50/30 border-emerald-100 shadow-xl shadow-emerald-600/5" : "bg-white border-slate-50 shadow-sm"
                        )}>
                          <div className="flex items-center gap-10">
                            <Button 
                              variant={m.is_completed ? "default" : "outline"}
                              size="icon"
                              className={cn(
                                "h-16 w-16 shrink-0 rounded-[1.5rem] transition-all duration-300 border-2",
                                m.is_completed ? "bg-emerald-600 border-emerald-600 shadow-xl shadow-emerald-600/20" : "bg-white border-slate-200 shadow-sm"
                              )}
                              onClick={async () => {
                                const { error } = await supabase
                                  .from("modules")
                                  .update({ is_completed: !m.is_completed })
                                  .eq("id", m.id);
                                if (error) toast.error(error.message);
                                else void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
                              }}
                            >
                              {m.is_completed ? <CheckCircle2 className="h-8 w-8 text-white" /> : <div className="h-8 w-8 rounded-full border-4 border-slate-100" />}
                            </Button>
                            <div className="space-y-2">
                              <p className={cn(
                                "text-2xl font-black tracking-tighter uppercase leading-none transition-all",
                                m.is_completed ? "text-slate-400 line-through" : "text-slate-900"
                              )}>
                                {m.name}
                              </p>
                              <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-4">
                                <Ruler className="h-4 w-4" />
                                {m.width_mm ?? "?"} × {m.height_mm ?? "?"} × {m.depth_mm ?? "?"} mm
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="px-6 py-2 rounded-full border-2 border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-500">
                            {m.quantity} UNIDADES
                          </Badge>
                        </div>
                      ))}
                      {(project.modules?.length ?? 0) === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Nenhum módulo importado.
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="groups" className="space-y-4 mt-4">
                    <div className="grid gap-4">
                      {(project.modules ?? []).map((m) => {
                        const group = ((project as any).assembly_groups ?? []).find((g: any) => g.module_id === m.id);
                        const parts = (project.parts ?? []).filter(p => p.assembly_group_id === group?.id);
                        const completed = parts.filter(p => p.is_completed).length;
                        const total = parts.length;
                        const progress = total > 0 ? (completed / total) * 100 : 0;
                        
                          const [confDialogOpen, setConfDialogOpen] = useState(false);
                        
                        return (
                          <Card key={m.id} className={cn("overflow-hidden border-none shadow-[0_15px_40px_-15px_rgba(0,0,0,0.08)] rounded-[2.5rem] transition-all", group?.is_locked ? "bg-red-50/30" : "bg-emerald-50/30")}>
                            <div className="h-4 w-full" style={{ backgroundColor: group?.is_locked ? "#EF4444" : "#10B981" }} />
                            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                              <div>
                                <CardTitle className="text-xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                                  <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">{group?.code}</span>
                                  {m.name}
                                  {group?.is_locked ? <Lock className="h-5 w-5 text-red-600" /> : <Unlock className="h-5 w-5 text-emerald-600" />}
                                </CardTitle>
                              </div>
                              <Badge className={cn("px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] border-none rounded-full shadow-sm", group?.is_locked ? "bg-red-600 text-white" : "bg-emerald-600 text-white")}>
                                {group?.is_locked ? "Bloqueado" : "Liberado"}
                              </Badge>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Progresso ({completed}/{total})</span>
                                  <span>{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} className={cn(group?.is_locked ? "bg-red-100" : "bg-emerald-100")} indicatorClassName={cn(group?.is_locked ? "bg-red-600" : "bg-emerald-600")} />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 gap-2"
                                  onClick={() => setConfDialogOpen(true)}
                                >
                                  <Scan className="h-4 w-4" /> Conferir
                                </Button>

                                <ConferenceDialog
                                  open={confDialogOpen}
                                  onOpenChange={setConfDialogOpen}
                                  projectId={project.id}
                                  projectPartIds={project.parts?.map(p => p.id) || []}
                                  moduleName={m.name}
                                  group={group}
                                  parts={parts}
                                />
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="secondary" size="icon">
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Etiquetas do Grupo</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex flex-col items-center gap-4">
                                      {parts.map(p => (
                                        <AssemblyLabel 
                                          key={p.id}
                                          moduleCode={group?.code ?? "???"}
                                          moduleName={m.name}
                                            color={group?.color ?? "#000"}
                                            partName={p.name}
                                            dimensions={`${p.width_mm}x${p.length_mm}mm`}
                                            material={p.material ?? null}
                                            thickness={p.thickness_mm ?? null}
                                            edgeBanding={p.edge_banding ?? null}
                                            storageLocation={p.storage_location ?? null}
                                            qrValue={`montaai://${project.id}/${p.id}`}
                                            projectId={project.id}
                                          />
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="hardware" className="space-y-4 mt-4">
                    <Card className="bg-muted/10">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Caderno de Montagem Exaustivo</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 px-3 pb-4">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <Wrench className="h-3 w-3" /> Ferragens e Fixadores
                          </h4>
                          <div className="grid gap-2">
                            {(project.parts || []).filter(p => p.kind === 'ferragem').map((p: any) => (
                              <div key={p.id} className="text-xs flex justify-between bg-card p-2 rounded border">
                                <span>{p.name}</span>
                                <Badge variant="secondary" className="h-5">{p.quantity} {p.unit}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <Boxes className="h-3 w-3" /> Acessórios e Componentes
                          </h4>
                          <div className="grid gap-2">
                            {(project.parts || []).filter(p => p.kind === 'acessorio').map((p: any) => (
                              <div key={p.id} className="text-xs flex justify-between bg-card p-2 rounded border">
                                <span>{p.name}</span>
                                <Badge variant="outline" className="h-5">{p.quantity} {p.unit}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                          <h4 className="text-[10px] font-bold uppercase text-primary mb-2">Ferramental Necessário</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Para este projeto, certifique-se de ter: Furadeira/Parafusadeira, Brocas (5mm, 8mm, 35mm), Nível Laser, Trena, Martelo de Borracha, Chave Philips e Allen.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="evidence" className="space-y-6 mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button variant="outline" className="h-32 rounded-[2rem] border-dashed flex flex-col gap-3">
                        <Camera className="h-8 w-8 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Foto Antes</span>
                      </Button>
                      <Button variant="outline" className="h-32 rounded-[2rem] border-dashed flex flex-col gap-3">
                        <Camera className="h-8 w-8 text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Foto Depois</span>
                      </Button>
                      <div className="col-span-2 bg-slate-50 rounded-[2rem] p-6 border-2 border-slate-100 border-dashed flex flex-col justify-center items-center text-slate-400">
                        <ImageIcon className="h-10 w-10 opacity-20 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Galeria de Montagem Vazia</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Notas de Instalação / Ocorrências</Label>
                      <Textarea 
                        placeholder="Descreva aqui qualquer detalhe relevante ou ocorrência durante a montagem..." 
                        className="rounded-[1.5rem] border-slate-200 min-h-[120px]"
                      />
                      <Button className="w-full h-14 rounded-[1rem] bg-slate-900 text-white font-black uppercase tracking-widest text-xs">
                        Salvar Relatório de Campo
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
                <Button asChild className="h-20 w-full px-12 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-slate-900/40 gap-6 transition-all duration-500 active:scale-95 group mt-10">
                  <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                    <ClipboardList className="h-7 w-7 text-blue-400 transition-transform group-hover:scale-110" />
                    Abrir Dossiê Técnico
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
