import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench, Boxes, Ruler, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        .select("id, name, client_name, environment, status, modules(id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed)")
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
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(project.modules ?? []).map((m) => (
                    <div key={m.id} className="rounded-lg border border-border p-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Boxes className="h-4 w-4 text-primary" /> {m.name}
                        <span className="ml-auto text-xs text-muted-foreground">x{m.quantity}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Ruler className="h-3.5 w-3.5" />
                        {m.width_mm ?? "?"} × {m.height_mm ?? "?"} × {m.depth_mm ?? "?"} mm
                      </p>
                    </div>
                  ))}
                  {(project.modules?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum módulo importado para este projeto.
                    </p>
                  )}
                </div>
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
