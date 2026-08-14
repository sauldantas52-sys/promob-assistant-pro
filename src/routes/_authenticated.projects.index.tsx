import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FolderKanban, Plus, Loader2, ChevronRight, Search, Filter, LayoutDashboard } from "lucide-react";
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
  DialogTrigger,
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
      const { error } = await supabase
        .from("projects")
        .insert({ company_id: companyId, name, client_name: clientName, environment, status: "novo" });
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
    <div className="space-y-16 p-8 md:p-16 max-w-[1800px] mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/dashboard'} 
            className="rounded-full px-4 text-slate-400 hover:text-blue-600 gap-2 mb-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </Button>
          <div className="flex items-center gap-4">
            <span className="h-2 w-10 bg-blue-600 rounded-full" />
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-600">Módulo de Projetos</p>
          </div>
          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter text-slate-900 uppercase leading-[0.8]">
            Engenharia <br className="hidden md:block" /> Técnica 4.0
          </h1>
          <p className="text-base font-black text-slate-500 uppercase tracking-[0.4em] mt-6">
            Inteligência operacional e controle de fluxo Promob.
          </p>
        </div>
        <div className="flex gap-4">
          {hasPermission(role, "projects", "import") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="h-24 px-12 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-slate-900/40 gap-6 transition-all duration-500 active:scale-95 group">
                  <Plus className="h-8 w-8 text-blue-400 transition-transform group-hover:rotate-90" /> Novo Dossiê
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo projeto</DialogTitle>
                  <DialogDescription>Depois de criar, importe o arquivo do Promob.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="p-name">Nome do projeto</Label>
                    <Input id="p-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-client">Cliente</Label>
                    <Input
                      id="p-client"
                      className="h-11"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-env">Ambiente principal</Label>
                    <Input
                      id="p-env"
                      className="h-11"
                      placeholder="Cozinha, dormitório, closet…"
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="h-11 w-full"
                    disabled={!name || createProject.isPending}
                    onClick={() => createProject.mutate()}
                  >
                    {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar projeto
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6 p-10 bg-white rounded-[4rem] border border-slate-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)]">
        <div className="relative flex-1">
          <Search className="absolute left-10 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-300" />
          <Input
            placeholder="Buscar por nome ou cliente..."
            className="h-24 pl-24 rounded-[2rem] border-none bg-slate-50 text-xl font-black uppercase tracking-widest placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-20 w-full sm:w-[320px] rounded-[2rem] border-none bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all duration-500">
              <div className="flex items-center gap-6">
                <Filter className="h-6 w-6 text-blue-400" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-[2rem] border-2 p-4">
              <SelectItem value="all" className="font-black uppercase text-[12px] tracking-widest py-4">Todos os Status</SelectItem>
              <SelectItem value="novo" className="font-black uppercase text-[12px] tracking-widest py-4">Novo</SelectItem>
              <SelectItem value="producao" className="font-black uppercase text-[12px] tracking-widest py-4 text-orange-600">Produção</SelectItem>
              <SelectItem value="conferencia" className="font-black uppercase text-[12px] tracking-widest py-4 text-blue-600">Conferência</SelectItem>
              <SelectItem value="montagem" className="font-black uppercase text-[12px] tracking-widest py-4 text-emerald-600">Montagem</SelectItem>
              <SelectItem value="concluido" className="font-black uppercase text-[12px] tracking-widest py-4 text-slate-500">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {projects.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando projetos…</p>
      ) : filteredProjects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum projeto cadastrado</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Crie o primeiro projeto e importe a exportação XML do Promob para gerar listas de peças,
              chapas e ferragens.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link key={project.id} to="/projects/$projectId" params={{ projectId: project.id }}>
              <Card className="h-full border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 rounded-[4rem] overflow-hidden group bg-white relative">
                <div className="absolute top-0 right-0 p-10">
                   <div className={cn("w-4 h-4 rounded-full animate-pulse", project.status === 'concluido' ? 'bg-slate-300' : 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]')} />
                </div>
                <CardHeader className="pb-8 pt-16 px-16">
                  <div className="space-y-6">
                    <Badge className={cn("px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] border-none rounded-full shadow-sm", statusTone(project.status))}>
                      {statusLabel(project.status)}
                    </Badge>
                    <CardTitle className="text-5xl font-black text-slate-900 tracking-tighter leading-[0.9] uppercase group-hover:text-blue-600 transition-colors duration-500">
                      {project.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-10 px-16 pb-16 pt-4">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cliente</p>
                      <p className="text-lg font-black uppercase tracking-tighter text-slate-900 truncate">{project.client_name || "—"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ambiente</p>
                      <p className="text-lg font-black uppercase tracking-tighter text-slate-900 truncate">{project.environment || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-10 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-8 bg-blue-600 rounded-full" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Protocolo Industrial</p>
                    </div>
                    <ChevronRight className="h-8 w-8 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-3 transition-all duration-700" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
