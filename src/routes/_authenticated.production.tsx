import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Factory,
  Tv,
  ClipboardList,
  Scissors,
  Square,
  Drill,
  Boxes,
  PackageCheck,
  CheckCircle2,
  AlertOctagon,
  Lock,
  LayoutDashboard,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  component: ProductionPage,
});

function ProductionPage() {
  return (
    <AppShell>
      <ProductionContent />
    </AppShell>
  );
}

const flow: Record<string, { next: string; action: string; color: string; icon: LucideIcon }> = {
  novo: {
    next: "orcamento",
    action: "Enviar para orçamento",
    color: "bg-slate-200",
    icon: ClipboardList,
  },
  orcamento: { 
    next: "pronto_para_producao", 
    action: "Aprovar Orçamento", 
    color: "bg-blue-200", 
    icon: ClipboardList 
  },
  pronto_para_producao: {
    next: "corte",
    action: "Liberar para Corte",
    color: "bg-emerald-200",
    icon: Scissors,
  },
  corte: { 
    next: "borda", 
    action: "Enviar para Borda", 
    color: "bg-red-200", 
    icon: Square 
  },
  borda: { 
    next: "usinagem", 
    action: "Liberar Usinagem", 
    color: "bg-amber-200", 
    icon: Drill 
  },
  usinagem: {
    next: "separacao",
    action: "Enviar para Separação",
    color: "bg-purple-200",
    icon: Boxes,
  },
  separacao: {
    next: "conferencia",
    action: "Enviar para Conferência",
    color: "bg-blue-200",
    icon: PackageCheck,
  },
  conferencia: {
    next: "expedicao",
    action: "Liberar para Expedição",
    color: "bg-indigo-200",
    icon: CheckCircle2,
  },
  expedicao: {
    next: "montagem",
    action: "Enviar para Montagem",
    color: "bg-slate-900",
    icon: Truck,
  },
  montagem: {
    next: "concluido",
    action: "Concluir Entrega",
    color: "bg-emerald-200",
    icon: CheckCircle2,
  },
};

const gateRequirements: Record<string, string[]> = {
  corte: ["xml_valido", "lista_corte", "nesting_dxf", "materiais"],
  usinagem: ["documentacao_tecnica", "cotas_furacao", "bitolas", "tags_skp"],
  montagem: ["usinagem_liberada", "pecas_conferidas", "ferragens_conferidas", "grupos_completos"],
};

