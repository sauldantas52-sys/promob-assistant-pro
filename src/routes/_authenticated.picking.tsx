import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Boxes, ClipboardList, LayoutDashboard, Lock, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
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
          parts(id, name, kind, quantity, unit, is_completed, storage_location, assembly_group_id, assembly_groups(code))
        `,
        )
        .in("status", ["usinagem", "separacao", "conferencia"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
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
            const groupCode = (part: (typeof parts)[number]) => part.assembly_groups?.code ?? "";
            const g1 = hardwareItems.filter((part) => groupCode(part) === "G1");
            const g2 = hardwareItems.filter((part) => groupCode(part) === "G2");
            const g3 = hardwareItems.filter((part) => groupCode(part) === "G3");
            const av = hardwareItems.filter(
              (part) => !g1.includes(part) && !g2.includes(part) && !g3.includes(part),
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
                    {[
                      { label: "G1 - Módulos Base", items: g1, color: "bg-teal-600" },
                      { label: "G2 - Complementares", items: g2, color: "bg-slate-600" },
                      { label: "G3 - Acabamentos", items: g3, color: "bg-indigo-600" },
                      { label: "AV - Avulsos / Ferragens", items: av, color: "bg-orange-600" },
                    ].map(
                      (group) =>
                        group.items.length > 0 && (
                          <div key={group.label} className="bg-white">
                            <div className="flex items-center gap-3 border-y border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                              <div className={cn("h-2.5 w-2.5 rounded-full", group.color)} />
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                {group.label}
                              </p>
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
