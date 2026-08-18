import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useMemo } from "react";
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
  HardHat,
  FileUp,
  LayoutGrid,
  ClipboardList,
  PackageCheck,
  History,
  Settings,
  Truck,
  ShieldCheck,
  Scissors,
  ArrowRightLeft,
  CheckSquare,
  type LucideIcon,
  Box,
  Eye,
  Building2,
  Ruler,
} from "lucide-react";
import { Parser } from "@json2csv/plainjs";
import { EngineeringTab } from "@/components/EngineeringTab";
import { SketchUpBridgeTab } from "@/components/SketchUpBridgeTab";
import { PilotValidationChecklist } from "@/components/PilotValidationChecklist";
import { BudgetTab } from "@/components/project/BudgetTab";
import { PreliminaryCutPlanTab } from "@/components/project/PreliminaryCutPlanTab";
import { VisualEstimateTab } from "@/components/project/VisualEstimateTab";
import { AuditIntegrationTab } from "@/components/project/AuditIntegrationTab";
import { PhysicalChecklistFlow } from "@/components/PhysicalChecklistFlow";
import { Technical3DView } from "@/components/project/Technical3DView";
import { Operational3DView } from "@/components/project/Operational3DView";
import { VisualFeedingMode } from "@/components/project/VisualFeedingMode";
import { parseDXF } from "@/lib/dxf-parser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { MaintenancePhoto } from "@/components/MaintenancePhoto";
import { supabase } from "@/integrations/supabase/client";
import { Constants, type Enums, type Tables } from "@/integrations/supabase/types";
import { ProjectShippingTab } from "@/components/ProjectShippingTab";
import { parsePromobXML } from "@/lib/promob-import";
import { projectStatuses, statusLabel, statusTone } from "@/lib/project-status";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Detalhes do projeto | Monta AI — Piloto Controlado" },
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
  return <ProjectDetail />;
}

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const search = Route.useSearch() as { tab?: string };
  const [activeTab, setActiveTab] = useState(search.tab || "modules");
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [warnings] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchPart, setSearchPart] = useState("");

  const distribution = useQuery({
    queryKey: ["project_distribution", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_distribution" as any)
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, client_name, environment, status, operational_status, notes, created_at, company_id, cutting_status, machining_status, is_cutting_edge_released, machining_blocked, is_validated",
        )
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
        .select(
          "id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed, data_source",
        )
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
        .select(
          "id, module_id, kind, name, material, thickness_mm, width_mm, length_mm, quantity, unit, edge_banding, is_completed, data_source, visibility_type, cutting_edge_released, machining_blocked, metadata",
        )
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
        .select(
          "id, file_name, file_type, size_bytes, summary, storage_path, storage_status, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const projectFiles = files.data ?? [];
  
  const dxfContent = useQuery({
    queryKey: ["dxf_content", projectId],
    queryFn: async () => {
      const dxfFile = projectFiles.find(f => f.file_type === 'dxf_conferencia' && f.storage_status === 'stored');
      if (!dxfFile?.storage_path) return null;
      
      const { data, error } = await supabase.storage
        .from("project-files")
        .download(dxfFile.storage_path);
        
      if (error) throw error;
      return await data.text();
    },
    enabled: projectFiles.some(f => f.file_type === 'dxf_conferencia' && f.storage_status === 'stored')
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
    navigate({ to: "/projects/import" });
  };

  const allParts = parts.data ?? [];
  const panels = allParts.filter((p) => p.kind === "peca" || p.kind === "chapa");
  const hardware = allParts.filter((p) => p.kind === "ferragem");
  const accessories = allParts.filter((p) => p.kind === "acessorio");
  const totalArea =
    panels.reduce(
      (sum, p) =>
        sum + ((p.width_mm ?? 0) / 1000) * ((p.length_mm ?? 0) / 1000) * Number(p.quantity ?? 1),
      0,
    ) || 0;
  const latestXml = projectFiles.find(
    (file) =>
      file.file_type?.toLowerCase().includes("xml") ||
      file.file_name.toLowerCase().endsWith(".xml"),
  );
  const latestDxf = projectFiles.find(
    (file) =>
      file.file_type?.toLowerCase().includes("dxf") ||
      file.file_name.toLowerCase().endsWith(".dxf"),
  );
  const hasStoredArtifact = (file: (typeof projectFiles)[number] | undefined) => {
    return file?.storage_status === "stored" && !!file.storage_path;
  };
  const latestDxfStored = hasStoredArtifact(latestDxf);
  const officialCutEvidence = projectFiles.find((file) =>
    /(cut\s?pro|cutplanning)/i.test(`${file.file_type ?? ""} ${file.file_name}`),
  );
  const officialCutStored = hasStoredArtifact(officialCutEvidence);

  const exportCSV = () => {
    try {
      const dataToExport = allParts.map((p) => {
        const moduleName = p.module_id
          ? modules.data?.find((m) => m.id === p.module_id)?.name || "Módulo não encontrado"
          : "Itens sem módulo";
        return {
          Módulo: moduleName,
          Nome: p.name,
          Tipo: p.kind,
          Material: p.material || "-",
          "Espessura (mm)": p.thickness_mm ?? "Não confirmado (NÃO USAR PARA FABRICAÇÃO)",
          "Largura (mm)": p.width_mm ?? "Não confirmado (NÃO USAR PARA FABRICAÇÃO)",
          "Comprimento (mm)": p.length_mm ?? "Não confirmado (NÃO USAR PARA FABRICAÇÃO)",
          Quantidade: p.quantity,
          Unidade: p.unit || "un",
          "Fita de Borda": p.edge_banding || "-",
          Status: p.is_completed ? "Concluído" : "Pendente",
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
    <div className="mx-auto max-w-[1600px] space-y-5 overflow-hidden px-3 py-4 sm:px-5 md:space-y-6 md:px-8 md:py-6">
      <header className="flex flex-col gap-4">
        <Link
          to="/projects"
          className="inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" /> Projetos
        </Link>

        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                Projeto ativo · engenharia
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-md px-2.5 text-[9px] font-black uppercase tracking-wider"
                onClick={async () => {
                  try {
                    const { generateAuditReport } = await import("@/lib/audit-report.functions");
                    const result = await generateAuditReport({ data: { projectId: projectId } });
                    if (result.success) {
                      toast.success("Dossiê consolidado com sucesso!");
                    }
                  } catch (err) {
                    toast.error("Erro ao gerar dossiê.");
                  }
                }}
              >
                <Download className="mr-1.5 h-3 w-3" />
                Dossiê
              </Button>
            </div>
            <h1 className="break-words text-3xl font-black uppercase leading-none tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              {project.data?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge
                className={cn(
                  "rounded-md border-none px-2.5 py-1 text-[9px] font-black uppercase tracking-wider",
                  statusTone(project.data?.status || "novo"),
                )}
              >
                {statusLabel(project.data?.status || "novo")}
              </Badge>
              <span className="font-semibold text-slate-700">
                {project.data?.client_name || "Cliente não informado"}
              </span>
              <span aria-hidden="true">·</span>
              <span>{project.data?.environment || "Ambiente não informado"}</span>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
            <Select
              value={project.data?.status ?? "novo"}
              disabled={!hasPermission(role, "projects", "approve")}
              onValueChange={async (v) => {
                const currentStatus = (project.data?.status ??
                  "novo") as (typeof projectStatuses)[number];
                const targetStatus = v as (typeof projectStatuses)[number];
                const currentIndex = projectStatuses.indexOf(currentStatus);
                const targetIndex = projectStatuses.indexOf(targetStatus);
                if (targetIndex !== currentIndex && targetIndex !== currentIndex + 1) {
                  toast.error("Transição inválida: avance o projeto uma etapa por vez.");
                  return;
                }
                /* Bloqueios temporariamente desativados conforme orientação do usuário para o Piloto */
                if (["corte", "borda", "usinagem"].includes(v)) {
                  const unconfirmedParts = allParts.filter(
                    (p) =>
                      (!p.width_mm || !p.length_mm || !p.thickness_mm || !p.material) &&
                      p.kind !== "ferragem" &&
                      p.kind !== "acessorio" &&
                      !p.name.toLowerCase().includes("processo") &&
                      p.visibility_type !== "oculta",
                  );

                  if (unconfirmedParts.length > 0) {
                    toast.warning(
                      `Aviso: ${unconfirmedParts.length} peça(s) possuem dados incompletos, mas a produção seguirá conforme modo Piloto.`,
                    );
                  }
                }

                const oldStatus = project.data?.status || "novo";
                updateStatus.mutate(v, {
                  onSuccess: async () => {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from("production_logs").insert({
                        project_id: projectId,
                        user_id: user.id,
                        action: `Alteração de status do projeto: ${v}`,
                        status_from: oldStatus,
                        status_to: v,
                        notes: "Alteração via seletor de status principal",
                      });
                    }
                  },
                });
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-md border-slate-800 bg-slate-900 text-[10px] font-black uppercase tracking-wider text-white sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectStatuses.map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    className="text-[10px] font-black uppercase tracking-wider"
                  >
                    {statusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-10 rounded-md px-4 text-[10px] font-black uppercase tracking-wider"
              onClick={exportCSV}
            >
              <Download className="mr-2 h-4 w-4 text-blue-600" /> Exportar lista CSV
            </Button>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white sm:px-5">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
            Autoridades e arquivos da revisão
            <Badge className="rounded-sm border border-emerald-700 bg-emerald-900 text-[8px] uppercase text-emerald-300">
              Modo Piloto: CNC Liberado
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
            <SourceAuthority
              label="Autoridade dimensional"
              title="XML Promob"
              detail={latestXml?.file_name || "XML Pendente (Ingestão em Modo Piloto)"}
              ok={!!latestXml}
            />
            <SourceAuthority
              label="Referência de revisão"
              title={latestXml ? "Revisão não informada" : "Sem revisão identificável"}
              detail={
                latestXml
                  ? `XML de ${new Date(latestXml.created_at).toLocaleDateString("pt-BR")} · ID ${latestXml.id.slice(0, 8)}`
                  : "Importe o XML para estabelecer identidade e revisão"
              }
              ok={!!latestXml}
            />
            <SourceAuthority
              label="Conferência geométrica"
              title="DXF de conferência"
              detail={
                latestDxf
                  ? latestDxfStored
                    ? latestDxf.file_name
                    : `${latestDxf.file_name} · metadado local, artefato não armazenado`
                  : "DXF ausente: conferência pendente"
              }
              ok={latestDxfStored}
            />
            <SourceAuthority
              label="Nesting oficial"
              title="CutPlanning / Cut Pro"
              detail={
                officialCutEvidence
                  ? officialCutStored
                    ? officialCutEvidence.file_name
                    : `${officialCutEvidence.file_name} · artefato não armazenado`
                  : "Saída oficial pendente (Modo Piloto)"
              }
              ok={officialCutStored}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black uppercase tracking-wide">
                XML é a autoridade de peças e medidas
              </p>
              <p className="mt-0.5 text-amber-800">
                DXF é conferência geométrica. Pré-plano local em Modo Piloto permite testes 
                físicos na fábrica.
              </p>
            </div>
            <Button
              className="h-9 shrink-0 rounded-md bg-blue-600 px-4 text-[10px] font-black uppercase tracking-wider hover:bg-blue-700"
              disabled={importing}
              onClick={() => fileInput.current?.click()}
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              Nova importação
            </Button>
          </div>
          <div className="grid gap-4">
            <PilotValidationChecklist
              projectId={projectId}
              isMachiningBlocked={project.data?.machining_blocked ?? true}
              projectFiles={files.data || []}
            />

            <div>
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
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-900">
                  Alertas de Integridade Técnica
                </h4>
              </div>
              <div className="grid gap-3">
                {warnings.map((warning) => (
                  <p
                    key={warning}
                    className="text-xs font-bold text-red-700 uppercase tracking-widest leading-relaxed pl-9 border-l-2 border-red-200"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Central Visual de Distribuição 4.0 */}
      <ProjectDistributionFlow distribution={distribution.data || []} project={project.data} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <ProjectMetric
          icon={LayoutGrid}
          label="Módulos"
          value={String(modules.data?.length ?? 0)}
          color="text-blue-600"
        />
        <ProjectMetric
          icon={Layers}
          label="Peças / Chapas"
          value={String(panels.length)}
          color="text-violet-600"
        />
        <ProjectMetric
          icon={Wrench}
          label="Ferragens"
          value={String(hardware.length)}
          color="text-emerald-600"
        />
        <ProjectMetric
          icon={Building2}
          label="Acessórios"
          value={String(accessories.length)}
          color="text-amber-600"
        />
        <ProjectMetric
          icon={ShieldCheck}
          label="Engenharia"
          value={
            allParts.some((p) => p.machining_blocked && (p.kind === "peca" || p.kind === "chapa"))
              ? "BLOQUEADO"
              : "LIBERADO"
          }
          color={
            allParts.some((p) => p.machining_blocked && (p.kind === "peca" || p.kind === "chapa"))
              ? "text-red-600"
              : "text-emerald-600"
          }
        />
        <ProjectMetric
          icon={Scissors}
          label="Área (m²)"
          value={totalArea.toFixed(2)}
          color="text-slate-600"
        />
      </div>

      <Tabs defaultValue="modules" className="min-w-0 space-y-4">
        <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-slate-200 bg-slate-100 [scrollbar-width:thin]">
          <TabsList className="flex h-12 w-max min-w-full justify-start rounded-none bg-transparent p-1">
            <TabTrigger value="modules" icon={LayoutGrid} label="Módulos" />
            <TabTrigger value="visual-intake" icon={Eye} label="Alimentação Visual" />
            <TabTrigger value="operational3d" icon={Box} label="Ambiente 3D" />
            <TabTrigger value="technical3d" icon={Box} label="Gêmeo DXF" />
            <TabTrigger value="parts" icon={ClipboardList} label="Lista Técnica" />
            <TabTrigger value="commercial" icon={FileText} label="Comercial" />
            <TabTrigger value="budget" icon={Building2} label="Inventário XML" />
            <TabTrigger value="cutplan" icon={Scissors} label="Plano de Corte" />
            <TabTrigger value="engineering" icon={Settings} label="Usinagem" />
            <TabTrigger value="sketchup" icon={ArrowRightLeft} label="Ponte SKP" />
            <TabTrigger value="shipping" icon={Truck} label="Logística" />
            <TabTrigger value="maintenance" icon={HardHat} label="Assistência" />
            <TabTrigger value="audit" icon={History} label="Auditoria" />
            <TabTrigger value="validation" icon={ShieldCheck} label="Checklist Piloto" />
            <TabTrigger value="physical-pilot" icon={Boxes} label="Teste Físico (Fábrica)" />
            <TabTrigger value="integration_audit" icon={CheckSquare} label="Motores IA" />
            <TabTrigger value="files" icon={FileUp} label="Arquivos" />
          </TabsList>
        </div>


        <TabsContent value="visual-intake" className="mt-6">
          <VisualFeedingMode 
            projectId={projectId} 
            projectName={project.data?.name}
          />
        </TabsContent>

        <TabsContent value="operational3d" className="mt-6">
          <Operational3DView 
            projectId={projectId}
            modules={modules.data || []}
            parts={allParts}
          />
        </TabsContent>

        <TabsContent value="technical3d" className="mt-6">
          <Technical3DView 
            geometries={dxfContent.data ? parseDXF(dxfContent.data) : []} 
            projectName={project.data?.name}
          />
        </TabsContent>

        <TabsContent value="modules" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Accordion type="multiple" className="w-full">
                {(modules.data ?? []).map((m) => (
                  <AccordionItem
                    key={m.id}
                    value={m.id}
                    className="border-b px-4 py-1 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={m.is_completed ?? false}
                        onCheckedChange={async (checked) => {
                          const { error } = await supabase
                            .from("modules")
                            .update({ is_completed: !!checked })
                            .eq("id", m.id);
                          if (error) toast.error(error.message);
                          else
                            void queryClient.invalidateQueries({
                              queryKey: ["modules", projectId],
                            });
                        }}
                      />
                      <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                        <div className="flex flex-1 items-center justify-between pr-4 text-left">
                          <div>
                            <p
                              className={`font-medium ${m.is_completed ? "text-muted-foreground line-through" : ""}`}
                            >
                              {m.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.environment || "Ambiente não informado"} · {m.width_mm ?? "?"} ×{" "}
                              {m.height_mm ?? "?"} × {m.depth_mm ?? "?"} mm
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {m.quantity} un
                          </Badge>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="pb-4 pt-0">
                      <div className="max-w-full overflow-x-auto rounded-lg border bg-muted/30 [scrollbar-width:thin]">
                        <Table className="min-w-[520px]">
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
                                          else
                                            void queryClient.invalidateQueries({
                                              queryKey: ["parts", projectId],
                                            });
                                        }}
                                      />
                                      <span
                                        className={
                                          p.is_completed ? "text-muted-foreground line-through" : ""
                                        }
                                      >
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
                                <TableCell
                                  colSpan={3}
                                  className="py-4 text-center text-xs text-muted-foreground"
                                >
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchPart(e.target.value)
                  }
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
            <CardContent className="max-w-full overflow-x-auto p-0 [scrollbar-width:thin]">
              <Table className="min-w-[900px]">
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
                          <span
                            className={p.is_completed ? "text-muted-foreground line-through" : ""}
                          >
                            {p.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.module_id
                            ? modules.data?.find((m) => m.id === p.module_id)?.name
                            : "—"}
                        </TableCell>
                        <TableCell className="capitalize">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal uppercase tracking-wider"
                          >
                            {p.kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{p.material || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {p.thickness_mm ?? "Não confirmado"}
                        </TableCell>
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
            <CardContent className="max-w-full overflow-x-auto p-0 [scrollbar-width:thin]">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allParts
                    .filter((p) => !p.module_id)
                    .map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="capitalize">{p.kind}</TableCell>
                        <TableCell className="text-xs">{p.material || "—"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {p.quantity} {p.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  {allParts.filter((p) => !p.module_id).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
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
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Módulos no XML
                  </p>
                  <p className="mt-1 text-2xl font-bold">{modules.data?.length ?? 0}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Peças/Ferragens Totais
                  </p>
                  <p className="mt-1 text-2xl font-bold">{allParts.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Itens sem Módulo
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">
                    {allParts.filter((p) => !p.module_id).length}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Integridade de Medidas</h3>
                <div className="max-w-full overflow-x-auto rounded-lg border [scrollbar-width:thin]">
                  <Table className="min-w-[420px]">
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Peças sem medida confirmada</TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                          {allParts.filter((p) => !p.width_mm || !p.length_mm).length}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Ferragens sem dimensões</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {hardware.filter((p) => !p.width_mm).length}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * Peças sem medida são marcadas como "Não confirmado" e não devem ser enviadas
                  para fabricação sem conferência manual.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Classificação de Itens</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Peças</p>
                    <p className="font-bold">{allParts.filter((p) => p.kind === "peca").length}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Chapas</p>
                    <p className="font-bold">{allParts.filter((p) => p.kind === "chapa").length}</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Ferragens</p>
                    <p className="font-bold">
                      {allParts.filter((p) => p.kind === "ferragem").length}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Acessórios</p>
                    <p className="font-bold">
                      {allParts.filter((p) => p.kind === "acessorio").length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commercial" className="mt-6">
          <BudgetTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="cutplan" className="mt-6">
          <PreliminaryCutPlanTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="engineering" className="mt-6">
          <EngineeringTab
            projectId={projectId}
            parts={allParts as Tables<"parts">[]}
            isValidated={project.data?.is_validated}
          />
        </TabsContent>

        <TabsContent value="sketchup" className="mt-6">
          <SketchUpBridgeTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="validation" className="mt-6">
          <PilotValidationChecklist
            projectId={projectId}
            isMachiningBlocked={!!allParts.some((p) => p.machining_blocked)}
            projectFiles={files.data || []}
          />
        </TabsContent>

        <TabsContent value="physical-pilot" className="mt-6">
          <PhysicalChecklistFlow projectId={projectId} />
        </TabsContent>

        <TabsContent value="integration_audit" className="mt-6">
          <AuditIntegrationTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="production" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Ordem de Produção</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Detalhamento para a fábrica e montagem
                  </p>
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
                        <span className="font-bold">
                          {
                            allParts.filter(
                              (p) =>
                                p.width_mm &&
                                p.length_mm &&
                                !p.name.toLowerCase().includes("processo"),
                            ).length
                          }{" "}
                          un
                        </span>
                      </li>
                      <li className="flex justify-between border-b pb-1">
                        <span>Corte por Material:</span>
                        <span className="font-bold">
                          {
                            Array.from(new Set(allParts.map((p) => p.material))).filter(Boolean)
                              .length
                          }{" "}
                          tipos
                        </span>
                      </li>
                      <li className="flex justify-between border-b pb-1">
                        <span>Ferragens Totais:</span>
                        <span className="font-bold">{hardware.length} un</span>
                      </li>
                    </ul>
                    <Button
                      variant="outline"
                      className="mt-4 w-full h-9 text-xs"
                      onClick={exportCSV}
                    >
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
                        <span className="font-bold">
                          {allParts.filter((p) => !p.module_id).length} un
                        </span>
                      </li>
                    </ul>
                    <Button asChild className="mt-4 w-full h-9 text-xs">
                      <Link to="/assembly">Abrir Visualização Mobile</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Controle de Liberação Parcial
                    (Rastreabilidade 4.0)
                  </h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">1. CORTE E BORDA</Label>
                        <Badge
                          className={
                            project.data?.is_cutting_edge_released ? "bg-green-500" : "bg-amber-500"
                          }
                        >
                          {project.data?.is_cutting_edge_released ? "LIBERADO" : "PENDENTE"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-amber-700 leading-tight">
                        “Corte e borda aprovados com base no XML, ListaCorte, PreviewCorte e DXF de
                        nesting.”
                      </p>
                      <Button
                        size="sm"
                        variant={project.data?.is_cutting_edge_released ? "outline" : "default"}
                        className="w-full h-8 text-[10px]"
                        disabled={!!project.data?.is_cutting_edge_released}
                        onClick={async () => {
                          const { error } = await supabase
                            .from("projects")
                            .update({
                              is_cutting_edge_released: true,
                              cutting_status: "liberado",
                              updated_at: new Date().toISOString(),
                            })
                            .eq("id", projectId);

                          if (error) toast.error(error.message);
                          else {
                            toast.success("Corte e Borda liberados com sucesso.");
                            const {
                              data: { user },
                            } = await supabase.auth.getUser();
                            if (user) {
                              await supabase.from("production_logs").insert({
                                project_id: projectId,
                                user_id: user.id,
                                action: "LIBERAÇÃO PARCIAL: Corte e Borda",
                                notes:
                                  "Aprovado via painel de OP com base em XML/ListaCorte/DXF Nesting",
                              });
                            }
                            void queryClient.invalidateQueries({
                              queryKey: ["project", projectId],
                            });
                          }
                        }}
                      >
                        {project.data?.is_cutting_edge_released
                          ? "Corte/Borda já Liberados"
                          : "Liberar Corte e Borda"}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">2. USINAGEM E MONTAGEM</Label>
                        <Badge variant="destructive" className="animate-pulse">
                          BLOQUEADO
                        </Badge>
                      </div>
                      <p className="text-[10px] text-destructive leading-tight font-medium">
                        “Furação e usinagem não confirmadas — DXF técnico individual ou arquivo CNC
                        necessário.”
                      </p>
                      <div className="rounded border border-destructive/20 bg-destructive/5 p-2 text-[9px] text-destructive italic">
                        Usinagem automatizada suspensa. Não deduzir posições de furos. Liberação
                        final de montagem bloqueada até validação técnica.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground pt-2 border-t flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Aprovado em: {new Date().toLocaleDateString("pt-BR")}</span>
                    <span>Responsável: Sistema Monta AI</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-1 rounded px-2">
                    <span className="font-medium">Rastreabilidade 4.0:</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[8px] h-4">
                        ID Único Ativo
                      </Badge>
                      <Badge variant="outline" className="text-[8px] h-4">
                        Logs em Tempo Real
                      </Badge>
                      <Badge variant="outline" className="text-[8px] h-4">
                        Integridade XML
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sketchup" className="mt-6">
          <SketchUpBridgeTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="shipping" className="mt-6">
          <ProjectShippingTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceTab
            projectId={projectId}
            companyId={project.data?.company_id}
            allModules={modules.data || []}
            allParts={allParts}
            canCreate={role === "admin" || role === "escritorio" || role === "montador"}
            canTreat={role === "admin" || role === "escritorio"}
          />
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardContent className="divide-y p-0">
              {(files.data ?? []).map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.file_type?.toUpperCase()} · {Math.round(Number(f.size_bytes ?? 0) / 1024)}{" "}
                      KB
                    </p>
                  </div>
                  {f.storage_status === "stored" && f.storage_path ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { data: signedFile, error } = await supabase.storage
                          .from("project-files")
                          .createSignedUrl(f.storage_path!, 60);
                        if (error) toast.error(error.message);
                        else window.open(signedFile.signedUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      Abrir arquivo
                    </Button>
                  ) : (
                    <Badge variant="secondary">Metadado legado</Badge>
                  )}
                </div>
              ))}
              {(files.data?.length ?? 0) === 0 && (
                <p className="p-6 text-sm text-muted-foreground">Nenhum arquivo importado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <BudgetTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="cutting_beta" className="mt-6">
          <PreliminaryCutPlanTab projectId={projectId} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

function MaintenanceTab({
  projectId,
  companyId,
  allModules,
  allParts,
  canCreate,
  canTreat,
}: {
  projectId: string;
  companyId?: string;
  allModules: Pick<Tables<"modules">, "id" | "name">[];
  allParts: Pick<Tables<"parts">, "id" | "module_id" | "name">[];
  canCreate: boolean;
  canTreat: boolean;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Enums<"maintenance_type">>("defeito");
  const [urgency, setUrgency] = useState<Enums<"maintenance_urgency">>("baixa");
  const [selectedModule, setSelectedModule] = useState<string>("none");
  const [selectedPart, setSelectedPart] = useState<string>("none");
  const [deadline, setDeadline] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["maintenance_requests", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(
          `
          *,
          maintenance_history (
            *
          )
        `,
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !companyId) throw new Error("Não autorizado.");

      const { error } = await supabase.from("maintenance_requests").insert({
        project_id: projectId,
        company_id: companyId,
        created_by: user.id,
        description,
        type,
        urgency,
        module_id: selectedModule === "none" ? null : selectedModule,
        part_id: selectedPart === "none" ? null : selectedPart,
        status: "aberto",
        photos: [],
        deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado de assistência aberto.");
      setIsAdding(false);
      setDescription("");
      setDeadline("");
      void queryClient.invalidateQueries({ queryKey: ["maintenance_requests", projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      oldStatus,
      newStatus,
    }: {
      id: string;
      oldStatus: string;
      newStatus: Enums<"maintenance_status">;
    }) => {
      const { error } = await supabase.rpc("record_maintenance_transition" as any, {
        _request_id: id,
        _new_status: newStatus,
        _notes: `Status alterado de ${oldStatus} para ${newStatus}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da assistência atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["maintenance_requests", projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Carregando assistências...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Chamados de Assistência</h2>
          <p className="text-sm text-muted-foreground">Gerencie problemas técnicos e reposições.</p>
        </div>
        {canCreate && (
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
                  <Select
                    value={type}
                    onValueChange={(value) => {
                      if (isMaintenanceType(value)) setType(value);
                    }}
                  >
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
                  <Select
                    value={urgency}
                    onValueChange={(value) => {
                      if (isMaintenanceUrgency(value)) setUrgency(value);
                    }}
                  >
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
                  <Select
                    value={selectedModule}
                    onValueChange={(val) => {
                      setSelectedModule(val);
                      setSelectedPart("none");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {allModules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
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
                        {allParts
                          .filter((p) => p.module_id === selectedModule)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
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
                  <Label>Prazo de Reposição (Opcional)</Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fotos / Evidências</Label>
                  <div className="flex min-h-28 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 px-4 text-center text-muted-foreground">
                    <Camera className="mb-2 h-8 w-8" />
                    <p className="text-xs font-medium">Upload privado pendente de configuração</p>
                    <p className="mt-1 text-[10px]">
                      Nenhuma foto será publicada ou registrada sem armazenamento privado.
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full h-11"
                  disabled={!description || createRequest.isPending}
                  onClick={() => createRequest.mutate()}
                >
                  {createRequest.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Abrir Chamado"
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="grid gap-4">
        {(requests ?? []).map((req) => (
          <Card
            key={req.id}
            className="overflow-hidden border-l-4"
            style={{
              borderLeftColor:
                req.urgency === "critica"
                  ? "#ef4444"
                  : req.urgency === "alta"
                    ? "#f97316"
                    : "#3b82f6",
            }}
          >
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {req.type.replace("_", " ")}
                    </Badge>
                    <Badge
                      className={
                        req.status === "concluido"
                          ? "bg-green-500"
                          : req.status === "producao"
                            ? "bg-orange-500"
                            : "bg-blue-500"
                      }
                    >
                      {req.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <h3 className="font-semibold">{req.description}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{" "}
                      {new Date(req.created_at || "").toLocaleDateString("pt-BR")}
                    </span>
                    {req.module_id && (
                      <span>Módulo: {allModules.find((m) => m.id === req.module_id)?.name}</span>
                    )}
                    {req.part_id && (
                      <span>Peça: {allParts.find((p) => p.id === req.part_id)?.name}</span>
                    )}
                    {req.deadline && (
                      <span className="text-orange-600 font-medium">
                        Prazo: {new Date(req.deadline).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  {req.photos && req.photos.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {req.photos.map((url: string, i: number) => (
                        <MaintenancePhoto
                          key={`${url}-${i}`}
                          pathOrLegacyUrl={url}
                          alt="Evidência"
                          className="h-12 w-12 shrink-0 rounded border object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {req.maintenance_history && req.maintenance_history.length > 0 && (
                    <div className="mt-2 space-y-1 border-t pt-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        Histórico
                      </p>
                      {req.maintenance_history.slice(0, 3).map((h) => (
                        <p key={h.id} className="text-[10px] text-muted-foreground">
                          {new Date(h.created_at ?? 0).toLocaleDateString("pt-BR")}: {h.notes}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {canTreat && (
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Select
                      value={req.status}
                      onValueChange={(value) => {
                        if (isMaintenanceStatus(value)) {
                          updateStatus.mutate({
                            id: req.id,
                            oldStatus: req.status,
                            newStatus: value,
                          });
                        }
                      }}
                      disabled={req.status === "concluido" || updateStatus.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {req.status === "aberto" && (
                          <SelectItem value="em_analise">Avançar: Em Análise</SelectItem>
                        )}
                        {req.status === "em_analise" && (
                          <SelectItem value="producao">Avançar: Em Produção</SelectItem>
                        )}
                        {req.status === "producao" && (
                          <SelectItem value="enviado">Avançar: Enviado</SelectItem>
                        )}
                        {req.status === "enviado" && (
                          <SelectItem value="concluido">Avançar: Concluído</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

function ProjectDistributionFlow({ distribution, project }: { distribution: any[], project: any }) {
  const steps = [
    { area: 'comercial', label: 'Comercial', icon: FileText, sources: 'Contrato' },
    { area: 'compras', label: 'Compras', icon: Building2, sources: 'ListaCompra.pdf' },
    { area: 'engenharia', label: 'Engenharia', icon: Ruler, sources: 'XML + COTAS + DXF' },
    { area: 'corte', label: 'Corte', icon: Scissors, sources: 'ListaCorte.pdf' },
    { area: 'borda', label: 'Borda', icon: Layers, sources: 'ListaCorte.pdf' },
    { area: 'usinagem', label: 'Usinagem', icon: ShieldCheck, sources: 'PDF/DXF Técnico' },
    { area: 'separacao', label: 'Separação', icon: LayoutGrid, sources: 'QR Code' },
    { area: 'montagem', label: 'Montagem', icon: Wrench, sources: 'Desenhos + XML + DXF' },
    { area: 'expedicao', label: 'Expedição', icon: Truck, sources: 'Carga' },
    { area: 'assistencia', label: 'Assistência', icon: MessageSquare, sources: 'Pós-Venda' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'liberado': return 'bg-emerald-500 text-white border-emerald-600';
      case 'bloqueado': return 'bg-red-500 text-white border-red-600';
      case 'pendente':
      case 'conferencia_pendente': return 'bg-amber-500 text-white border-amber-600';
      case 'alimentado': return 'bg-blue-500 text-white border-blue-600';
      default: return 'bg-slate-100 text-slate-400 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'liberado': return 'Liberado';
      case 'bloqueado': return 'Bloqueado';
      case 'conferencia_pendente': return 'Conferência Pendente';
      case 'alimentado': return 'Alimentado';
      case 'recebido': return 'Recebido';
      default: return 'Pendente';
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Fluxo de Distribuição Industrial 4.0
        </h2>
        <Badge className="rounded px-2 py-0.5 text-[8px] font-black uppercase bg-slate-900 text-white border-none">
          Status: {project?.operational_status?.toUpperCase() || 'RECEBIDO'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
        {steps.map((step) => {
          const dist = distribution.find(d => d.area === step.area);
          const status = dist?.status || 'pendente';
          const Icon = step.icon;
          
          return (
            <div key={step.area} className={cn(
              "flex flex-col p-3 rounded-xl border-2 transition-all group relative overflow-hidden",
              dist ? "bg-white border-slate-100" : "bg-slate-50/50 border-slate-50 opacity-60"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  dist ? "bg-slate-100 text-slate-900" : "bg-slate-50 text-slate-300"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full animate-pulse",
                  status === 'alimentado' ? "bg-blue-500" : 
                  status === 'liberado' ? "bg-emerald-500" : 
                  "bg-slate-300"
                )} />
              </div>
              
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-900 truncate mb-1">
                {step.label}
              </p>
              
              <div className="space-y-1.5">
                <Badge className={cn(
                  "text-[7px] font-black uppercase tracking-widest px-1.5 py-0 border-none rounded-sm w-full justify-center",
                  getStatusColor(status)
                )}>
                  {getStatusLabel(status)}
                </Badge>
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                    Fonte: {step.sources}
                  </span>
                  {dist?.item_count > 0 && (
                    <span className="text-[7px] font-black text-slate-900 uppercase">
                      Itens: {dist.item_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectMetric({
  icon: Icon,
  label,
  value,
  color = "text-blue-600",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          color.replace("text-", "bg-").replace("-600", "-50"),
        )}
      >
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[9px]">
          {label}
        </p>
        <p className="truncate text-base font-black uppercase leading-tight tracking-tight text-slate-950 sm:text-lg">
          {value}
        </p>
      </div>
    </div>
  );
}

function SourceAuthority({
  label,
  title,
  detail,
  ok,
}: {
  label: string;
  title: string;
  detail: string;
  ok: boolean;
}) {
  return (
    <div className="min-w-0 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")}
          aria-label={ok ? "Evidência presente" : "Gate fechado"}
        />
      </div>
      <p className="mt-2 truncate text-xs font-black uppercase text-slate-950" title={title}>
        {title}
      </p>
      <p
        className={cn(
          "mt-1 break-words text-[10px] leading-snug",
          ok ? "text-slate-500" : "font-bold text-red-700",
        )}
      >
        {detail}
      </p>
    </div>
  );
}

function TabTrigger({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-10 shrink-0 gap-1.5 rounded-md px-3 text-[9px] font-black uppercase tracking-wider text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </TabsTrigger>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="border-none shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12)] transition-all duration-700 rounded-[3rem] group bg-white overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 p-10">
        <CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">
          {label}
        </CardTitle>
        <div className="p-4 rounded-3xl bg-slate-50 transition-all duration-700 group-hover:scale-110 group-hover:rotate-12">
          <Icon className="h-7 w-7 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="p-10 pt-0">
        <p className="text-6xl font-black tracking-tighter leading-none text-slate-900">{value}</p>
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

function isMaintenanceType(value: unknown): value is Enums<"maintenance_type"> {
  return (
    typeof value === "string" &&
    Constants.public.Enums.maintenance_type.some((option) => option === value)
  );
}

function isMaintenanceUrgency(value: unknown): value is Enums<"maintenance_urgency"> {
  return (
    typeof value === "string" &&
    Constants.public.Enums.maintenance_urgency.some((option) => option === value)
  );
}

function isMaintenanceStatus(value: unknown): value is Enums<"maintenance_status"> {
  return (
    typeof value === "string" &&
    Constants.public.Enums.maintenance_status.some((option) => option === value)
  );
}