function ProductionContent() {
  const { companyId, role } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const projects = useQuery({
    queryKey: ["projects-production", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          id, name, client_name, status, environment, 
          machining_blocked,
          parts(id, is_completed, kind),
          validation_checks(id, check_type, is_completed)
        `,
        )
        .in("status", ["pronto_para_producao", "corte", "borda", "usinagem", "separacao", "conferencia", "expedicao", "montagem"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: current, error: currentError } = await supabase
        .from("projects")
        .select("status, machining_blocked, validation_checks(check_type, is_completed)")
        .eq("id", id)
        .single();
      if (currentError) throw currentError;
      if (flow[current.status ?? ""]?.next !== status)
        throw new Error("Transição de produção inválida. Atualize a fila e tente novamente.");

      if (
        current.machining_blocked &&
        ["usinagem", "separacao", "conferencia", "expedicao", "montagem", "concluido"].includes(
          status,
        )
      ) {
        throw new Error(
          "Bloqueio de engenharia ativo: usinagem e etapas seguintes permanecem suspensas.",
        );
      }

      const requiredChecks = gateRequirements[status] ?? [];
      const checks = current.validation_checks ?? [];
      const gatePassed = requiredChecks.every((checkType) =>
        checks.some((check) => check.check_type === checkType && check.is_completed),
      );
      if (!gatePassed) throw new Error("Checklist industrial incompleto para a próxima etapa.");

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

  const queue = (projects.data ?? []).map((p) => {
    const checks = p.validation_checks || [];

    // Gate logic
    const gate1Items = ["xml_valido", "lista_corte", "nesting_dxf", "materiais"];
    const gate1Ok = gate1Items.every(
      (id) => checks.find((check) => check.check_type === id)?.is_completed,
    );

    const gate2Items = ["documentacao_tecnica", "cotas_furacao", "bitolas", "tags_skp"];
    const gate2Ok = gate2Items.every(
      (id) => checks.find((check) => check.check_type === id)?.is_completed,
    );

    const gate3Items = [
      "usinagem_liberada",
      "pecas_conferidas",
      "ferragens_conferidas",
      "grupos_completos",
    ];
    const gate3Ok = gate3Items.every(
      (id) => checks.find((check) => check.check_type === id)?.is_completed,
    );

    const nextStatus = flow[p.status ?? ""]?.next;
    let blocked = false;

    if (nextStatus === "corte") blocked = !gate1Ok;
    if (nextStatus === "usinagem") blocked = !gate2Ok || p.machining_blocked === true;
    if (nextStatus === "montagem") blocked = !gate3Ok;
    if (
      p.machining_blocked &&
      ["usinagem", "separacao", "conferencia", "expedicao"].includes(p.status ?? "")
    )
      blocked = true;

    return { ...p, validation_blocked: blocked };
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-3 sm:p-5 lg:p-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/dashboard" })}
            className="h-8 rounded-md px-2 text-slate-400 hover:text-blue-600 gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </Button>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-8 bg-blue-600 rounded-full" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
              Fila Industrial de Precisão
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
            Pipeline
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.16em]">
            Controle central de corte, borda e usinagem CNC.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-slate-900 text-blue-400 border-none font-black uppercase tracking-[0.2em] text-[9px] px-4 py-2.5 rounded-lg flex items-center gap-2">
            <Tv className="h-4 w-4" /> Linha ativa
          </Badge>
        </div>
      </header>

      <section
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
        aria-label="Estações operacionais"
      >
        {Object.entries(flow)
          .filter(([status]) =>
            ["pronto_para_producao", "corte", "borda", "usinagem", "separacao", "conferencia", "expedicao", "montagem"].includes(
              status,
            ),
          )
          .map(([status, station]) => {
            const Icon = station.icon;
            const count = queue.filter((project) => project.status === status).length;
            return (
              <div
                key={status}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500">
                    {statusLabel(status)}
                  </span>
                </div>
                <span className="ml-2 font-mono text-xl font-black text-slate-900">{count}</span>
              </div>
            );
          })}
      </section>

      {queue.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Factory className="h-12 w-12 text-slate-200" />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              Pátio de Produção Vazio
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((project) => {
            const step = flow[project.status ?? "corte"];
            return (
              <Card
                key={project.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <CardHeader className="p-4 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="min-w-0 break-words text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
                      {project.name}
                    </CardTitle>
                    <Badge
                      className={cn(
                        "shrink-0 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider border-none rounded-md",
                        statusTone(project.status),
                      )}
                    >
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Cliente / Ambiente
                    </p>
                    <p className="text-sm font-black uppercase tracking-tight text-slate-900">
                      {project.client_name || "Sem cliente"} ·{" "}
                      {project.environment || "Ambiente geral"}
                    </p>
                  </div>

                  {/* Pipeline Visual */}
                  <div
                    className="grid grid-cols-5 gap-1 sm:grid-cols-9"
                    aria-label="Fluxo de produção"
                  >
                    {Object.entries(flow).filter(([key]) => key !== 'novo' && key !== 'orcamento' && key !== 'concluido').map(([key, value]) => {
                      const isActive = project.status === key;
                      const Icon = value.icon;
                      return (
                        <div
                          key={key}
                          className="flex min-w-0 flex-col items-center gap-1"
                          title={statusLabel(key)}
                        >
                          <div
                            className={cn(
                              "h-8 w-full rounded-md flex items-center justify-center transition-colors",
                              isActive
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-50 text-slate-300",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div
                            className={cn(
                              "h-1 w-full rounded-full",
                              isActive ? "bg-blue-600" : "bg-slate-100",
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {project.machining_blocked && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                      <AlertOctagon className="h-5 w-5 shrink-0 text-red-600" />
                      <div>
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                          Bloqueio de Engenharia
                        </p>
                        <p className="text-xs font-bold text-red-900 uppercase">
                          Usinagem suspensa para este projeto.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2 pt-3 border-t border-slate-100 sm:grid-cols-2">
                    {step && hasPermission(role, "production", "edit") && (
                      <Button
                        size="lg"
                        className={cn(
                          "h-11 w-full rounded-lg text-white font-black uppercase tracking-wider text-[9px] border-none transition-colors",
                          project.validation_blocked
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20",
                        )}
                        disabled={advance.isPending || project.validation_blocked}
                        onClick={() => advance.mutate({ id: project.id, status: step.next })}
                      >
                        {project.validation_blocked ? (
                          <span className="flex items-center gap-2">
                            <Lock className="h-4 w-4" /> Bloqueado (Checklist)
                          </span>
                        ) : (
                          step.action
                        )}
                      </Button>
                    )}
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-11 w-full rounded-lg border-slate-200 font-black uppercase tracking-wider text-[9px] hover:bg-slate-50"
                    >
                      <Link to="/projects/$projectId" params={{ projectId: project.id }} search={{ tab: 'modules' }}>
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
