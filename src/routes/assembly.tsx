import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench, Boxes, Ruler, CheckCircle2, Factory } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, statusTone } from "@/lib/project-status";
import { toast } from "sonner";

export const Route = createFileRoute("/assembly")({
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
          modules(id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed),
          parts(id, name, kind, quantity, unit, is_completed, material, thickness_mm, width_mm, length_mm, assembly_group_id)
        `)
        .in("status", ["montagem", "conferencia", "assistencia"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = projects.data ?? [];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">Montagem</h1>
        <p className="text-sm text-muted-foreground">
          Projetos liberados para montagem, com módulos e medidas em mãos.
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
            <Card key={project.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {project.client_name || "Sem cliente"} · {project.environment || "—"}
                    </p>
                  </div>
                  <Badge className={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="modules">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="modules">Módulos</TabsTrigger>
                    <TabsTrigger value="groups">Grupos de Montagem</TabsTrigger>
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
                    <div className="bg-muted/30 p-3 rounded-lg border border-dashed text-center">
                      <p className="text-xs text-muted-foreground">
                        Peças agrupadas por ordem lógica de montagem (G1, G2...).
                      </p>
                    </div>
                    {/* Placeholder para Grupos - Será expandido com a lógica de G1/G2 */}
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg bg-card">
                        <div className="flex justify-between items-center mb-2">
                          <Badge variant="secondary">G1 - Estruturas</Badge>
                          <span className="text-[10px] text-muted-foreground">3 peças</span>
                        </div>
                        <div className="space-y-1">
                          {project.parts?.filter(p => p.kind === 'peca').slice(0, 3).map(p => (
                            <div key={p.id} className="text-xs flex justify-between">
                              <span>{p.name}</span>
                              <span className="text-muted-foreground">{p.width_mm}x{p.length_mm}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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
