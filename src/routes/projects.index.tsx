import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FolderKanban, Plus, Loader2, ChevronRight } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, statusTone } from "@/lib/project-status";

export const Route = createFileRoute("/projects/")({
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
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [environment, setEnvironment] = useState("");

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

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Importe arquivos do Promob e acompanhe cada ambiente até a montagem.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-11">
              <Plus className="mr-2 h-4 w-4" /> Novo projeto
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
      </header>

      {projects.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando projetos…</p>
      ) : (projects.data?.length ?? 0) === 0 ? (
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.data?.map((project) => (
            <Link key={project.id} to="/projects/$projectId" params={{ projectId: project.id }}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <Badge className={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>Cliente: {project.client_name || "—"}</p>
                  <p>Ambiente: {project.environment || "—"}</p>
                  <p className="flex items-center gap-1 pt-2 font-medium text-primary">
                    Abrir projeto <ChevronRight className="h-4 w-4" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
