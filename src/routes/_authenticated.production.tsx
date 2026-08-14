import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, statusTone } from "@/lib/project-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({
    meta: [
      { title: "Produção | Monta AI — Promob Assistant Pro" },
      {
        name: "description",
        content:
          "Fila de produção da fábrica: libere projetos para corte, acompanhe conferência e envie para montagem.",
      },
      { property: "og:title", content: "Produção | Monta AI" },
      { property: "og:description", content: "Fluxo de produção e conferência de projetos." },
    ],
  }),
  component: () => (
    <AppShell>
      <ProductionContent />
    </AppShell>
  ),
});

const flow: Record<string, { next: string; action: string }> = {
  novo: { next: "orcamento", action: "Enviar para orçamento" },
  orcamento: { next: "producao", action: "Liberar para produção" },
  producao: { next: "conferencia", action: "Enviar para conferência" },
  conferencia: { next: "montagem", action: "Liberar para montagem" },
  montagem: { next: "concluido", action: "Concluir projeto" },
};

function ProductionContent() {
  const { companyId, role } = useAuth();
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: ["projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, status, environment")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa atualizada.");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const queue = (projects.data ?? []).filter((p) => p.status !== "concluido");

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Painel de Produção</h1>
          <p className="text-base text-slate-500 font-medium">Controle de fábrica, corte, usinagem e borda.</p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase tracking-wider text-[10px] px-3">TV Mode Ready</Badge>
        </div>
      </header>

      {queue.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Factory className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum projeto na fila</p>
            <p className="text-sm text-muted-foreground">Projetos criados aparecem aqui automaticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((project) => {
            const step = flow[project.status ?? "novo"];
            return (
              <Card key={project.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 pt-6 px-6">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-black text-slate-900 tracking-tight leading-tight">{project.name}</CardTitle>
                    <Badge className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider border", statusTone(project.status))}>
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-6">
                  <p className="text-sm font-medium text-slate-500">
                    {project.client_name || "Sem cliente"} · {project.environment || "Ambiente geral"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {step && hasPermission(role, "production", "edit") && (
                      <Button
                        size="sm"
                        className="h-10"
                        disabled={advance.isPending}
                        onClick={() => advance.mutate({ id: project.id, status: step.next })}
                      >
                        {step.action}
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline" className="h-10">
                      <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                        Ver listas
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
