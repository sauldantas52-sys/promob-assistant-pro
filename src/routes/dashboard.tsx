import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Factory, Wrench, AlertTriangle, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useAuth, roleLabels } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, statusTone } from "@/lib/project-status";

export const Route = createFileRoute("/dashboard")({
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
    <div className="space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">Olá, {fullName?.split(" ")[0] ?? "bem-vindo"}!</h1>
        <p className="text-sm text-muted-foreground">
          {role ? roleLabels[role] : "Perfil não definido"} · Monta AI — Promob Assistant Pro
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground md:text-sm">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Projetos recentes</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/projects">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {list.slice(0, 6).map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {project.client_name || "Sem cliente"} · {project.environment || "—"}
                </p>
              </div>
              <Badge className={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
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
