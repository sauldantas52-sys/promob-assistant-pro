import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  FolderKanban,
  Plus,
  Loader2,
  ArrowUpRight,
  Search,
  Filter,
  LayoutDashboard,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusLabel, statusTone } from "@/lib/project-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projetos | Monta AI — Promob Assistant Pro" },
      {
        name: "description",
        content:
          "Cadastre e acompanhe projetos de móveis planejados, do orçamento à montagem, com dados extraídos do Promob.",
      },
      { property: "og:title", content: "Projetos | Monta AI" },
      { property: "og:description", content: "Gestão de projetos de móveis planejados." },
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const projects = useQuery({
    queryKey: ["projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, environment, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Perfil sem empresa vinculada.");
      const { error } = await supabase.from("projects").insert({
        company_id: companyId,
        name,
        client_name: clientName,
        environment,
        status: "novo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto criado.");
      setOpen(false);
      setName("");
      setClientName("");
      setEnvironment("");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredProjects = (projects.data ?? []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-4 sm:px-5 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <header className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
        <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1fr_auto] md:items-end lg:p-8">
          <div className="min-w-0">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="-ml-3 mb-4 h-8 gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 hover:bg-slate-900 hover:text-lime-300"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Button>
            <div className="mb-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-lime-300">
              <span className="h-px w-8 bg-lime-300" /> Registro de produção
            </div>
            <h1 className="text-3xl font-black uppercase leading-none tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              Projetos
            </h1>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Entrada técnica, rastreabilidade e acompanhamento dos projetos Promob.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:flex">
            {hasPermission(role, "projects", "import") && (
              <Button
                className="h-11 justify-center gap-2 rounded-md bg-lime-300 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-950 hover:bg-lime-200"
                onClick={() => navigate({ to: "/projects/import" })}
              >
                <Upload className="h-4 w-4" /> Pasta do cliente
              </Button>
            )}
            {hasPermission(role, "projects", "edit") && (
              <Button
                variant="outline"
                className="h-11 justify-center gap-2 rounded-md border-slate-700 bg-slate-900 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white hover:border-lime-300 hover:bg-slate-900 hover:text-lime-300"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-4 w-4" /> Cadastro manual
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-slate-800 text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:grid-cols-3">
          <div className="border-r border-slate-800 px-4 py-3">
            <strong className="mr-2 text-lime-300">{projects.data?.length ?? 0}</strong> total
          </div>
          <div className="border-r border-slate-800 px-4 py-3">
            <strong className="mr-2 text-white">{filteredProjects.length}</strong> visíveis
          </div>
          <div className="hidden px-4 py-3 sm:block">Base operacional / projetos</div>
        </div>
      </header>

      <section className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[1fr_220px]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Buscar projetos"
            placeholder="BUSCAR PROJETO OU CLIENTE"
            className="h-11 rounded-md border-0 bg-slate-100 pl-10 text-xs font-bold tracking-wide focus-visible:ring-lime-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full rounded-md border-slate-200 bg-white text-[11px] font-black uppercase tracking-[0.12em]">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-lime-600" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="producao">Produção</SelectItem>
            <SelectItem value="conferencia">Conferência</SelectItem>
            <SelectItem value="montagem">Montagem</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {projects.isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-6 text-xs font-bold uppercase tracking-widest text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-lime-600" /> Carregando projetos
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="rounded-lg border-dashed border-slate-300 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <FolderKanban className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-black uppercase tracking-tight text-slate-900">
              Nenhum projeto encontrado
            </p>
            <p className="max-w-md text-xs leading-relaxed text-slate-500">
              Importe uma Pasta do Cliente ou ajuste os filtros desta consulta.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="min-w-0"
            >
              <Card className="group h-full overflow-hidden rounded-lg border-slate-200 bg-white shadow-none transition-colors hover:border-slate-950">
                <CardHeader className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-slate-400">
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
                  <CardTitle className="line-clamp-2 text-lg font-black uppercase leading-tight tracking-[-0.025em] text-slate-950 transition-colors group-hover:text-lime-700 sm:text-xl">
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="min-w-0">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Cliente
                      </p>
                      <p className="truncate font-bold text-slate-800">
                        {project.client_name || "Não informado"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Ambiente
                      </p>
                      <p className="truncate font-bold text-slate-800">
                        {project.environment || "Não informado"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                    <span>Abrir protocolo</span>
                    <ArrowUpRight className="h-4 w-4 text-slate-950 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-lg border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              Cadastro manual
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Cria um projeto sem importar o pacote técnico do Promob.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-2">
              <Label
                htmlFor="project-name"
                className="text-[10px] font-black uppercase tracking-widest text-lime-300"
              >
                Projeto
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-slate-700 bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="client-name"
                className="text-[10px] font-black uppercase tracking-widest text-lime-300"
              >
                Cliente
              </Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="border-slate-700 bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="environment"
                className="text-[10px] font-black uppercase tracking-widest text-lime-300"
              >
                Ambiente
              </Label>
              <Input
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="border-slate-700 bg-slate-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createProject.mutate()}
              disabled={!name.trim() || createProject.isPending}
              className="bg-lime-300 font-black uppercase text-slate-950 hover:bg-lime-200"
            >
              {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
              projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
