import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Factory, Wrench, AlertTriangle, ClipboardCheck, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useAuth, roleLabels } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, statusTone } from "@/lib/project-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Monta AI — Promob Assistant Pro" },
      {
        name: "description",
        content:
          "Visão geral de projetos, produção, conferência e montagem de móveis planejados a partir dos arquivos do Promob.",
      },
      { property: "og:title", content: "Dashboard | Monta AI" },
      { property: "og:description", content: "Indicadores de projetos, produção e montagem." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { fullName, role, companyId } = useAuth();

  const projects = useQuery({
    queryKey: ["projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, status, environment, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = projects.data ?? [];
  const count = (status: string) => list.filter((p) => p.status === status).length;

  const stats = [
    { label: "Projetos ativos", value: list.length, icon: FolderKanban },
    { label: "Em produção", value: count("producao"), icon: Factory },
    { label: "Em conferência", value: count("conferencia"), icon: ClipboardCheck },
    { label: "Em montagem", value: count("montagem"), icon: Wrench },
    { label: "Assistência técnica", value: count("assistencia"), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-10 p-6 md:p-12 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
            Painel Operacional 4.0
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase leading-none">
            Olá, {fullName?.split(" ")[0] ?? "bem-vindo"}!
          </h1>
          <div className="flex items-center gap-3 mt-4">
            <Badge className="px-4 py-1.5 text-[10px] font-black shadow-sm uppercase tracking-[0.2em] border-none rounded-full bg-slate-900 text-white">
              {role ? roleLabels[role] : "Perfil não definido"}
            </Badge>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Aprovado para piloto controlado
            </span>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <Card key={stat.label} className={cn(
            "border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] transition-all duration-300 rounded-[2rem]",
            i === 0 ? "bg-blue-600 text-white" : "bg-white"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
              <CardTitle className={cn("text-[10px] font-black uppercase tracking-[0.2em]", i === 0 ? "text-blue-100" : "text-slate-400")}>
                {stat.label}
              </CardTitle>
              <div className={cn("p-2 rounded-xl", i === 0 ? "bg-blue-500/50" : "bg-slate-50")}>
                <stat.icon className={cn("h-5 w-5", i === 0 ? "text-white" : "text-blue-600")} />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className={cn("text-4xl font-black tracking-tighter", i === 0 ? "text-white" : "text-slate-900")}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Projetos Recentes</h2>
            <Link to="/projects" className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:underline">Ver Todos</Link>
          </div>
          
          <div className="grid gap-4">
            {list.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-300"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {project.client_name || "Sem cliente"} <span className="mx-2 text-slate-300">|</span> {project.environment || "Ambiente Geral"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border-none rounded-full", statusTone(project.status))}>
                    {statusLabel(project.status)}
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Nenhum projeto encontrado</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2">Ações Rápidas</h2>
          <Card className="border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight text-white leading-tight">Nova Importação Promob</h3>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                  Carregue arquivos XML, PDF ou DXF para iniciar o processamento técnico e gerar listas de corte automáticas.
                </p>
              </div>
              <Button asChild className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] border-none shadow-lg shadow-blue-600/20">
                <Link to="/projects">Gerenciar Projetos</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Link to="/production" className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:bg-slate-50 transition-colors gap-3">
              <Factory className="h-6 w-6 text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Produção</span>
            </Link>
            <Link to="/assembly" className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:bg-slate-50 transition-colors gap-3">
              <Wrench className="h-6 w-6 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Montagem</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}