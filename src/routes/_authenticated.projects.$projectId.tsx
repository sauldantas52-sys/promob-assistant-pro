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
  Printer,
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
import { IndustrialLabelsTab } from "@/components/project/labels/IndustrialLabelsTab";
import { IndustrialCutPlanEngine } from "@/lib/cut-plan/engine";
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
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search as any).tab || undefined,
    } as { tab?: string };
  },
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
  
  const { data: cutPlanGroups } = useQuery({
    queryKey: ["industrial_cut_plan", projectId],
    queryFn: () => IndustrialCutPlanEngine.generateForProject(projectId),
  });

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
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden lg:h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:flex">
        <div className="flex flex-col gap-4 p-6">
          <Link
            to="/projects"
            className="inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" /> Projetos
          </Link>
          <div className="space-y-1">
            <h1 className="truncate text-lg font-black uppercase tracking-tight text-slate-950">
              {project.data?.name}
            </h1>
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {project.data?.client_name || "Cliente Final"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {[
            { value: "preliminary-cut-plan", icon: Scissors, label: "Plano de Corte Pro" },
            { value: "modules", icon: LayoutGrid, label: "Módulos e Peças" },
            { value: "labels", icon: Printer, label: "Etiquetas Industriais" },
            { value: "operational3d", icon: Box, label: "Ambiente 3D" },
            { value: "parts", icon: ClipboardList, label: "Lista Técnica" },
            { value: "files", icon: FileUp, label: "Arquivos do Projeto" },
            { value: "engineering", icon: Settings, label: "Usinagem CNC" },
            { value: "sketchup", icon: ArrowRightLeft, label: "Ponte SketchUp" },
            { value: "commercial", icon: FileText, label: "Comercial / Orçamentos" },
            { value: "integration_audit", icon: History, label: "Relatórios de Auditoria" },
            { value: "assistance", icon: MessageSquare, label: "Assistência Técnica" },
          ].map((item) => {
            const active = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => {
                  setActiveTab(item.value);
                  navigate({ search: { tab: item.value } as any, replace: true });
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider transition-all",
                  active
                    ? "bg-slate-900 text-[var(--lime-industrial)] shadow-md"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-[var(--lime-industrial)]" : "text-slate-400")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <Badge
            className={cn(
              "w-full justify-center rounded-md border-none py-1.5 text-[9px] font-black uppercase tracking-widest",
              statusTone(project.data?.status || "novo")
            )}
          >
            {statusLabel(project.data?.status || "novo")}
          </Badge>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="mx-auto max-w-[1400px]">
            {activeTab === "preliminary-cut-plan" && <PreliminaryCutPlanTab projectId={projectId} />}
            {activeTab === "modules" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight">Módulos do Projeto</h3>
                  <Badge variant="outline" className="font-bold">{modules.data?.length ?? 0} Módulos</Badge>
                </div>
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
                                  <p className={`font-medium ${m.is_completed ? "text-muted-foreground line-through" : ""}`}>
                                    {m.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {m.environment || "Ambiente"} · {m.width_mm ?? "?"}x{m.height_mm ?? "?"}x{m.depth_mm ?? "?"} mm
                                  </p>
                                </div>
                                <Badge variant="outline" className="ml-auto">{m.quantity} un</Badge>
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent className="pb-4 pt-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Peça</TableHead>
                                  <TableHead className="text-right text-xs">Dimensões</TableHead>
                                  <TableHead className="text-right text-xs">Qtd</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allParts.filter(p => p.module_id === m.id).map(p => (
                                  <TableRow key={p.id}>
                                    <TableCell className="text-xs font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">{p.width_mm}x{p.length_mm}</TableCell>
                                    <TableCell className="text-right text-xs">{p.quantity} {p.unit}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            )}
            {activeTab === "operational3d" && (
              <Operational3DView projectId={projectId} modules={modules.data || []} parts={allParts} />
            )}
            {activeTab === "parts" && (
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight">Lista Técnica Consolidada</h3>
                    <Button variant="outline" size="sm" onClick={exportCSV} className="text-[10px] font-black uppercase tracking-widest">
                       <Download className="mr-2 h-3.5 w-3.5" /> Exportar CSV
                    </Button>
                 </div>
                 <Table>
                    <TableHeader className="bg-slate-50">
                       <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Item</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Material</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase">Dimensões</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase">Qtd</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {allParts.map(p => (
                          <TableRow key={p.id}>
                             <TableCell className="text-xs font-bold uppercase">{p.name}</TableCell>
                             <TableCell className="text-xs uppercase text-muted-foreground">{p.material}</TableCell>
                             <TableCell className="text-right font-mono text-xs">{p.width_mm}x{p.length_mm}x{p.thickness_mm}</TableCell>
                             <TableCell className="text-right text-xs font-bold">{p.quantity} {p.unit}</TableCell>
                          </TableRow>
                       ))}
                    </TableBody>
                 </Table>
               </div>
            )}
            {activeTab === "labels" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight">Etiquetas Industriais</h3>
                </div>
                {cutPlanGroups && (
                  <IndustrialLabelsTab pieces={cutPlanGroups.flatMap((g: any) => g.pieces)} />
                )}
              </div>
            )}
            {activeTab === "engineering" && <EngineeringTab projectId={projectId} parts={allParts as any} isValidated={project.data?.is_validated} />}
            {activeTab === "sketchup" && <SketchUpBridgeTab projectId={projectId} />}
            {activeTab === "commercial" && <BudgetTab projectId={projectId} />}
            {activeTab === "integration_audit" && <AuditIntegrationTab projectId={projectId} />}
            {activeTab === "assistance" && (
              <MaintenanceTab 
                projectId={projectId} 
                companyId={project.data?.company_id} 
                allModules={modules.data || []}
                allParts={allParts}
                canCreate={true}
                canTreat={role === 'admin' || role === 'escritorio'}
              />
            )}
          </div>
        </div>
      </main>
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
