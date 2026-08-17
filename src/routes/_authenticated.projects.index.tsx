import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Factory,
  Filter,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  MapPin,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ProjectCreationDialog } from "@/components/projects/ProjectCreationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  createCompleteProject,
  fetchProjectClients,
  fetchProjectsDashboard,
  type CreateProjectInput,
  type ProjectSummary,
} from "@/lib/projects/data";
import { projectStatuses, statusLabel, statusTone } from "@/lib/project-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projetos e obras | Monta AI" },
      {
        name: "description",
        content: "Carteira real de clientes, obras, ambientes e andamento no chão de fábrica.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <AppShell>
      <ProjectsContent />
    </AppShell>
  );
}

function ProjectsContent() {
  const { companyId, role } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creationOpen, setCreationOpen] = useState(false);
  const [creationKey, setCreationKey] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const projects = useQuery({
    queryKey: ["projects-dashboard", companyId],
    enabled: !!companyId,
    queryFn: () => fetchProjectsDashboard(companyId as string),
  });
  const clients = useQuery({
    queryKey: ["project-clients", companyId],
    enabled: !!companyId && creationOpen,
    queryFn: () => fetchProjectClients(companyId as string),
  });

  const createProject = useMutation({
    mutationFn: (input: Omit<CreateProjectInput, "companyId">) => {
      if (!companyId) throw new Error("Seu perfil não está vinculado a uma empresa.");
      if (!hasPermission(role, "projects", "edit")) {
        throw new Error("Seu perfil não possui permissão para criar projetos.");
      }
      return createCompleteProject({ ...input, companyId });
    },
    onSuccess: (projectId) => {
      toast.success("Cliente, obra, endereço e ambientes cadastrados.");
      setCreationOpen(false);
      setCreationKey((value) => value + 1);
      void queryClient.invalidateQueries({ queryKey: ["projects-dashboard", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["project-clients", companyId] });
      void navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (error: Error) => toast.error(error.message, { duration: 9000 }),
  });

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredProjects = (projects.data ?? []).filter((project) => {
    const searchable = [project.name, project.clientName, ...project.environments]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    return (
      (!normalizedSearch || searchable.includes(normalizedSearch)) &&
      (statusFilter === "all" || project.status === statusFilter)
    );
  });
  const cuttingNow = (projects.data ?? []).filter(
    (project) =>
      project.status === "corte" ||
      ["em_andamento", "em andamento", "cortando"].includes(
        project.cuttingStatus?.toLocaleLowerCase("pt-BR") ?? "",
      ),
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-4 sm:px-5 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <header className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_auto] md:items-end lg:p-9">
          <div className="min-w-0">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="-ml-3 mb-5 h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 hover:bg-slate-900 hover:text-lime-300"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Button>
            <div className="mb-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-lime-300">
              <span className="h-px w-8 bg-lime-300" /> Carteira de obras
            </div>
            <h1 className="text-3xl font-black uppercase leading-none tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              Projetos
            </h1>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Do cadastro do cliente à entrega: obra, ambientes e produção no mesmo registro.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:flex">
            {hasPermission(role, "projects", "import") && (
              <Button
                className="h-11 gap-2 bg-lime-300 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-950 hover:bg-lime-200"
                onClick={() => navigate({ to: "/projects/import" })}
              >
                <Upload className="h-4 w-4" /> Importar Promob
              </Button>
            )}
            {hasPermission(role, "projects", "edit") && (
              <Button
                variant="outline"
                className="h-11 gap-2 border-slate-700 bg-slate-900 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white hover:border-lime-300 hover:bg-slate-900 hover:text-lime-300"
                onClick={() => setCreationOpen(true)}
              >
                <Plus className="h-4 w-4" /> Nova obra
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-800 text-[9px] uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
          <Metric value={projects.data?.length ?? 0} label="obras" accent />
          <Metric value={cuttingNow.length} label="em corte" />
          <Metric value={filteredProjects.length} label="na consulta" />
        </div>
      </header>

      {projects.isError && (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Não foi possível consultar a carteira de obras.</p>
            <p className="mt-1 text-xs">{errorMessage(projects.error)}</p>
          </div>
        </div>
      )}

      {!projects.isError && (
        <section
          aria-labelledby="cutting-now-title"
          className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2 text-red-400">
                <Factory className="h-4 w-4" />
                <h2
                  id="cutting-now-title"
                  className="text-sm font-black uppercase tracking-[0.12em]"
                >
                  Em corte agora
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Leitura ao vivo das obras na etapa de corte.
              </p>
            </div>
            <span className="font-mono text-2xl font-black text-white">
              {cuttingNow.length.toString().padStart(2, "0")}
            </span>
          </div>
          {projects.isLoading ? (
            <Loading label="Consultando o chão de fábrica" dark />
          ) : cuttingNow.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500 sm:px-6">
              Nenhuma obra está marcada em corte neste momento.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3">
              {cuttingNow.map((project) => (
                <CuttingCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[1fr_230px]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Buscar projeto, cliente ou ambiente"
            placeholder="BUSCAR OBRA, CLIENTE OU AMBIENTE"
            className="h-11 border-0 bg-slate-100 pl-10 text-xs font-bold tracking-wide focus-visible:ring-lime-400"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 border-slate-200 text-[11px] font-black uppercase tracking-[0.12em]">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-lime-600" />
              <SelectValue placeholder="Etapa" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {projectStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {projects.isError ? null : projects.isLoading ? (
        <Loading label="Carregando obras" />
      ) : !projects.isError && filteredProjects.length === 0 ? (
        <Card className="border-dashed border-slate-300 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <FolderKanban className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-black uppercase tracking-tight text-slate-900">
              {projects.data?.length
                ? "Nenhuma obra corresponde aos filtros"
                : "Nenhuma obra cadastrada"}
            </p>
            <p className="max-w-md text-xs leading-relaxed text-slate-500">
              {projects.data?.length
                ? "Altere a busca ou selecione outra etapa."
                : hasPermission(role, "projects", "edit")
                  ? "Cadastre a primeira obra ou importe uma pasta técnica do Promob."
                  : "Sua empresa ainda não possui projetos disponíveis para consulta."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectCreationDialog
        key={creationKey}
        open={creationOpen}
        clients={clients.data ?? []}
        isLoadingClients={clients.isLoading}
        clientsError={
          clients.isError
            ? `Não foi possível consultar os clientes: ${errorMessage(clients.error)}`
            : null
        }
        isSaving={createProject.isPending}
        onOpenChange={setCreationOpen}
        onSubmit={(input) => createProject.mutate(input)}
      />
    </div>
  );
}

function CuttingCard({ project }: { project: ProjectSummary }) {
  const progress = project.totalSteps
    ? Math.round((project.completedSteps / project.totalSteps) * 100)
    : 0;
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group border-b border-slate-800 p-4 last:border-b-0 hover:bg-slate-900 md:border-r xl:border-b-0 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-red-400">
            {project.clientName || "Cliente não informado"}
          </p>
          <h3 className="mt-1 truncate text-base font-black uppercase text-white">
            {project.name}
          </h3>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-lime-300" />
      </div>
      <p className="mt-3 line-clamp-1 text-xs text-slate-400">
        {environmentText(project.environments)}
      </p>
      <div className="mt-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-slate-500">Progresso da produção</span>
        <span>{project.totalSteps ? `${progress}%` : "Sem etapas"}</span>
      </div>
      <Progress value={progress} className="mt-2 h-1.5 bg-slate-800" />
      <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <CalendarDays className="h-3.5 w-3.5" /> Entrega:{" "}
        <span className="text-slate-300">{formatDelivery(project.deliveryAt)}</span>
      </div>
    </Link>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const progress = project.totalSteps
    ? Math.round((project.completedSteps / project.totalSteps) * 100)
    : 0;
  return (
    <Link to="/projects/$projectId" params={{ projectId: project.id }} className="min-w-0">
      <Card className="group h-full overflow-hidden border-slate-200 bg-white shadow-none transition-colors hover:border-slate-950">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <span className="font-mono text-[9px] font-bold tracking-[0.16em] text-slate-400">
              PRJ-{project.id.slice(0, 8).toUpperCase()}
            </span>
            <Badge
              className={cn(
                "rounded-sm px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] shadow-none",
                statusTone(project.status),
              )}
            >
              {statusLabel(project.status)}
            </Badge>
          </div>
          <div className="p-4 sm:p-5">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-lime-700">
              {project.clientName || "Cliente não informado"}
            </p>
            <h3 className="mt-1 line-clamp-2 min-h-12 text-lg font-black uppercase leading-tight tracking-[-0.025em] text-slate-950 group-hover:text-lime-700 sm:text-xl">
              {project.name}
            </h3>
            <div className="mt-4 flex items-start gap-2 text-xs text-slate-600">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{environmentText(project.environments)}</span>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4 border-t border-slate-100 pt-4">
              <div>
                <div className="flex justify-between gap-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <span>Módulos / Peças</span>
                  <span>{project.modulesCount} / {project.partsCount}</span>
                </div>
                <div className="flex justify-between gap-3 mt-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <span>Produção</span>
                  <span>{project.totalSteps ? `${progress}%` : "Sem etapas"}</span>
                </div>
                <Progress value={progress} className="mt-2 h-1.5" />
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                  Entrega
                </p>
                <p className="mt-1 text-[10px] font-bold text-slate-700">
                  {formatDelivery(project.deliveryAt)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="border-r border-slate-800 px-3 py-3 last:border-r-0 sm:px-5">
      <strong className={cn("mr-1.5 text-sm", accent ? "text-lime-300" : "text-white")}>
        {value}
      </strong>
      {label}
    </div>
  );
}

function Loading({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-6 text-xs font-bold uppercase tracking-widest",
        dark ? "text-slate-500" : "rounded-lg border border-slate-200 bg-white text-slate-500",
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-lime-500" /> {label}
    </div>
  );
}

function environmentText(environments: string[]) {
  if (environments.length === 0) return "Ambientes não cadastrados";
  return `${environments.length} ${environments.length === 1 ? "ambiente" : "ambientes"}: ${environments.join(", ")}`;
}

function formatDelivery(value: string | null) {
  if (!value) return "Não agendada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado ao carregar os dados.";
}
