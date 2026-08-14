import { createFileRoute, Link } from "@tanstack/react-router";
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
  ClipboardList
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

  const projects = useQuery({
    queryKey: ["assembly-projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, name, client_name, environment, status, 
          modules(id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed, data_source),
          parts(id, name, kind, quantity, unit, is_completed, material, thickness_mm, width_mm, length_mm, assembly_group_id, visibility_type, data_source),
          assembly_groups(id, module_id, code, name, color, is_locked, lock_reason, conference_status, sealed_at)
        `)
        .in("status", ["montagem", "conferencia", "assistencia"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = projects.data ?? [];

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Montagem</h1>
        <p className="text-base text-slate-500 font-medium">
          Roteiro técnico e conferência de módulos para montadores.
        </p>
      </header>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nada liberado para montagem</p>
            <p className="text-sm text-muted-foreground">
              Assim que a fábrica liberar um projeto, ele aparece aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((project) => (
            <Card key={project.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 pt-6 px-6 bg-slate-100/50 border-b border-slate-200/50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">{project.name}</CardTitle>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">
                      {project.client_name || "Sem cliente"} · {project.environment || "Ambiente geral"}
                    </p>
                  </div>
                  <Badge className={cn("px-4 py-1.5 text-xs font-black uppercase tracking-widest border", statusTone(project.status))}>
                    {statusLabel(project.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <Tabs defaultValue="modules">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 h-12 rounded-xl">
                    <TabsTrigger value="modules" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">Módulos</TabsTrigger>
                    <TabsTrigger value="groups" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">Grupos G1/G2</TabsTrigger>
                    <TabsTrigger value="hardware" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">Caderno</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="modules" className="space-y-3 mt-4">
                    <div className="grid gap-2">
                      {(project.modules ?? []).map((m) => (
                        <div key={m.id} className={`rounded-lg border p-3 transition-colors ${m.is_completed ? "bg-primary/5 border-primary/20" : "border-border"}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={m.is_completed ?? false}
                              className="mt-0.5"
                              onCheckedChange={async (checked) => {
                                const { error } = await supabase
                                  .from("modules")
                                  .update({ is_completed: !!checked })
                                  .eq("id", m.id);
                                if (error) toast.error(error.message);
                                else void queryClient.invalidateQueries({ queryKey: ["assembly-projects"] });
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium flex items-center gap-2 ${m.is_completed ? "text-muted-foreground line-through" : ""}`}>
                                {m.name}
                                {m.is_completed && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                                <span className="ml-auto text-xs text-muted-foreground">x{m.quantity}</span>
                              </p>
                              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <Ruler className="h-3.5 w-3.5" />
                                {m.width_mm ?? "?"} × {m.height_mm ?? "?"} × {m.depth_mm ?? "?"} mm
                              </p>
                            </div>
                          </div>
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
                          <Card key={m.id} className={cn("overflow-hidden border-2 shadow-sm rounded-2xl transition-all", group?.is_locked ? "border-amber-100 bg-amber-50/20" : "border-green-100 bg-green-50/20")}>
                            <div className="h-3 w-full" style={{ backgroundColor: group?.color || "#cbd5e1" }} />
                            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                              <div>
                                <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-xs font-black uppercase">{group?.code}</span>
                                  {m.name}
                                  {group?.is_locked ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-green-600" />}
                                </CardTitle>
                              </div>
                              <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-widest", group?.is_locked ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-green-600 text-white")}>
                                {group?.is_locked ? "Bloqueado" : "Liberado"}
                              </Badge>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Progresso ({completed}/{total})</span>
                                  <span>{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} />
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
                </Tabs>
                <Button asChild className="h-12 w-full sm:w-auto">
                  <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                    Abrir listas técnicas
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
