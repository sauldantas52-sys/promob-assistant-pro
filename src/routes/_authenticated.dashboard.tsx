import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Factory, Wrench, AlertTriangle, ClipboardCheck, ChevronRight, ShieldCheck, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useAuth, roleLabels, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hasPermission } from "@/lib/permissions";
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
    { label: "Em corte", value: count("corte"), icon: Factory },
    { label: "Em borda", value: count("borda"), icon: ClipboardCheck },
    { label: "Em usinagem", value: count("usinagem"), icon: Factory },
    { label: "Em montagem", value: count("montagem"), icon: Wrench },
    { label: "Assistência", value: count("assistencia"), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-16 p-8 md:p-16 max-w-[1800px] mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-8 bg-blue-600 rounded-full" />
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-600">
              Industrial Monitoring 4.0
            </p>
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 uppercase leading-[0.85]">
            Olá, {fullName?.split(" ")[0] ?? "Operador"}
          </h1>
          <div className="flex items-center gap-4 mt-6">
            <Badge className="px-6 py-2 text-[11px] font-black shadow-xl uppercase tracking-[0.2em] border-none rounded-2xl bg-slate-900 text-white">
              {role ? roleLabels[role as AppRole] : "Operador Geral"}
            </Badge>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Piloto Controlado Ativo
            </span>
          </div>
        </div>
        
        {hasPermission(role, "projects", "import") && (
          <Button asChild className="h-20 px-12 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-blue-600/40 gap-6 transition-all duration-500 active:scale-95 group">
            <Link to="/projects/import">
              <Upload className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
              Importar Projeto
            </Link>
          </Button>
        )}

        <div className="hidden md:block text-right border-l-4 border-slate-200 pl-8">
          <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Status do Turno</p>
          <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10">
        {stats.map((stat, i) => (
          <Card key={stat.label} className={cn(
            "border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.18)] transition-all duration-700 rounded-[3.5rem] group overflow-hidden relative",
            i === 0 ? "bg-blue-600 text-white" : "bg-white"
          )}>
            {i === 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 p-10">
              <CardTitle className={cn("text-[11px] font-black uppercase tracking-[0.4em]", i === 0 ? "text-blue-100" : "text-slate-400")}>
                {stat.label}
              </CardTitle>
              <div className={cn("p-4 rounded-3xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-12", i === 0 ? "bg-blue-500/50" : "bg-slate-50")}>
                <stat.icon className={cn("h-7 w-7", i === 0 ? "text-white" : "text-blue-600")} />
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <p className={cn("text-7xl font-black tracking-tighter leading-none", i === 0 ? "text-white" : "text-slate-900")}>{stat.value}</p>
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
          
          <div className="grid gap-6">
            {list.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_15px_50px_-15px_rgba(0,0,0,0.06)] hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.12)] transition-all duration-500"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      {project.client_name || "Sem cliente"}
                    </p>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      {project.environment || "Ambiente Geral"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <Badge className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] border-none rounded-full shadow-sm", statusTone(project.status))}>
                    {statusLabel(project.status)}
                  </Badge>
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-500" />
                  </div>
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

          <Card className="border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Protocolos de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-900">Usinagem Bloqueada</p>
                  <p className="text-[10px] font-medium text-amber-700 leading-tight">
                    O controle CNC permanece travado até a validação completa do checklist piloto em cada projeto.
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed px-2">
                Acesse o dossiê técnico de cada projeto para gerenciar os checklists de validação e liberar a produção industrial.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}