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
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Olá, {fullName?.split(" ")[0] ?? "bem-vindo"}!
          </h1>
          <p className="text-lg text-slate-500 mt-1">
            {role ? roleLabels[role] : "Perfil não definido"} · Monta AI — Aprovado para piloto controlado
          </p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {stat.label}
              </CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <stat.icon className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 py-4 px-6 border-b border-slate-100">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">Projetos recentes</CardTitle>
          <Button asChild variant="ghost" size="sm" className="font-bold text-blue-600 hover:bg-blue-50">
            <Link to="/projects" className="flex items-center gap-1">Ver todos <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {list.slice(0, 6).map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900 uppercase tracking-tight">{project.name}</p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {project.client_name || "Sem cliente"} · {project.environment || "—"}
                </p>
              </div>
              <Badge className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border", statusTone(project.status))}>
                {statusLabel(project.status)}
              </Badge>
            </Link>
          ))}
          {list.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum projeto ainda. Crie um projeto e importe o arquivo do Promob.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
