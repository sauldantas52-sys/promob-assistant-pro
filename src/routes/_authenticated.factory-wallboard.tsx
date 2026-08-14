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
          is_cutting_edge_released,
          is_machining_assembly_blocked,
          production_steps(*),
          shipping_volumes(*)
        `)
        .in("status", ["producao", "conferencia", "expedicao"])
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
    <div className="p-6 lg:p-10 space-y-10">
      <header className="flex items-center justify-between border-b border-slate-800/60 pb-8">
        <div className="flex items-center gap-8">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.3)] border border-blue-400/20">
            <Monitor className="h-12 w-12 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none text-white">
              Painel Operacional
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">
                Live Factory Sync • Traceability 4.0
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-10">
          <div className="text-right border-r border-slate-800 pr-10">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Total em Linha</p>
            <p className="text-4xl font-black text-white">{list.length}</p>
          </div>
          <div className="text-right">
            <p className="text-6xl font-black font-mono tracking-tighter text-white">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {list.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
            <Tv className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-xl font-bold uppercase tracking-widest opacity-40">Aguardando liberação de carga...</p>
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
    producao: { label: "PRODUÇÃO", color: "bg-orange-600" },
    conferencia: { label: "CONFERÊNCIA", color: "bg-blue-600" },
    expedicao: { label: "EXPEDIÇÃO", color: "bg-indigo-600" },
  };

  const current = statusMap[project.status] || { label: project.status, color: "bg-slate-700" };

  return (
    <Card className="bg-slate-900/50 border-slate-800 shadow-2xl rounded-[2rem] overflow-hidden backdrop-blur-sm group hover:ring-2 hover:ring-blue-500/50 transition-all duration-500">
      <CardHeader className="bg-slate-800/30 p-8 border-b border-slate-800/50">
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <Badge className={cn("px-4 py-1.5 text-xs font-black tracking-widest border-none rounded-full", current.color)}>
              {current.label}
            </Badge>
            {project.is_machining_assembly_blocked && (
              <Badge variant="destructive" className="animate-pulse px-4 py-1.5 text-xs font-black tracking-widest rounded-full">
                BLOQUEADO
              </Badge>
            )}
          </div>
          <div>
            <CardTitle className="text-3xl font-black text-white tracking-tight leading-none uppercase group-hover:text-blue-400 transition-colors">
              {project.name}
            </CardTitle>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">
              {project.client_name || "CLIENTE NÃO INFORMADO"}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 grid grid-cols-2 gap-4">
        <MetricItem icon={Scissors} label="Corte" stats={getStats('corte')} color="text-red-500" barColor="bg-red-600" />
        <MetricItem icon={Layers} label="Borda" stats={getStats('borda')} color="text-amber-500" barColor="bg-amber-600" />
        <MetricItem icon={Settings} label="Usinagem" stats={getStats('usinagem')} color="text-violet-500" barColor="bg-violet-600" />
        <MetricItem icon={PackageCheck} label="Check" stats={getStats('separacao')} color="text-blue-500" barColor="bg-blue-600" />
        
        {project.shipping_volumes?.length > 0 && (
          <div className="col-span-2 mt-4 pt-6 border-t border-slate-800/50">
            <div className="flex justify-between items-end mb-3">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-indigo-500" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Expedição</span>
              </div>
              <span className="text-xl font-black text-white">
                {project.shipping_volumes.filter((v: any) => v.status === 'carregado').length}
                <span className="text-xs text-slate-600 ml-1">/ {project.shipping_volumes.length}</span>
              </span>
            </div>
            <div className="h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div 
                className="h-full bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-1000"
                style={{ width: `${(project.shipping_volumes.filter((v: any) => v.status === 'carregado').length / project.shipping_volumes.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricItem({ icon: Icon, label, stats, color, barColor }: any) {
  const percent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
  
  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all relative overflow-hidden",
      stats.blocked ? "bg-red-500/5 border-red-500/20" : "bg-slate-950/40 border-slate-800"
    )}>
      <div className="flex justify-between items-start mb-4">
        <Icon className={cn("h-6 w-6", stats.blocked ? "text-red-500 animate-pulse" : color)} />
        {stats.blocked && <AlertOctagon className="h-4 w-4 text-red-600" />}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-black", stats.blocked ? "text-red-400" : "text-white")}>{stats.done}</span>
        <span className="text-[10px] font-bold text-slate-700">/ {stats.total}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-950 mt-3 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-700", stats.blocked ? "bg-red-600" : barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
