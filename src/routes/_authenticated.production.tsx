import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory, Tv } from "lucide-react";
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
    <div className="space-y-10 p-6 md:p-12 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Fila Industrial</p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase leading-none">Painel de Produção</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Controle de fábrica, corte, usinagem e borda.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-blue-900 text-white border-none font-black uppercase tracking-[0.2em] text-[10px] px-6 py-3 rounded-full shadow-lg shadow-blue-900/20 flex items-center gap-2">
            <Tv className="h-4 w-4" /> TV Mode Ready
          </Badge>
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
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((project) => {
            const step = flow[project.status ?? "novo"];
            return (
              <Card key={project.id} className="border-none shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] transition-all duration-500 rounded-[3rem] overflow-hidden group bg-white">
                <CardHeader className="pb-4 pt-10 px-10 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter leading-none uppercase group-hover:text-blue-600 transition-colors">{project.name}</CardTitle>
                    <Badge className={cn("px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] border-none rounded-full shadow-sm", statusTone(project.status))}>
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 px-10 pb-10 pt-8">
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente / Ambiente</p>
                    <p className="text-sm font-black uppercase tracking-tight text-slate-900">
                      {project.client_name || "Sem cliente"} · {project.environment || "Ambiente geral"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 pt-6 border-t border-slate-50">
                    {step && hasPermission(role, "production", "edit") && (
                      <Button
                        size="lg"
                        className="h-16 w-full rounded-[1.25rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[11px] border-none shadow-xl shadow-blue-600/20 transition-all duration-300 active:scale-[0.98]"
                        disabled={advance.isPending}
                        onClick={() => advance.mutate({ id: project.id, status: step.next })}
                      >
                        {step.action}
                      </Button>
                    )}
                    <Button asChild size="lg" variant="outline" className="h-16 w-full rounded-[1.25rem] border-2 border-slate-100 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-slate-50 transition-all duration-300">
                      <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                        Ver listas técnicas
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
