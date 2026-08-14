import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { 
  Tv, 
  AlertOctagon, 
  Scissors, 
  Settings, 
  Layers, 
  PackageCheck,
  Truck,
  Monitor
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

function WallboardContent({ time }: { time: Date }) {
  const queryClient = useQueryClient();

  const projects = useQuery({
    queryKey: ["factory-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, 
          name, 
          status, 
          client_name,
          environment,
          is_cutting_edge_released,
          machining_blocked,
          production_steps(*),
          shipping_volumes(*)
        `)
        .in("status", ["corte", "borda", "usinagem", "separacao", "conferencia", "expedicao", "montagem"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('wallboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_steps' }, () => {
        void queryClient.invalidateQueries({ queryKey: ["factory-projects"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        void queryClient.invalidateQueries({ queryKey: ["factory-projects"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const list = projects.data ?? [];

  return (
    <div className="p-16 space-y-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 w-full">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-4 w-12 bg-blue-600 rounded-full animate-pulse" />
            <p className="text-[12px] font-black uppercase tracking-[0.6em] text-blue-500">Monitoramento Industrial 4.0</p>
          </div>
          <h1 className="text-[10rem] font-black tracking-tighter uppercase leading-[0.8] text-white">Produção</h1>
          <p className="text-4xl font-black text-slate-500 uppercase tracking-[0.5em]">
            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        
        <div className="flex gap-20 items-center">
          <div className="text-right border-r border-slate-800 pr-20">
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[14px] mb-4">Em Linha</p>
            <p className="text-[8rem] font-black text-white leading-none">{list.length}</p>
          </div>
          <div className="text-right">
            <p className="text-[8rem] font-black font-mono tracking-tighter text-white leading-none">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-[14px] mt-6 animate-pulse">
              Factory Sync Active
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-12 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
        {list.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {list.length === 0 && (
          <div className="col-span-full py-64 flex flex-col items-center justify-center text-slate-500 border-[6px] border-dashed border-slate-800 rounded-[5rem] bg-slate-900/10">
            <Monitor className="h-48 w-48 mb-12 opacity-20 text-blue-500" />
            <p className="text-5xl font-black uppercase tracking-[0.5em] opacity-40">Aguardando Ordens</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const getStats = (type: string) => {
    const steps = project.production_steps || [];
    const typeSteps = steps.filter((s: any) => s.step_type === type);
    const done = typeSteps.filter((s: any) => s.status === 'concluido').length;
    const blocked = typeSteps.some((s: any) => s.status === 'bloqueado');
    return { total: typeSteps.length, done, blocked };
  };

  const statusMap: Record<string, { label: string, color: string }> = {
    corte: { label: "CORTE", color: "bg-red-600 shadow-red-600/40" },
    borda: { label: "BORDA", color: "bg-orange-600 shadow-orange-600/40" },
    usinagem: { label: "USINAGEM", color: "bg-purple-600 shadow-purple-600/40" },
    separacao: { label: "SEPARAÇÃO", color: "bg-blue-600 shadow-blue-600/40" },
    conferencia: { label: "CONFERÊNCIA", color: "bg-indigo-600 shadow-indigo-600/40" },
    montagem: { label: "MONTAGEM", color: "bg-emerald-600 shadow-emerald-600/40" },
    expedicao: { label: "EXPEDIÇÃO", color: "bg-slate-900 shadow-slate-900/40" },
  };

  const current = statusMap[project.status] || { label: project.status, color: "bg-slate-700 shadow-slate-700/40" };
  
  const totalSteps = project.production_steps?.length || 1;
  const completedSteps = project.production_steps?.filter((s: any) => s.status === 'concluido').length || 0;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <Card className="bg-[#0f172a] border-none shadow-2xl rounded-[4rem] overflow-hidden group transition-all duration-700 hover:scale-[1.03] ring-1 ring-slate-800 hover:ring-blue-500/50">
      <CardHeader className="p-12 pb-8 border-b border-slate-800/50">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Badge className={cn("px-8 py-3 text-[12px] font-black tracking-[0.3em] border-none rounded-full shadow-2xl transition-all duration-500 group-hover:scale-110", current.color)}>
              {current.label}
            </Badge>
            <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          </div>
          <div>
            <CardTitle className="text-5xl font-black text-white tracking-tighter uppercase leading-[0.9] group-hover:text-blue-400 transition-colors duration-500">
              {project.name}
            </CardTitle>
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em] mt-4">
              {project.client_name || "CLIENTE NÃO INFORMADO"}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-12 space-y-12">
        <div className="grid grid-cols-2 gap-8">
          <MetricItem icon={Scissors} label="Corte" stats={getStats('corte')} color="text-red-500" barColor="bg-red-600" />
          <MetricItem icon={Layers} label="Borda" stats={getStats('borda')} color="text-amber-500" barColor="bg-amber-600" />
          <MetricItem icon={Settings} label="Usinagem" stats={getStats('usinagem')} color="text-violet-500" barColor="bg-violet-600" />
          <MetricItem icon={PackageCheck} label="Picking" stats={getStats('separacao')} color="text-blue-500" barColor="bg-blue-600" />
        </div>

        <div className="space-y-6 pt-10 border-t border-slate-800/50">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">Total Produzido</p>
            <span className="text-3xl font-black text-white font-mono">{progressPercent}%</span>
          </div>
          <div className="h-8 w-full bg-slate-950 rounded-full overflow-hidden p-2 ring-1 ring-slate-800">
            <div 
              className={cn("h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.4)]", progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600")}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ icon: Icon, label, stats, color, barColor }: any) {
  const percent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
  
  return (
    <div className={cn(
      "p-6 rounded-[2rem] border transition-all relative overflow-hidden group/item",
      stats.blocked ? "bg-red-500/10 border-red-500/30" : "bg-slate-950/60 border-slate-800"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl bg-slate-900 group-hover/item:scale-110 transition-transform duration-500", stats.blocked ? "bg-red-900/50" : "")}>
          <Icon className={cn("h-7 w-7", stats.blocked ? "text-red-500 animate-pulse" : color)} />
        </div>
        {stats.blocked && <AlertOctagon className="h-5 w-5 text-red-600" />}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-4xl font-black tracking-tighter", stats.blocked ? "text-red-400" : "text-white")}>{stats.done}</span>
        <span className="text-[12px] font-bold text-slate-700">/ {stats.total}</span>
      </div>
      <div className="h-2 w-full bg-slate-900 mt-5 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-1000", stats.blocked ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" : barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
