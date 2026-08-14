import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Upload,
  Loader2,
  AlertTriangle,
  Boxes,
  Layers,
  Wrench,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { parseProjectFile } from "@/lib/promob-import";
import { projectStatuses, statusLabel, statusTone } from "@/lib/project-status";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Detalhes do projeto | Monta AI" },
      {
        name: "description",
        content:
          "Módulos, peças, chapas e ferragens extraídos do arquivo do Promob, prontos para orçamento, produção e conferência.",
      },
      { property: "og:title", content: "Detalhes do projeto | Monta AI" },
      { property: "og:description", content: "Listas técnicas e conferência do projeto." },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  return (
    <AppShell>
      <ProjectDetail />
    </AppShell>
  );
}

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, environment, status, notes, created_at")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const modules = useQuery({
    queryKey: ["modules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const parts = useQuery({
    queryKey: ["parts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("id, module_id, kind, name, material, thickness_mm, width_mm, length_mm, quantity, unit, edge_banding, is_completed")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const files = useQuery({
    queryKey: ["project_files", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("id, file_name, file_type, size_bytes, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleImport = async (file: File) => {
    setImporting(true);
    setWarnings([]);
    try {
      const result = await parseProjectFile(file);

      await supabase.from("project_files").insert({
        project_id: projectId,
        file_name: result.fileName,
        file_type: result.fileType,
        size_bytes: result.sizeBytes,
        summary: {
          modules: result.modules.length,
          parts: result.modules.reduce((total, m) => total + m.parts.length, 0),
          warnings: result.warnings,
        },
      });

      for (const parsedModule of result.modules) {
        const { data: created, error } = await supabase
          .from("modules")
          .insert({
            project_id: projectId,
            name: parsedModule.name,
            environment: parsedModule.environment ?? null,
            width_mm: parsedModule.width_mm ?? null,
            height_mm: parsedModule.height_mm ?? null,
            depth_mm: parsedModule.depth_mm ?? null,
            quantity: parsedModule.quantity,
          })
          .select("id")
          .single();
        if (error) throw error;

        if (parsedModule.parts.length > 0) {
          const { error: partsError } = await supabase.from("parts").insert(
            parsedModule.parts.map((part) => ({
              project_id: projectId,
              module_id: created.id,
              kind: part.kind,
              name: part.name,
              material: part.material ?? null,
              thickness_mm: part.thickness_mm ?? null,
              width_mm: part.width_mm ?? null,
              length_mm: part.length_mm ?? null,
              quantity: part.quantity,
              unit: part.unit ?? "un",
              edge_banding: part.edge_banding ?? null,
            })),
          );
          if (partsError) throw partsError;
        }
      }

      setWarnings(result.warnings);
      toast.success(
        result.modules.length > 0
          ? `${result.modules.length} módulo(s) importado(s).`
          : "Arquivo registrado no projeto.",
      );
      void queryClient.invalidateQueries({ queryKey: ["modules", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["parts", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project_files", projectId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na importação.");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const allParts = parts.data ?? [];
  const panels = allParts.filter((p) => p.kind === "peca" || p.kind === "chapa");
  const hardware = allParts.filter((p) => p.kind === "ferragem" || p.kind === "acessorio");
  const totalArea =
    panels.reduce(
      (sum, p) => sum + ((p.width_mm ?? 0) / 1000) * ((p.length_mm ?? 0) / 1000) * Number(p.quantity ?? 1),
      0,
    ) || 0;

  if (project.isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">Carregando projeto…</p>;
  }
  if (!project.data) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Projeto não encontrado.</p>
        <Link to="/projects" className="mt-4 inline-block text-sm font-medium text-primary">
          Voltar para projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Projetos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{project.data.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project.data.client_name || "Sem cliente"} · {project.data.environment || "Ambiente não informado"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusTone(project.data.status)}>{statusLabel(project.data.status)}</Badge>
          <Select value={project.data.status ?? "novo"} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="h-11 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Importação inteligente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Envie a exportação <strong>XML</strong> do Promob para gerar módulos, peças, chapas e ferragens.
            Arquivos PDF e DXF são anexados ao projeto para conferência visual.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".xml,.pdf,.dxf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
          <Button className="h-12 w-full md:w-auto" disabled={importing} onClick={() => fileInput.current?.click()}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar arquivo do projeto
          </Button>

          {warnings.length > 0 && (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              {warnings.map((warning) => (
                <p key={warning} className="flex gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {warning}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Boxes} label="Módulos" value={String(modules.data?.length ?? 0)} />
        <Metric icon={Layers} label="Peças / chapas" value={String(panels.length)} />
        <Metric icon={Wrench} label="Ferragens" value={String(hardware.length)} />
        <Metric icon={FileText} label="Área de chapa (m²)" value={totalArea.toFixed(2)} />
      </div>

      <Tabs defaultValue="modules">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:grid-cols-none md:inline-flex">
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="parts">Peças</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          <Card>
            <CardContent className="p-0">
              <Accordion type="multiple" className="w-full">
                {(modules.data ?? []).map((m) => (
                  <AccordionItem key={m.id} value={m.id} className="border-b px-4 py-1 last:border-0">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={m.is_completed ?? false}
                        onCheckedChange={async (checked) => {
                          const { error } = await supabase
                            .from("modules")
                            .update({ is_completed: !!checked })
                            .eq("id", m.id);
                          if (error) toast.error(error.message);
                          else void queryClient.invalidateQueries({ queryKey: ["modules", projectId] });
                        }}
                      />
                      <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                        <div className="flex flex-1 items-center justify-between pr-4 text-left">
                          <div>
                            <p className={`font-medium ${m.is_completed ? "text-muted-foreground line-through" : ""}`}>
                              {m.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.environment || "Ambiente não informado"} · {m.width_mm ?? "?"} × {m.height_mm ?? "?"} ×{" "}
                              {m.depth_mm ?? "?"} mm
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {m.quantity} un
                          </Badge>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="pb-4 pt-0">
                      <div className="rounded-lg border bg-muted/30">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="h-9 text-xs">Peça</TableHead>
                              <TableHead className="h-9 text-xs text-right">Dimensões</TableHead>
                              <TableHead className="h-9 text-xs text-right">Qtd</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allParts
                              .filter((p) => p.module_id === m.id)
                              .map((p) => (
                                <TableRow key={p.id} className="hover:bg-transparent">
                                  <TableCell className="py-2 text-xs font-medium">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={p.is_completed ?? false}
                                        className="h-3.5 w-3.5"
                                        onCheckedChange={async (checked) => {
                                          const { error } = await supabase
                                            .from("parts")
                                            .update({ is_completed: !!checked })
                                            .eq("id", p.id);
                                          if (error) toast.error(error.message);
                                          else void queryClient.invalidateQueries({ queryKey: ["parts", projectId] });
                                        }}
                                      />
                                      <span className={p.is_completed ? "text-muted-foreground line-through" : ""}>
                                        {p.name}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-right text-xs text-muted-foreground">
                                    {p.width_mm ?? "?"} × {p.length_mm ?? "?"}
                                  </TableCell>
                                  <TableCell className="py-2 text-right text-xs">
                                    {p.quantity} {p.unit}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {allParts.filter((p) => p.module_id === m.id).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="py-4 text-center text-xs text-muted-foreground">
                                  Nenhuma peça vinculada.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
                {(modules.data?.length ?? 0) === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nada por aqui ainda. Importe um arquivo do Promob.
                  </div>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Esp.</TableHead>
                    <TableHead>Larg. × Comp.</TableHead>
                    <TableHead>Fita</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allParts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="capitalize">{p.kind}</TableCell>
                      <TableCell>{p.material || "—"}</TableCell>
                      <TableCell>{p.thickness_mm ?? "—"}</TableCell>
                      <TableCell>
                        {p.width_mm ?? "?"} × {p.length_mm ?? "?"}
                      </TableCell>
                      <TableCell>{p.edge_banding || "—"}</TableCell>
                      <TableCell className="text-right">
                        {p.quantity} {p.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allParts.length === 0 && <EmptyRow colSpan={7} />}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardContent className="divide-y p-0">
              {(files.data ?? []).map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.file_type?.toUpperCase()} · {Math.round(Number(f.size_bytes ?? 0) / 1024)} KB
                    </p>
                  </div>
                  <Badge variant="secondary">Importado</Badge>
                </div>
              ))}
              {(files.data?.length ?? 0) === 0 && (
                <p className="p-6 text-sm text-muted-foreground">Nenhum arquivo importado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        Nada por aqui ainda. Importe um arquivo do Promob.
      </TableCell>
    </TableRow>
  );
}
