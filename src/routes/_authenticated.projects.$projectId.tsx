import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { Parser } from "@json2csv/plainjs";
import { EngineeringTab } from "@/components/EngineeringTab";
import { SketchUpBridgeTab } from "@/components/SketchUpBridgeTab";
import { PilotValidationChecklist } from "@/components/PilotValidationChecklist";
import { BudgetTab } from "@/components/project/BudgetTab";
import { PreliminaryCutPlanTab } from "@/components/project/PreliminaryCutPlanTab";
import { VisualEstimateTab } from "@/components/project/VisualEstimateTab";
import { AuditIntegrationTab } from "@/components/project/AuditIntegrationTab";

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
import { ProjectShippingTab } from "@/components/ProjectShippingTab";
import { parseProjectFile } from "@/lib/promob-import";
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
  const { role } = useAuth();
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
        .select("id, name, client_name, environment, status, notes, created_at, company_id, cutting_status, machining_status, is_cutting_edge_released, machining_blocked, is_validated")
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
        .select("id, name, environment, width_mm, height_mm, depth_mm, quantity, is_completed, data_source")
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
        .select("id, module_id, kind, name, material, thickness_mm, width_mm, length_mm, quantity, unit, edge_banding, is_completed, data_source, visibility_type, cutting_edge_released, machining_blocked")
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

      const allInsertedParts: { id: string; module_id: string | null; kind: string; quantity: number }[] = [];
      const moduleColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

      for (let i = 0; i < result.modules.length; i++) {
        const parsedModule = result.modules[i];
        if (!parsedModule) continue;

        const color = moduleColors[i % moduleColors.length];
        
        // 1. Criar Módulo
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
            data_source: parsedModule.data_source || 'XML',
          })
          .select("id")
          .single();
        if (error) throw error;

        // 2. Criar Grupo de Montagem automaticamente para o módulo
        const { data: group, error: groupError } = await supabase
          .from("assembly_groups")
          .insert({
            project_id: projectId,
            module_id: created.id,
            code: `M${(i + 1).toString().padStart(2, '0')}`,
            name: parsedModule.name,
            color: color ?? null,
            separation_status: 'pendente',
            conference_status: 'pendente',
            is_locked: true,
            lock_reason: 'Aguardando separação de peças e ferragens'
          })
          .select("id")
          .single();
        if (groupError) throw groupError;

        if (parsedModule.parts.length > 0) {
          const { data: insertedParts, error: partsError } = await supabase.from("parts").insert(
            parsedModule.parts.map((part) => ({
              project_id: projectId,
              module_id: created.id,
              assembly_group_id: group.id,
              kind: part.kind,
              name: part.name,
              material: part.material ?? null,
              thickness_mm: part.thickness_mm ?? null,
              width_mm: part.width_mm ?? null,
              length_mm: part.length_mm ?? null,
              quantity: part.quantity,
              unit: part.unit ?? "un",
              edge_banding: part.edge_banding ?? null,
              data_source: part.data_source || 'XML',
              visibility_type: part.visibility_type || 'visivel',
              cutting_edge_released: false,
              machining_blocked: true,
            })),
          ).select("id, module_id, kind, quantity");
          if (partsError) throw partsError;
          if (insertedParts) {
            allInsertedParts.push(...insertedParts.map(p => ({ ...p, quantity: Number(p.quantity) })));
            
            // 3. Criar Kit de Ferragens automaticamente
            const hardwareItems = insertedParts.filter(p => p.kind === 'ferragem' || p.kind === 'acessorio');
            if (hardwareItems.length > 0) {
              await (supabase.from('assembly_group_hardware') as any).insert(
                hardwareItems.map(h => ({
                  group_id: group.id,
                  part_id: h.id,
                  quantity_required: h.quantity,
                  quantity_confirmed: 0,
                  is_verified: false
                }))
              );
            }
          }
        }
      }

      if (result.looseParts.length > 0) {
        const { data: looseGroup, error: looseGroupError } = await supabase
          .from("assembly_groups")
          .insert({
            project_id: projectId,
            code: 'AV',
            name: 'Itens Avulsos',
            color: '#94a3b8',
            separation_status: 'pendente',
            conference_status: 'pendente',
            is_locked: true,
            lock_reason: 'Aguardando conferência de itens avulsos'
          })
          .select("id")
          .single();
        
        if (!looseGroupError && looseGroup) {
          const { data: insertedLoose, error: looseError } = await supabase.from("parts").insert(
            result.looseParts.map((part) => ({
              project_id: projectId,
              module_id: null,
              assembly_group_id: looseGroup.id,
              kind: part.kind,
              name: part.name,
              material: part.material ?? null,
              thickness_mm: part.thickness_mm ?? null,
              width_mm: part.width_mm ?? null,
              length_mm: part.length_mm ?? null,
              quantity: part.quantity,
              unit: part.unit ?? "un",
              edge_banding: part.edge_banding ?? null,
              data_source: part.data_source || 'XML',
              visibility_type: part.visibility_type || 'visivel',
              cutting_edge_released: false,
              machining_blocked: true,
            })),
          ).select("id, module_id, kind, quantity");
          
          if (!looseError && insertedLoose) {
            allInsertedParts.push(...insertedLoose.map(p => ({ ...p, quantity: Number(p.quantity) })));
            
            const looseHardware = insertedLoose.filter(p => p.kind === 'ferragem' || p.kind === 'acessorio');
            if (looseHardware.length > 0) {
              await (supabase.from('assembly_group_hardware') as any).insert(
                looseHardware.map(h => ({
                  group_id: looseGroup.id,
                  part_id: h.id,
                  quantity_required: h.quantity,
                  quantity_confirmed: 0,
                  is_verified: false
                }))
              );
            }
          }
        }
      }

      // Gerar etapas de produção automaticamente
      if (allInsertedParts.length > 0) {
        const stepsToCreate = [];
        for (const p of allInsertedParts) {
          if (p.kind === 'peca' || p.kind === 'chapa') {
            stepsToCreate.push({ project_id: projectId, part_id: p.id, module_id: p.module_id, step_type: 'corte', status: 'pendente' });
            stepsToCreate.push({ project_id: projectId, part_id: p.id, module_id: p.module_id, step_type: 'usinagem', status: 'pendente' });
            stepsToCreate.push({ project_id: projectId, part_id: p.id, module_id: p.module_id, step_type: 'borda', status: 'pendente' });
          } else {
            stepsToCreate.push({ project_id: projectId, part_id: p.id, module_id: p.module_id, step_type: 'separacao', status: 'pendente' });
          }
        }
        await supabase.from('production_steps').insert(stepsToCreate);
      }

      setWarnings(result.warnings);
      toast.success(
        result.modules.length > 0
          ? `${result.modules.length} módulo(s) importado(s) com rastreabilidade 4.0.`
          : "Arquivo registrado no projeto.",
      );
      void queryClient.invalidateQueries({ queryKey: ["modules", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["parts", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project_files", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["factory-projects"] });
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
    <div className="space-y-12 p-8 md:p-16 max-w-[1800px] mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col gap-8">
        <Link to="/projects" className="inline-flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-blue-600 transition-all duration-300 group">
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-2" /> Voltar para o Centro de Comando
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="h-2 w-10 bg-blue-600 rounded-full" />
              <p className="text-[12px] font-black uppercase tracking-[0.6em] text-blue-600">Dossiê Técnico Industrial</p>
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            </div>
            <h1 className="text-6xl md:text-[10rem] font-black tracking-tighter text-slate-900 uppercase leading-[0.8]">
              {project.data?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-8 pt-4">
              <Badge className={cn("px-8 py-3.5 text-[11px] font-black shadow-2xl uppercase tracking-[0.3em] border-none rounded-[1.5rem] transition-all duration-500 hover:scale-105", statusTone(project.data?.status || "novo"))}>
                {statusLabel(project.data?.status || "novo")}
              </Badge>
              <div className="flex items-center gap-4 border-l-4 border-slate-200 pl-8">
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Proprietário</p>
                <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {project.data?.client_name || "CLIENTE ANÔNIMO"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Select 
              value={project.data?.status ?? "novo"} 
              disabled={!hasPermission(role, "projects", "approve")}
              onValueChange={async (v) => {
                if (["corte", "borda", "usinagem"].includes(v)) {
                  if (!project.data?.is_validated) {
                    toast.error("Bloqueio Industrial: O Checklist de Validação Piloto deve estar 100% concluído antes de iniciar a produção.");
                    return;
                  }

                  const unconfirmedParts = allParts.filter(p => 
                    (!p.width_mm || !p.length_mm || !p.thickness_mm || !p.material) && 
                    p.kind !== 'ferragem' && 
                    p.kind !== 'acessorio' && 
                    !p.name.toLowerCase().includes("processo") &&
                    p.visibility_type !== 'oculta'
                  );

                  if (unconfirmedParts.length > 0) {
                    toast.error(`Bloqueio: ${unconfirmedParts.length} peça(s) possuem medidas ou dados críticos "Não confirmados".`);
                    return;
                  }
                }


                const oldStatus = project.data?.status || "novo";
                updateStatus.mutate(v, {
                  onSuccess: async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await (supabase.from('production_logs') as any).insert({
                        project_id: projectId,
                        user_id: user.id,
                        action: `Alteração de status do projeto: ${v}`,
                        status_from: oldStatus,
                        status_to: v,
                        notes: "Alteração via seletor de status principal"
                      });
                    }
                  }
                });
              }}
            >
              <SelectTrigger className="h-16 w-64 rounded-[1.5rem] border-none bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all duration-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[1.5rem] border-2 shadow-2xl p-4">
                {projectStatuses.map((status) => (
                  <SelectItem key={status} value={status} className="font-black uppercase text-[11px] tracking-widest py-4 focus:bg-blue-50 focus:text-blue-600">
                    {statusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-16 px-10 rounded-[1.5rem] border-2 border-slate-100 font-black uppercase tracking-[0.2em] text-[11px] gap-4 bg-white hover:bg-slate-50 shadow-2xl shadow-slate-900/5 transition-all duration-500" onClick={exportCSV}>
              <Download className="h-6 w-6 text-blue-600" /> Exportar OP
            </Button>
          </div>
        </div>
      </header>

        <Card className="border-none shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] rounded-[3.5rem] overflow-hidden bg-white">
          <CardHeader className="pb-6 pt-12 px-12 border-b border-slate-50">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Importação e Engenharia de Precisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-10 px-12 pb-12 pt-10">
            <div className="space-y-4">
              <p className="text-base font-medium text-slate-500 leading-relaxed max-w-3xl">
                O Monta AI extrai a inteligência técnica dos seus arquivos Promob para gerar listas de corte, 
                mapas de furação e romaneios de expedição com erro zero.
              </p>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-4 py-2 rounded-full border border-emerald-100">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Protocolo de Rastreabilidade Ativo</span>
              </div>
            </div>
            <div className="grid gap-12">
              <PilotValidationChecklist 
                projectId={projectId} 
                isMachiningBlocked={project.data?.machining_blocked ?? true} 
              />
              
              <div className="space-y-6">
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
                <div className="flex flex-wrap gap-6">
                  <Button className="h-20 px-12 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl shadow-blue-600/30 gap-4 transition-all duration-500 active:scale-95 group" disabled={importing} onClick={() => fileInput.current?.click()}>
                    {importing ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-7 w-7 transition-transform group-hover:-translate-y-1" />}
                    Importar Arquivo Promob
                  </Button>
                </div>
              </div>
            </div>

            {warnings.length > 0 && (

              <div className="space-y-4 rounded-[2rem] border-2 border-red-100 bg-red-50/50 p-8 mt-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-900">Alertas de Integridade Técnica</h4>
                </div>
                <div className="grid gap-3">
                  {warnings.map((warning) => (
                    <p key={warning} className="text-xs font-bold text-red-700 uppercase tracking-widest leading-relaxed pl-9 border-l-2 border-red-200">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-8 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <ProjectMetric icon={LayoutGrid} label="Módulos" value={String(modules.data?.length ?? 0)} color="text-blue-600" />
          <ProjectMetric icon={Layers} label="Peças / Chapas" value={String(panels.length)} color="text-violet-600" />
          <ProjectMetric icon={Wrench} label="Ferragens" value={String(hardware.length)} color="text-emerald-600" />
          <ProjectMetric icon={AlertTriangle} label="Sem Módulo" value={String(allParts.filter(p => !p.module_id).length)} color="text-orange-600" />
          <ProjectMetric 
            icon={ShieldCheck} 
            label="Engenharia" 
            value={allParts.some(p => p.machining_blocked && (p.kind === 'peca' || p.kind === 'chapa')) ? "BLOQUEADO" : "LIBERADO"} 
            color={allParts.some(p => p.machining_blocked && (p.kind === 'peca' || p.kind === 'chapa')) ? "text-red-600" : "text-emerald-600"}
          />
          <ProjectMetric icon={Scissors} label="Área (m²)" value={totalArea.toFixed(2)} color="text-slate-600" />
        </div>

        <Tabs defaultValue="modules" className="space-y-10">
          <TabsList className="flex w-fit bg-slate-100 p-2 h-20 rounded-[3rem] border border-slate-200 overflow-x-auto no-scrollbar shadow-sm">
            <TabTrigger value="modules" icon={LayoutGrid} label="Módulos" />
            <TabTrigger value="parts" icon={ClipboardList} label="Lista Técnica" />
            <TabTrigger value="commercial" icon={FileText} label="Comercial" />
            <TabTrigger value="cutplan" icon={Scissors} label="Plano de Corte" />
            <TabTrigger value="engineering" icon={Settings} label="Usinagem" />
            <TabTrigger value="sketchup" icon={ArrowRightLeft} label="Ponte SKP" />
            <TabTrigger value="shipping" icon={Truck} label="Logística" />
            <TabTrigger value="maintenance" icon={HardHat} label="Assistência" />
            <TabTrigger value="audit" icon={History} label="Auditoria" />
            <TabTrigger value="validation" icon={ShieldCheck} label="Checklist Piloto" />
            <TabTrigger value="integration_audit" icon={CheckSquare} label="Motores IA" />
            <TabTrigger value="files" icon={FileUp} label="Arquivos" />
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

        <TabsContent value="commercial" className="mt-6">
          <BudgetTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="cutplan" className="mt-6">
          <PreliminaryCutPlanTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="engineering" className="mt-6">
          <EngineeringTab 
            projectId={projectId} 
            parts={allParts} 
            isValidated={project.data?.is_validated}
          />
        </TabsContent>

        <TabsContent value="sketchup" className="mt-6">
          <SketchUpBridgeTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="validation" className="mt-6">
          <PilotValidationChecklist 
            projectId={projectId} 
            isMachiningBlocked={!!allParts.some(p => p.machining_blocked)} 
          />
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
                    <AlertTriangle className="h-3.5 w-3.5" /> Controle de Liberação Parcial (Rastreabilidade 4.0)
                  </h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">1. CORTE E BORDA</Label>
                        <Badge className={project.data?.is_cutting_edge_released ? "bg-green-500" : "bg-amber-500"}>
                          {project.data?.is_cutting_edge_released ? "LIBERADO" : "PENDENTE"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-amber-700 leading-tight">
                        “Corte e borda aprovados com base no XML, ListaCorte, PreviewCorte e DXF de nesting.”
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
                              cutting_status: 'liberado',
                              updated_at: new Date().toISOString()
                            } as any)
                            .eq("id", projectId);
                          
                          if (error) toast.error(error.message);
                          else {
                            toast.success("Corte e Borda liberados com sucesso.");
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                              await (supabase.from('production_logs') as any).insert({
                                project_id: projectId,
                                user_id: user.id,
                                action: "LIBERAÇÃO PARCIAL: Corte e Borda",
                                notes: "Aprovado via painel de OP com base em XML/ListaCorte/DXF Nesting"
                              });
                            }
                            void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
                          }
                        }}
                      >
                        {project.data?.is_cutting_edge_released ? "Corte/Borda já Liberados" : "Liberar Corte e Borda"}
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
                        “Furação e usinagem não confirmadas — DXF técnico individual ou arquivo CNC necessário.”
                      </p>
                      <div className="rounded border border-destructive/20 bg-destructive/5 p-2 text-[9px] text-destructive italic">
                        Usinagem automatizada suspensa. Não deduzir posições de furos. Liberação final de montagem bloqueada até validação técnica.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground pt-2 border-t flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Aprovado em: {new Date().toLocaleDateString('pt-BR')}</span>
                    <span>Responsável: Sistema Monta AI</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-1 rounded px-2">
                    <span className="font-medium">Rastreabilidade 4.0:</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[8px] h-4">ID Único Ativo</Badge>
                      <Badge variant="outline" className="text-[8px] h-4">Logs em Tempo Real</Badge>
                      <Badge variant="outline" className="text-[8px] h-4">Integridade XML</Badge>
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

        <TabsContent value="estimate" className="mt-6">
          <VisualEstimateTab projectId={projectId} />
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
          status: "aberto",
          photos: photoUrls,
          deadline: deadline || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado de assistência aberto.");
      setIsAdding(false);
      setDescription("");
      setPhotoUrls([]);
      setDeadline("");
      void queryClient.invalidateQueries({ queryKey: ["maintenance_requests", projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls: string[] = [...photoUrls];
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('maintenance_photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('maintenance_photos')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }
      setPhotoUrls(newUrls);
      toast.success("Fotos anexadas.");
    } catch (error) {
      toast.error("Erro ao subir fotos.");
    } finally {
      setUploading(false);
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, oldStatus, newStatus }: { id: string; oldStatus: string; newStatus: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error: updateError } = await supabase
        .from("maintenance_requests")
        .update({ status: newStatus as any })
        .eq("id", id);
      
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from("maintenance_history")
        .insert({
          request_id: id,
          created_by: user.id,
          old_status: oldStatus as any,
          new_status: newStatus as any,
          notes: `Status alterado de ${oldStatus} para ${newStatus}`
        });
      
      if (historyError) throw historyError;
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
                <Label>Prazo de Reposição (Opcional)</Label>
                <Input 
                  type="date" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Fotos / Evidências</Label>
                <input 
                  type="file" 
                  ref={photoInputRef}
                  className="hidden" 
                  accept="image/*" 
                  multiple
                  onChange={handlePhotoUpload}
                />
                <div 
                  className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground hover:bg-muted"
                  onClick={() => photoInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <Camera className="mb-2 h-8 w-8" />
                      <p className="text-xs">
                        {photoUrls.length > 0 ? `${photoUrls.length} fotos anexadas` : "Clique para anexar fotos"}
                      </p>
                    </>
                  )}
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
                    {req.deadline && (
                      <span className="text-orange-600 font-medium">Prazo: {new Date(req.deadline).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                  {req.photos && req.photos.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {req.photos.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                          <img src={url} alt="Evidência" className="h-12 w-12 rounded object-cover border" />
                        </a>
                      ))}
                    </div>
                  )}
                  {req.maintenance_history && req.maintenance_history.length > 0 && (
                    <div className="mt-2 space-y-1 border-t pt-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Histórico</p>
                      {req.maintenance_history.slice(0, 3).map((h: any) => (
                        <p key={h.id} className="text-[10px] text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString('pt-BR')}: {h.notes}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <Select value={req.status} onValueChange={(val) => updateStatus.mutate({ id: req.id, oldStatus: req.status, newStatus: val })}>
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

function ProjectMetric({
  icon: Icon,
  label,
  value,
  color = "text-blue-600",
}: {
  icon: any;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col gap-6 group hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] transition-all duration-500">
      <div className={cn("w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-6", color.replace('text-', 'bg-').replace('-600', '-50'))}>
        <Icon className={cn("h-8 w-8", color)} />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <p className="text-3xl font-black text-slate-900 leading-none tracking-tighter uppercase">{value}</p>
      </div>
    </div>
  );
}

function TabTrigger({ value, icon: Icon, label }: { value: string; icon: any; label: string }) {
  return (
    <TabsTrigger 
      value={value} 
      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-2xl rounded-[2.5rem] px-8 transition-all duration-500 gap-3 font-black uppercase tracking-[0.2em] text-[11px] h-full active:scale-95"
    >
      <Icon className="h-5 w-5" />
      <span className="hidden lg:inline">{label}</span>
    </TabsTrigger>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
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
