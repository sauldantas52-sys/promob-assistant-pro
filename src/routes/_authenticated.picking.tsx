import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Boxes, ClipboardList, LayoutDashboard, Lock, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { ProjectFieldSchedule } from "@/components/assembly/ProjectFieldSchedule";
import type { ProjectSite, ProjectAppointment } from "@/components/assembly/project-field-schedule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/picking")({
  head: () => ({
    meta: [{ title: "Separação e Conferência | Monta AI" }],
  }),
  component: PickingPage,
});

function PickingPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canEdit = hasPermission(role, "picking", "edit");

  const projects = useQuery({
    queryKey: ["picking-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          id, name, client_name, environment, status,
          parts(id, name, kind, quantity, unit, is_completed, storage_location, material, module_id, assembly_group_id, assembly_groups(id, code, color, module_id, modules(id, name)))
        `,
        )
        .in("status", ["usinagem", "separacao", "conferencia"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (data.length === 0) return [];

      const projectIds = data.map((project) => project.id);
      const [sitesResult, appointmentsResult] = await Promise.all([
        supabase
          .from("project_sites" as any)
          .select(
            "project_id, street, number, complement, district, city, state, postal_code, reference, contact_name, contact_phone",
          )
          .in("project_id", projectIds),
        supabase
          .from("project_appointments" as any)
          .select("project_id, kind, scheduled_at, arrival_time, status")
          .in("project_id", projectIds)
          .in("kind", ["montagem", "entrega"])
          .neq("status", "cancelado")
          .neq("status", "concluido")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true }),
      ]);
      if (sitesResult.error) throw sitesResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      return data.map((project) => ({
        ...project,
        project_site: ((sitesResult.data as any[]).find((site) => site.project_id === project.id) ?? null) as ProjectSite | null,
        next_appointment:
          (((appointmentsResult.data as any[]).find((a) => a.project_id === project.id) ??
            null) as ProjectAppointment | null),
      }));
    },
  });

  const updatePart = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      if (!canEdit) throw new Error("Seu perfil possui acesso somente para leitura.");
      const { error } = await supabase.from("parts").update({ is_completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["picking-projects"] });
    },
  });

  const list = projects.data ?? [];

  return (
    <AppShell>
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
              <span className="h-1.5 w-8 bg-indigo-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">
                Gestão de Itens e Volumes
              </p>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
              Separação
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.16em]">
              Conferência física de todas as peças e ferragens antes da selagem.
            </p>
          </div>
        </header>

        <div className="grid gap-6">
          {list.map((project) => {
            const parts = project.parts || [];
            const hardwareItems = parts.filter(
              (p) => p.kind === "ferragem" || p.kind === "acessorio",
            );
            const pieceItems = parts.filter((p) => p.kind !== "ferragem" && p.kind !== "acessorio");

            // is_completed remains the production state for pieces. Only hardware is toggled here.
            const logisticsGroups = Array.from(
              hardwareItems.reduce((grouped, item) => {
                const group = item.assembly_groups;
                const key = group
                  ? `${group.code}|${group.color ?? ""}|${group.module_id ?? ""}|${group.id}`
                  : "ungrouped";
                const current = grouped.get(key);
                if (current) current.items.push(item);
                else grouped.set(key, { group, items: [item] });
                return grouped;
              }, new Map<string, { group: (typeof hardwareItems)[number]["assembly_groups"]; items: typeof hardwareItems }>()),
            )
              .map(([, value]) => value)
              .sort((left, right) =>
                compareGroupCodes(left.group?.code ?? null, right.group?.code ?? null),
              );

            const total = parts.length;
            const done = parts.filter((i) => i.is_completed).length;
            const progress = total > 0 ? (done / total) * 100 : 0;
            const piecesDone = pieceItems.filter((i) => i.is_completed).length;
            const hardwareDone = hardwareItems.filter((i) => i.is_completed).length;
            const piecesReady = pieceItems.length > 0 && piecesDone === pieceItems.length;
            const hardwareReady =
              hardwareItems.length === 0 || hardwareDone === hardwareItems.length;
            const canSeal = piecesReady && hardwareReady;

            return (
              <Card
                key={project.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <CardHeader className="space-y-4 border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-2">
                      <CardTitle className="break-words text-xl font-black text-slate-900 tracking-tight uppercase leading-tight sm:text-2xl">
                        {project.name}
                      </CardTitle>
                      <p className="flex flex-wrap items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.18em]">
                        {project.client_name || "CLIENTE ANÔNIMO"}{" "}
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />{" "}
                        {project.environment || "AMBIENTE GERAL"}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "w-fit shrink-0 rounded-md border-none px-3 py-2 text-[9px] font-black uppercase tracking-wider",
                        canSeal ? "bg-emerald-600 text-white" : "bg-blue-600 text-white",
                      )}
                    >
                      {done} / {total} conferidos
                    </Badge>
                  </div>
                  <ProjectFieldSchedule
                    site={project.project_site}
                    appointment={project.next_appointment}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2",
                        piecesDone === pieceItems.length
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50",
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                        Peças
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900">
                        {piecesDone}/{pieceItems.length}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2",
                        hardwareDone === hardwareItems.length
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50",
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                        Ferragens e acessórios
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900">
                        {hardwareDone}/{hardwareItems.length}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-0.5">
                    <div
                      className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)] rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {pieceItems.length > 0 && (
                      <div className="bg-white">
                        <div className="flex items-center gap-3 border-y border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                          <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Peças produzidas / leitura somente
                          </p>
                        </div>
                        {pieceItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:px-5"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm font-black uppercase tracking-tight text-slate-900">
                                {item.name}
                              </p>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                Qtd: {item.quantity} {item.unit}
                              </p>
                              <PartIdentity
                                code={item.assembly_groups?.code}
                                color={item.assembly_groups?.color}
                                material={item.material}
                              />
                            </div>
                            <Badge
                              className={cn(
                                "shrink-0 rounded-sm border-none text-[8px] font-black uppercase",
                                item.is_completed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700",
                              )}
                            >
                              {item.is_completed ? "Produzida" : "Pendente"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {logisticsGroups.map(
                      (group) =>
                        group.items.length > 0 && (
                          <div
                            key={
                              group.group
                                ? `${group.group.code}-${group.group.color}-${group.group.module_id}-${group.group.id}`
                                : "ungrouped"
                            }
                            className="bg-white"
                          >
                            <div className="flex items-center gap-3 border-y border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                              <div
                                className="h-3 w-3 rounded-full border border-slate-300"
                                style={{ backgroundColor: group.group?.color || "transparent" }}
                              />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
                                  {group.group?.code || "Sem grupo logístico"}
                                </p>
                                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                  Módulo: {group.group?.modules?.name || "não vinculado"} · Cor
                                  logística: {group.group?.color || "não informada"}
                                </p>
                              </div>
                            </div>
                            {group.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50 sm:px-5"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <Button
                                    variant={item.is_completed ? "default" : "outline"}
                                    size="icon"
                                    className={cn(
                                      "h-10 w-10 shrink-0 rounded-lg transition-colors border-2",
                                      item.is_completed
                                        ? "bg-emerald-600 border-emerald-600"
                                        : "bg-white border-slate-200",
                                    )}
                                    onClick={() =>
                                      updatePart.mutate({
                                        id: item.id,
                                        is_completed: !item.is_completed,
                                      })
                                    }
                                    disabled={!canEdit || updatePart.isPending}
                                  >
                                    {item.is_completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-white" />
                                    ) : (
                                      <div className="h-5 w-5 rounded-full border-2 border-slate-200" />
                                    )}
                                  </Button>
                                  <div className="min-w-0">
                                    <p
                                      className={cn(
                                        "break-words text-sm font-black tracking-tight uppercase leading-tight transition-all",
                                        item.is_completed
                                          ? "text-slate-400 line-through"
                                          : "text-slate-900",
                                      )}
                                    >
                                      {item.name}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        Qtd: {item.quantity} {item.unit}
                                      </p>
                                      {item.storage_location && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] font-black text-blue-600 border-blue-200 uppercase tracking-widest bg-blue-50"
                                        >
                                          {item.storage_location}
                                        </Badge>
                                      )}
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                        Material/acabamento: {item.material || "não informado"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ),
                    )}
                    {total === 0 && (
                      <div className="flex flex-col items-center gap-4 p-12 text-center text-sm text-muted-foreground">
                        <Boxes className="h-16 w-16 opacity-20" />
                        <p className="font-black uppercase tracking-[0.4em]">
                          Nenhum item para separação
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="flex flex-col justify-between gap-3 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex items-center gap-3">
                    {canSeal ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <p
                      className={cn(
                        "text-[9px] font-black uppercase tracking-[0.16em]",
                        canSeal ? "text-emerald-700" : "text-amber-700",
                      )}
                    >
                      {canSeal
                        ? "Pré-requisitos produtivos completos: realizar conferência física"
                        : "Conferência física bloqueada: conclua peças e ferragens"}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:flex">
                    <Button
                      asChild
                      className="h-11 rounded-lg bg-slate-900 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-black gap-2"
                    >
                      <Link to="/projects/$projectId" params={{ projectId: project.id }}>
                        <ClipboardList className="h-4 w-4 text-blue-400" />
                        Acessar dossiê
                      </Link>
                    </Button>
                    {canSeal ? (
                      <Button
                        asChild
                        className="h-11 rounded-lg bg-emerald-600 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-emerald-700 gap-2"
                      >
                        <Link to="/assembly">
                          <Wrench className="h-4 w-4" /> Abrir conferência e selagem
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="h-11 rounded-lg bg-slate-200 px-4 text-[9px] font-black uppercase tracking-wider text-slate-500 gap-2"
                      >
                        <Lock className="h-4 w-4" /> Conferência incompleta
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

function PartIdentity({
  code,
  color,
  material,
}: {
  code?: string | null | undefined;
  color?: string | null | undefined;
  material?: string | null | undefined;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
      <span className="flex items-center gap-1">
        <span
          className="h-2.5 w-2.5 rounded-full border border-slate-300"
          style={{ backgroundColor: color || "transparent" }}
        />
        Grupo: {code || "não vinculado"} · Cor logística: {color || "não informada"}
      </span>
      <span>Material/acabamento: {material || "não informado"}</span>
    </div>
  );
}

function compareGroupCodes(left: string | null, right: string | null) {
  const groupNumber = (code: string | null) => {
    const match = code?.trim().match(/^G\s*(\d+)/i);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  const numberDifference = groupNumber(left) - groupNumber(right);
  if (numberDifference) return numberDifference;
  if (!left && right) return 1;
  if (left && !right) return -1;
  return (left ?? "").localeCompare(right ?? "", "pt-BR", { numeric: true });
}
