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
  Download,
  Factory,
  MessageSquare,
  Clock,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { Parser } from "@json2csv/plainjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [filterType, setFilterType] = useState<string>("all");
  const [searchPart, setSearchPart] = useState("");

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, environment, status, notes, created_at, company_id")
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
          parts: result.modules.reduce((total, m) => total + m.parts.length, 0) + result.looseParts.length,
          looseParts: result.looseParts.length,
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

      if (result.looseParts.length > 0) {
        await supabase.from("parts").insert(
          result.looseParts.map((part) => ({
            project_id: projectId,
            module_id: null, // Itens sem módulo
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

  const exportCSV = () => {
    try {
      const dataToExport = allParts.map((p) => {
        const moduleName = p.module_id 
          ? (modules.data?.find((m) => m.id === p.module_id)?.name || "Módulo não encontrado")
          : "Itens sem módulo";
        return {
          "Módulo": moduleName,
          "Nome": p.name,
          "Tipo": p.kind,
          "Material": p.material || "-",
          "Espessura (mm)": p.thickness_mm ?? "Não confirmado (NÃO USAR PARA FABRICAÇÃO)",
          "Largura (mm)": p.width_mm ?? "Não confirmado (NÃO USAR PARA FABRICAÇÃO)",
          "Comprimento (mm)": p.length_mm ?? "Não confirmado (NÃO USAR PARA FABRICAÇÃO)",
          "Quantidade": p.quantity,
          "Unidade": p.unit || "un",
          "Fita de Borda": p.edge_banding || "-",
          "Status": p.is_completed ? "Concluído" : "Pendente"
        };
      });

      if (dataToExport.length === 0) {
        toast.error("Nenhuma peça para exportar.");
        return;
      }

      const parser = new Parser();
      const csv = parser.parse(dataToExport);

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lista-tecnica-${project.data?.name || "projeto"}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Lista técnica exportada.");
    } catch (err) {
      console.error("Erro na exportação:", err);
      toast.error("Erro ao exportar CSV.");
    }
  };

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
          <h1 className="text-2xl font-bold md:text-3xl">{project.data?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project.data?.client_name || "Sem cliente"} · {project.data?.environment || "Ambiente não informado"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusTone(project.data?.status || "novo")}>{statusLabel(project.data?.status || "novo")}</Badge>
          <Select 
            value={project.data?.status ?? "novo"} 
            onValueChange={(v) => {
              if (v === "producao" && allParts.some(p => (!p.width_mm || !p.length_mm) && p.kind !== 'ferragem' && p.kind !== 'acessorio' && !p.name.toLowerCase().includes("processo"))) {
                toast.error("Bloqueio: Existem peças sem medida confirmada. Não é possível liberar para produção.");
                return;
              }
              updateStatus.mutate(v);
            }}
          >
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
          <Button variant="outline" size="icon" className="h-11 w-11" onClick={exportCSV} title="Exportar CSV">
            <Download className="h-4 w-4" />
          </Button>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Boxes} label="Módulos" value={String(modules.data?.length ?? 0)} />
        <Metric icon={Layers} label="Peças / chapas" value={String(panels.length)} />
        <Metric icon={Wrench} label="Ferragens / Acessórios" value={String(hardware.length)} />
        <Metric icon={AlertTriangle} label="Itens sem módulo" value={String(allParts.filter(p => !p.module_id).length)} />
        <Metric icon={FileText} label="Área de chapa (m²)" value={totalArea.toFixed(2)} />
      </div>

      <Tabs defaultValue="modules">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0 md:w-auto md:flex-nowrap">
          <TabsTrigger value="modules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Módulos</TabsTrigger>
          <TabsTrigger value="parts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lista Técnica</TabsTrigger>
          <TabsTrigger value="loose" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Itens sem Módulo</TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Auditoria Técnica</TabsTrigger>
          <TabsTrigger value="production" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Produção / Fábrica</TabsTrigger>
          <TabsTrigger value="maintenance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Assistência</TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Arquivos</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-6">
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

        <TabsContent value="parts" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Listagem Completa de Itens</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Buscar peça..."
                  className="h-9 w-full sm:w-48"
                  value={searchPart}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchPart(e.target.value)}
                />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9 w-full sm:w-36">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="peca">Peças</SelectItem>
                    <SelectItem value="ferragem">Ferragens</SelectItem>
                    <SelectItem value="acessorio">Acessórios</SelectItem>
                    <SelectItem value="chapa">Chapas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Item</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Esp.</TableHead>
                    <TableHead>Larg. × Comp. (mm)</TableHead>
                    <TableHead>Fita</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allParts
                    .filter((p) => {
                      const matchesType = filterType === "all" || p.kind === filterType;
                      const matchesSearch = p.name.toLowerCase().includes(searchPart.toLowerCase());
                      return matchesType && matchesSearch;
                    })
                    .map((p) => (
                      <TableRow key={p.id} className={p.is_completed ? "bg-muted/20" : ""}>
                        <TableCell className="font-medium">
                          <span className={p.is_completed ? "text-muted-foreground line-through" : ""}>{p.name}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.module_id ? modules.data?.find(m => m.id === p.module_id)?.name : "—"}
                        </TableCell>
                        <TableCell className="capitalize">
                          <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wider">
                            {p.kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{p.material || "—"}</TableCell>
                        <TableCell className="text-xs">{p.thickness_mm ?? "Não confirmado"}</TableCell>
                        <TableCell className="text-xs">
                          {p.width_mm ?? "Não confirmado"} × {p.length_mm ?? "Não confirmado"}
                        </TableCell>
                        <TableCell className="text-xs">{p.edge_banding || "—"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {p.quantity} {p.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  {allParts.length === 0 && <EmptyRow colSpan={8} />}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loose" className="mt-6">
          <Card className="border-amber-200/50 dark:border-amber-900/30">
            <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Acessórios Avulsos / Itens sem Módulo
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allParts.filter(p => !p.module_id).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="capitalize">{p.kind}</TableCell>
                      <TableCell className="text-xs">{p.material || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{p.quantity} {p.unit}</TableCell>
                    </TableRow>
                  ))}
                  {allParts.filter(p => !p.module_id).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum item avulso identificado neste projeto.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Auditoria de Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Módulos no XML</p>
                  <p className="mt-1 text-2xl font-bold">{modules.data?.length ?? 0}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Peças/Ferragens Totais</p>
                  <p className="mt-1 text-2xl font-bold">{allParts.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Itens sem Módulo</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{allParts.filter(p => !p.module_id).length}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Integridade de Medidas</h3>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Peças sem medida confirmada</TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                          {allParts.filter(p => !p.width_mm || !p.length_mm).length}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Ferragens sem dimensões</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {hardware.filter(p => !p.width_mm).length}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * Peças sem medida são marcadas como "Não confirmado" e não devem ser enviadas para fabricação sem conferência manual.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Classificação de Itens</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Peças</p>
                    <p className="font-bold">{allParts.filter(p => p.kind === 'peca').length}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Chapas</p>
                    <p className="font-bold">{allParts.filter(p => p.kind === 'chapa').length}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Ferragens</p>
                    <p className="font-bold">{allParts.filter(p => p.kind === 'ferragem').length}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Acessórios</p>
                    <p className="font-bold">{allParts.filter(p => p.kind === 'acessorio').length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Ordem de Produção</CardTitle>
                  <p className="text-sm text-muted-foreground">Detalhamento para a fábrica e montagem</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Versão XML</p>
                  <p className="text-sm font-bold">{files.data?.[0]?.file_name || "v1.0"}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h3 className="mb-3 font-semibold text-sm flex items-center gap-2">
                      <Factory className="h-4 w-4" /> Caderno de Fábrica
                    </h3>
                    <ul className="space-y-2 text-xs">
                      <li className="flex justify-between border-b pb-1">
                        <span>Peças Fabricáveis:</span>
                        <span className="font-bold">{allParts.filter(p => p.width_mm && p.length_mm && !p.name.toLowerCase().includes("processo")).length} un</span>
                      </li>
                      <li className="flex justify-between border-b pb-1">
                        <span>Corte por Material:</span>
                        <span className="font-bold">{Array.from(new Set(allParts.map(p => p.material))).filter(Boolean).length} tipos</span>
                      </li>
                      <li className="flex justify-between border-b pb-1">
                        <span>Ferragens Totais:</span>
                        <span className="font-bold">{hardware.length} un</span>
                      </li>
                    </ul>
                    <Button variant="outline" className="mt-4 w-full h-9 text-xs" onClick={exportCSV}>
                      Gerar Lista de Corte (CSV)
                    </Button>
                  </div>

                  <div className="rounded-lg border bg-primary/5 p-4">
                    <h3 className="mb-3 font-semibold text-sm flex items-center gap-2 text-primary">
                      <Wrench className="h-4 w-4" /> Guia do Montador
                    </h3>
                    <ul className="space-y-2 text-xs">
                      <li className="flex justify-between border-b pb-1">
                        <span>Módulos no Ambiente:</span>
                        <span className="font-bold">{modules.data?.length ?? 0} un</span>
                      </li>
                      <li className="flex justify-between border-b pb-1">
                        <span>Itens Avulsos/Acessórios:</span>
                        <span className="font-bold">{allParts.filter(p => !p.module_id).length} un</span>
                      </li>
                    </ul>
                    <Button asChild className="mt-4 w-full h-9 text-xs">
                      <Link to="/assembly">Abrir Visualização Mobile</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Pontos de Atenção (Bloqueios)
                  </h4>
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-700">
                    <li>• Itens sem furação confirmada dependem de conferência visual nos anexos (PDF/DXF).</li>
                    <li>• Conferir cota de rodapé e tamponamento in loco antes da montagem final.</li>
                    <li>• Peças marcadas como "Não confirmado" estão bloqueadas para liberação automática.</li>
                  </ul>
                </div>

                <div className="text-[10px] text-muted-foreground pt-2 border-t flex justify-between">
                  <span>Aprovado em: {new Date().toLocaleDateString('pt-BR')}</span>
                  <span>Responsável: Sistema Monta AI</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceTab projectId={projectId} companyId={project.data?.company_id} allModules={modules.data || []} allParts={allParts} />
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

function MaintenanceTab({ 
  projectId, 
  companyId, 
  allModules, 
  allParts 
}: { 
  projectId: string; 
  companyId?: string; 
  allModules: any[]; 
  allParts: any[] 
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [type, setType] = useState("defeito");
  const [urgency, setUrgency] = useState("baixa");
  const [selectedModule, setSelectedModule] = useState<string>("none");
  const [selectedPart, setSelectedPart] = useState<string>("none");
  const [deadline, setDeadline] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["maintenance_requests", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(`
          *,
          maintenance_history (
            *
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Não autorizado.");

      const { error } = await supabase
        .from("maintenance_requests")
        .insert({
          project_id: projectId,
          company_id: companyId,
          created_by: user.id,
          description,
          type: type as any,
          urgency: urgency as any,
          module_id: selectedModule === "none" ? null : selectedModule,
          part_id: selectedPart === "none" ? null : selectedPart,
          status: "aberto"
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado de assistência aberto.");
      setIsAdding(false);
      setDescription("");
      void queryClient.invalidateQueries({ queryKey: ["maintenance_requests", projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da assistência atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["maintenance_requests", projectId] });
    },
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando assistências...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Chamados de Assistência</h2>
          <p className="text-sm text-muted-foreground">Gerencie problemas técnicos e reposições.</p>
        </div>
        <Sheet open={isAdding} onOpenChange={setIsAdding}>
          <SheetTrigger asChild>
            <Button className="h-10">
              <MessageSquare className="mr-2 h-4 w-4" /> Novo Chamado
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Abrir Assistência Técnica</SheetTitle>
              <SheetDescription>Descreva o problema encontrado no projeto.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Ocorrência</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defeito">Defeito de Fábrica</SelectItem>
                    <SelectItem value="dano_transporte">Dano no Transporte</SelectItem>
                    <SelectItem value="erro_projeto">Erro de Projeto</SelectItem>
                    <SelectItem value="erro_montagem">Erro de Montagem</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Urgência</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vincular Módulo (Opcional)</Label>
                <Select value={selectedModule} onValueChange={(val) => {
                  setSelectedModule(val);
                  setSelectedPart("none");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {allModules.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModule !== "none" && (
                <div className="space-y-2">
                  <Label>Vincular Peça (Opcional)</Label>
                  <Select value={selectedPart} onValueChange={setSelectedPart}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a peça" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {allParts.filter(p => p.module_id === selectedModule).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição do Problema</Label>
                <Textarea 
                  placeholder="Explique detalhadamente o que aconteceu..." 
                  className="min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Fotos / Evidências</Label>
                <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground">
                  <Camera className="mb-2 h-8 w-8" />
                  <p className="text-xs">Clique para anexar fotos (Em breve)</p>
                </div>
              </div>

              <Button 
                className="w-full h-11" 
                disabled={!description || createRequest.isPending}
                onClick={() => createRequest.mutate()}
              >
                {createRequest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Abrir Chamado"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4">
        {(requests ?? []).map((req) => (
          <Card key={req.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: req.urgency === 'critica' ? '#ef4444' : req.urgency === 'alta' ? '#f97316' : '#3b82f6' }}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{req.type.replace('_', ' ')}</Badge>
                    <Badge className={
                      req.status === 'concluido' ? 'bg-green-500' : 
                      req.status === 'producao' ? 'bg-orange-500' : 
                      'bg-blue-500'
                    }>
                      {req.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h3 className="font-semibold">{req.description}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(req.created_at || '').toLocaleDateString('pt-BR')}</span>
                    {req.module_id && (
                      <span>Módulo: {allModules.find(m => m.id === req.module_id)?.name}</span>
                    )}
                    {req.part_id && (
                      <span>Peça: {allParts.find(p => p.id === req.part_id)?.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <Select value={req.status} onValueChange={(val) => updateStatus.mutate({ id: req.id, status: val })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="producao">Em Produção</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(requests ?? []).length === 0 && (
          <div className="rounded-xl border-2 border-dashed py-12 text-center text-sm text-muted-foreground">
            Nenhuma assistência registrada para este projeto.
          </div>
        )}
      </div>
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
