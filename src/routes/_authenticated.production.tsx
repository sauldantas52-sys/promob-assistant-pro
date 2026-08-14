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
    <div className="space-y-16 p-8 md:p-16 max-w-[1800px] mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="h-2 w-10 bg-blue-600 rounded-full" />
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-600">Fila Industrial de Precisão</p>
          </div>
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-slate-900 uppercase leading-[0.8] mb-4">Pipeline</h1>
          <p className="text-base font-black text-slate-500 uppercase tracking-[0.4em]">Controle central de corte, borda e usinagem CNC.</p>
        </div>
        <div className="flex items-center gap-6">
          <Badge className="bg-slate-900 text-blue-400 border-none font-black uppercase tracking-[0.3em] text-[11px] px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4">
            <Tv className="h-6 w-6" /> Status da Linha: Ativo
          </Badge>
        </div>
      </header>

      {queue.length === 0 ? (
        <Card className="border-[4px] border-dashed border-slate-200 rounded-[4rem] bg-slate-50/50">
          <CardContent className="flex flex-col items-center gap-6 py-32 text-center">
            <Factory className="h-24 w-24 text-slate-200" />
            <p className="text-2xl font-black uppercase tracking-[0.4em] text-slate-400">Pátio de Produção Vazio</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((project) => {
            const step = flow[project.status ?? "novo"];
            return (
              <Card key={project.id} className="border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 rounded-[4rem] overflow-hidden group bg-white">
                <CardHeader className="pb-8 pt-12 px-12 bg-slate-50/30 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-6">
                    <CardTitle className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase group-hover:text-blue-600 transition-colors duration-500">{project.name}</CardTitle>
                    <Badge className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] border-none rounded-full shadow-lg", statusTone(project.status))}>
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
