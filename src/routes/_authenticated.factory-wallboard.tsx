import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, Scissors, Settings, Layers, PackageCheck, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryData } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/factory-wallboard")({
  head: () => ({
    meta: [
      { title: "WALLBOARD | Monta AI" },
      { name: "description", content: "Monitoramento industrial em tempo real." },
    ],
  }),
  component: FactoryWallboardPage,
});

function FactoryWallboardPage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#020617] min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      <WallboardContent time={time} />
    </div>
  );
}

function factoryProjectsQuery() {
  return supabase
    .from("projects")
    .select(
      `
      id,
      name,
      status,
      client_name,
      environment,
      is_cutting_edge_released,
      machining_blocked,
      production_steps(*),
      shipping_volumes(*)
    `,
    )
    .in("status", [
      "corte",
      "borda",
      "usinagem",
      "separacao",
      "conferencia",
      "expedicao",
      "montagem",
    ])
    .order("updated_at", { ascending: false });
}

type FactoryProject = QueryData<ReturnType<typeof factoryProjectsQuery>>[number];

interface MetricStats {
  total: number;
  done: number;
  blocked: boolean;
}

interface MetricItemProps {
  icon: LucideIcon;
  label: string;
  stats: MetricStats;
  color: string;
  barColor: string;
}

function WallboardContent({ time }: { time: Date }) {
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: ["factory-projects"],
    queryFn: async () => {
      const { data, error } = await factoryProjectsQuery();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("wallboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_steps" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["factory-projects"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["factory-projects"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const list = projects.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 2xl:p-10">
      <header className="flex w-full flex-col justify-between gap-5 border-b border-slate-800 pb-6 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-8 bg-blue-600 rounded-full animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-500">
              Monitoramento Industrial 4.0
            </p>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase leading-none text-white sm:text-6xl lg:text-7xl 2xl:text-8xl">
            Produção
          </h1>
          <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] sm:text-base lg:text-lg">
            {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>

        <div className="flex items-end gap-6 sm:gap-10 lg:gap-14">
          <div className="border-r border-slate-800 pr-6 text-left sm:pr-10 md:text-right">
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
              Em Linha
            </p>
            <p className="text-4xl font-black leading-none text-white sm:text-5xl lg:text-6xl">
              {list.length}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-4xl font-black font-mono tracking-tighter text-white leading-none sm:text-5xl lg:text-6xl">
              {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="mt-2 text-[8px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse sm:text-[10px]">
              Factory Sync Active
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {list.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/10 py-24 text-slate-500">
            <Monitor className="mb-5 h-16 w-16 text-blue-500 opacity-20" />
            <p className="text-lg font-black uppercase tracking-[0.25em] opacity-40">
              Aguardando Ordens
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: FactoryProject }) {
  const getStats = (type: string) => {
    const steps = project.production_steps || [];
    const typeSteps = steps.filter((step) => step.step_type === type);
    const done = typeSteps.filter((step) => step.status === "concluido").length;
    const blocked = typeSteps.some((step) => step.status === "bloqueado");
    return { total: typeSteps.length, done, blocked };
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    corte: { label: "CORTE", color: "bg-red-600 shadow-red-600/40" },
    borda: { label: "BORDA", color: "bg-orange-600 shadow-orange-600/40" },
    usinagem: { label: "USINAGEM", color: "bg-purple-600 shadow-purple-600/40" },
    separacao: { label: "SEPARAÇÃO", color: "bg-blue-600 shadow-blue-600/40" },
    conferencia: { label: "CONFERÊNCIA", color: "bg-indigo-600 shadow-indigo-600/40" },
    montagem: { label: "MONTAGEM", color: "bg-emerald-600 shadow-emerald-600/40" },
    expedicao: { label: "EXPEDIÇÃO", color: "bg-slate-900 shadow-slate-900/40" },
  };

  const current = statusMap[project.status ?? ""] || {
    label: project.status,
    color: "bg-slate-700 shadow-slate-700/40",
  };

  const totalSteps = project.production_steps?.length || 1;
  const completedSteps =
    project.production_steps?.filter((step) => step.status === "concluido").length || 0;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <Card className="overflow-hidden rounded-2xl border-none bg-[#0f172a] shadow-xl ring-1 ring-slate-800">
      <CardHeader className="border-b border-slate-800/50 p-5 lg:p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Badge
              className={cn(
                "rounded-md border-none px-3 py-1.5 text-[9px] font-black tracking-[0.2em] shadow-lg",
                current.color,
              )}
            >
              {current.label}
            </Badge>
            <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          </div>
          <div>
            <CardTitle className="break-words text-2xl font-black leading-none tracking-tight text-white uppercase lg:text-3xl">
              {project.name}
            </CardTitle>
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em] mt-4">
              {project.client_name || "CLIENTE NÃO INFORMADO"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 lg:p-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <MetricItem
            icon={Scissors}
            label="Corte"
            stats={getStats("corte")}
            color="text-red-500"
            barColor="bg-red-600"
          />
          <MetricItem
            icon={Layers}
            label="Borda"
            stats={getStats("borda")}
            color="text-amber-500"
            barColor="bg-amber-600"
          />
          <MetricItem
            icon={Settings}
            label="Usinagem"
            stats={getStats("usinagem")}
            color="text-violet-500"
            barColor="bg-violet-600"
          />
          <MetricItem
            icon={PackageCheck}
            label="Picking"
            stats={getStats("separacao")}
            color="text-blue-500"
            barColor="bg-blue-600"
          />
        </div>

        <div className="space-y-3 border-t border-slate-800/50 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">
              Total Produzido
            </p>
            <span className="text-xl font-black text-white font-mono">{progressPercent}%</span>
          </div>
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden p-1 ring-1 ring-slate-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.4)]",
                progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ icon: Icon, label, stats, color, barColor }: MetricItemProps) {
  const percent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

  return (
    <div
      className={cn(
        "p-3 sm:p-4 rounded-xl border transition-all relative overflow-hidden group/item",
        stats.blocked ? "bg-red-500/10 border-red-500/30" : "bg-slate-950/60 border-slate-800",
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={cn("p-2 rounded-lg bg-slate-900", stats.blocked ? "bg-red-900/50" : "")}>
          <Icon
            className={cn(
              "h-4 w-4 sm:h-5 sm:w-5",
              stats.blocked ? "text-red-500 animate-pulse" : color,
            )}
          />
        </div>
        {stats.blocked && <AlertOctagon className="h-5 w-5 text-red-600" />}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-black tracking-tighter",
            stats.blocked ? "text-red-400" : "text-white",
          )}
        >
          {stats.done}
        </span>
        <span className="text-[12px] font-bold text-slate-700">/ {stats.total}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-900 mt-3 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-1000",
            stats.blocked ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" : barColor,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
