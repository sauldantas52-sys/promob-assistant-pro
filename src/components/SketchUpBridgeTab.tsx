import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Box, 
  Layers, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Eye, 
  FileUp, 
  ArrowRightLeft,
  ChevronRight,
  History,
  Info,
  Package,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SketchUpBridgeTabProps {
  projectId: string;
}

const statusSteps = [
  { id: "rascunho", label: "Rascunho" },
  { id: "enviado_revisao", label: "Enviado para revisão" },
  { id: "analise_fabrica", label: "Em análise da fábrica" },
  { id: "aguardando_correcao", label: "Aguardando correção" },
  { id: "aprovado_promob", label: "Aprovado para Promob" },
  { id: "convertido_promob", label: "Convertido no Promob" },
  { id: "bloqueado_engenharia", label: "Bloqueado para engenharia" },
  { id: "liberado_orcamento", label: "Liberado para orçamento" },
];

export function SketchUpBridgeTab({ projectId }: SketchUpBridgeTabProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"versions" | "review" | "tags" | "comparativo" | "api">("versions");

  const versions = useQuery({
    queryKey: ["project_versions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_versions" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const currentVersion = versions.data?.[0];

  const comparisons = useQuery({
    queryKey: ["project_comparisons", currentVersion?.id],
    enabled: !!currentVersion,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_comparisons" as any)
        .select("*")
        .eq("version_id", currentVersion?.id);
      if (error) throw error;
      return data as any[];
    },
  });

  const updateVersionStatus = useMutation({
    mutationFn: async ({ versionId, status }: { versionId: string, status: string }) => {
      const { error } = await supabase
        .from("project_versions" as any)
        .update({ status })
        .eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da versão atualizado.");
      queryClient.invalidateQueries({ queryKey: ["project_versions", projectId] });
    },
  });

  return (
    <div className="space-y-8">
      {/* Header Operational */}
      <div className="flex flex-wrap items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-amber-600 shadow-2xl shadow-amber-600/20 ring-4 ring-amber-600/10">
            <ArrowRightLeft className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Ponte SketchUp ↔ Promob</h2>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Integrador Geométrico & Técnico</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" className="rounded-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700 font-black uppercase text-[10px] tracking-widest px-8 h-12">
            <Download className="mr-2 h-4 w-4" /> Download SKP
          </Button>
          <Button className="rounded-full bg-amber-600 text-white hover:bg-amber-500 font-black uppercase text-[10px] tracking-widest px-8 h-12 shadow-xl shadow-amber-600/20">
            <FileUp className="mr-2 h-4 w-4" /> Nova Versão
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-4">
          {[
            { id: "versions", label: "Projetos para Fábrica", icon: Box },
            { id: "review", label: "Revisão do Projetista", icon: Eye },
            { id: "comparativo", label: "Comparação Promob", icon: ArrowRightLeft },
            { id: "tags", label: "Estrutura de Tags", icon: Layers },
            { id: "api", label: "Documentação API", icon: FileCode },

          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-amber-600 text-white shadow-xl shadow-amber-600/20 translate-x-2"
                  : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
              <ChevronRight className="ml-auto h-4 w-4" />
            </button>
          ))}
          
          <div className="mt-8 p-6 bg-slate-100 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Status da Ponte</p>
            <div className="space-y-3">
              {statusSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    currentVersion?.status === step.id ? "bg-amber-600 animate-pulse" : "bg-slate-300"
                  )} />
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    currentVersion?.status === step.id ? "text-slate-900" : "text-slate-400"
                  )}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === "versions" && (
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                <CardTitle className="text-[14px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                  <History className="h-5 w-5 text-amber-600" /> Histórico de Versões SKP
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] h-16 px-8">Versão</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Responsável</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Enviado em</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-right px-8">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.data?.map((v) => (
                      <TableRow key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-black text-slate-900 px-8 py-6">v{v.version_number}</TableCell>
                        <TableCell className="text-slate-500 font-bold">Escritório Central</TableCell>
                        <TableCell className="text-slate-500 font-bold">{new Date(v.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-black uppercase text-[9px] tracking-widest px-3 py-1">
                            {statusSteps.find(s => s.id === v.status)?.label || v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="sm" className="rounded-full text-blue-600 font-black uppercase text-[10px]">Ver Detalhes</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeTab === "review" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden aspect-video bg-slate-900 flex items-center justify-center relative group cursor-zoom-in">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80')] bg-cover bg-center" />
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Eye className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Visualização 3D (Simulada)</p>
                  </div>
                  <div className="absolute bottom-6 left-6 flex gap-2">
                    <Badge className="bg-blue-600 text-white border-none uppercase text-[8px] font-black px-3 py-1">Planta Baixa</Badge>
                    <Badge className="bg-slate-700 text-white border-none uppercase text-[8px] font-black px-3 py-1">Perspectiva</Badge>
                  </div>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-xl p-8 space-y-6">
                  <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" /> Auditoria SketchUp x Promob
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-[1rem] border border-red-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Divergência de Medida</p>
                        <p className="text-sm font-bold text-slate-900">Módulo Balcão 2P 800mm</p>
                      </div>
                      <Badge className="bg-red-200 text-red-700 border-none uppercase text-[9px] font-black">+5mm</Badge>
                    </div>
                    
                    <div className="p-4 bg-amber-50 rounded-[1rem] border border-amber-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Divergência de Material</p>
                        <p className="text-sm font-bold text-slate-900">Frente Gaveta G1</p>
                      </div>
                      <Badge className="bg-amber-200 text-amber-700 border-none uppercase text-[9px] font-black">Ref Divergente</Badge>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-[1rem] border border-slate-100 flex items-center justify-between opacity-60">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo sem correspondência</p>
                        <p className="text-sm font-bold text-slate-900">Item Decorativo Vaso</p>
                      </div>
                      <Badge className="bg-slate-200 text-slate-600 border-none uppercase text-[9px] font-black">Ignorado</Badge>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-full border-red-200 text-red-600 hover:bg-red-50 font-black uppercase text-[10px] h-12">
                      Devolver
                    </Button>
                    <Button className="flex-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 font-black uppercase text-[10px] h-12 shadow-xl shadow-emerald-600/20">
                      Aprovar Ponte
                    </Button>
                  </div>
                </Card>
              </div>

              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                  <CardTitle className="text-[14px] font-black text-slate-900 uppercase tracking-[0.3em]">Lista de Módulos (Comparativo)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] h-14 px-8">Componente SKP</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Match Promob</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Divergências</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-right px-8">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-b border-slate-50">
                        <TableCell className="px-8 font-bold text-slate-900">ARM_COZ_INF_BAL_2P_800</TableCell>
                        <TableCell className="text-slate-500 font-medium">BALCAO 2 PORTAS 800</TableCell>
                        <TableCell><Badge variant="outline" className="text-red-600 border-red-200 text-[9px]">LARGURA (+5mm)</Badge></TableCell>
                        <TableCell className="text-right px-8"><CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50">
                        <TableCell className="px-8 font-bold text-slate-900">ARM_COZ_SUP_1P_400</TableCell>
                        <TableCell className="text-slate-500 font-medium">AEREO 1 PORTA 400</TableCell>
                        <TableCell><span className="text-slate-400 text-[10px]">—</span></TableCell>
                        <TableCell className="text-right px-8"><CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "comparativo" && (
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[14px] font-black text-slate-900 uppercase tracking-[0.3em]">Auditoria de Convergência Geométrica</CardTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Versão SKP v2 vs XML Promob v1</p>
                </div>
                <Badge className="bg-amber-600 text-white border-none uppercase text-[9px] font-black px-3 py-1">2 DIVERGÊNCIAS</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] h-14 px-8">Módulo (SKP)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Item (Promob)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Comparação</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Diferença</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-right px-8">Audit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-b border-red-50 bg-red-50/20">
                      <TableCell className="px-8 font-bold text-slate-900">BALCAO_PIA_800</TableCell>
                      <TableCell className="text-slate-500 font-medium">BALCAO 2P 800</TableCell>
                      <TableCell className="text-[10px] font-bold uppercase text-slate-400">Largura</TableCell>
                      <TableCell><Badge className="bg-red-200 text-red-700 border-none text-[9px] font-black">+5mm</Badge></TableCell>
                      <TableCell className="text-right px-8"><AlertTriangle className="ml-auto h-4 w-4 text-red-500" /></TableCell>
                    </TableRow>
                    <TableRow className="border-b border-amber-50 bg-amber-50/20">
                      <TableCell className="px-8 font-bold text-slate-900">PAINEL_TAMPON_18</TableCell>
                      <TableCell className="text-slate-500 font-medium">TAMPONAMENTO 18</TableCell>
                      <TableCell className="text-[10px] font-bold uppercase text-slate-400">Material</TableCell>
                      <TableCell><Badge className="bg-amber-200 text-amber-700 border-none text-[9px] font-black">Ref Divergente</Badge></TableCell>
                      <TableCell className="text-right px-8"><AlertTriangle className="ml-auto h-4 w-4 text-amber-500" /></TableCell>
                    </TableRow>
                    <TableRow className="border-b border-emerald-50 bg-emerald-50/20">
                      <TableCell className="px-8 font-bold text-slate-900">AEREO_1P_400</TableCell>
                      <TableCell className="text-slate-500 font-medium">AEREO 1 PORTA</TableCell>
                      <TableCell className="text-[10px] font-bold uppercase text-slate-400">Tudo OK</TableCell>
                      <TableCell><span className="text-emerald-600 text-[9px] font-black">MATCH 100%</span></TableCell>
                      <TableCell className="text-right px-8"><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" /></TableCell>
                    </TableRow>
                    <TableRow className="border-b border-slate-50 opacity-40">
                      <TableCell className="px-8 font-bold text-slate-900">DECOR_VASO</TableCell>
                      <TableCell className="text-slate-500 font-medium">—</TableCell>
                      <TableCell className="text-[10px] font-bold uppercase text-slate-400">Exclusivo SKP</TableCell>
                      <TableCell><span className="text-slate-400 text-[9px] font-black">NÃO FABRICÁVEL</span></TableCell>
                      <TableCell className="text-right px-8"><Info className="ml-auto h-4 w-4 text-slate-400" /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeTab === "tags" && (

            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-900 p-8 border-b border-slate-800">
                <CardTitle className="text-[14px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  <Layers className="h-5 w-5 text-amber-500" /> Estrutura Padrão de Tags/Layers
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Padrão obrigatório para exportação automatizada</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {[
                      { code: "00", name: "REFERENCIAS", desc: "Planos de chão, teto e eixos técnicos" },
                      { code: "01", name: "AMBIENTES", desc: "Delimitação de espaços físicos" },
                      { code: "02", name: "MODULOS", desc: "Volumes genéricos de móveis" },
                      { code: "03", name: "G1", desc: "Módulos/Conjuntos Grupo 1" },
                      { code: "04", name: "G2", desc: "Módulos/Conjuntos Grupo 2" },
                      { code: "05", name: "G3", desc: "Módulos/Conjuntos Grupo 3" },
                      { code: "06", name: "AV", desc: "Itens não identificados / Avulsos" },
                      { code: "07", name: "PORTAS_FRENTES", desc: "Elementos de abertura e fechamento" },
                      { code: "08", name: "ESTRUTURA", desc: "Laterais, bases e fundos" },
                      { code: "09", name: "INTERNOS", desc: "Prateleiras e divisórias" },
                      { code: "10", name: "FERRAGENS_VISUAIS", desc: "Puxadores e acessórios visíveis" },
                      { code: "11", name: "COTAS", desc: "Dimensões críticas para PDF" },
                      { code: "12", name: "MATERIAIS", desc: "Amostras de cores e texturas" },
                      { code: "13", name: "NAO_FABRICAVEL", desc: "Itens decorativos e extras" },
                      { code: "14", name: "PROCESSO_CORTE", desc: "Itens vinculados à etapa de corte" },
                      { code: "15", name: "PROCESSO_BORDA", desc: "Itens vinculados à etapa de borda" },
                      { code: "16", name: "PROCESSO_USINAGEM", desc: "Itens vinculados à usinagem técnica" },
                      { code: "17", name: "PROCESSO_SEPARACAO", desc: "Logística interna de peças" },
                      { code: "18", name: "MONTAGEM", desc: "Agrupadores para caderno mobile" },
                    ].map((tag) => (
                      <TableRow key={tag.code} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="px-8 py-5 w-20 font-black text-amber-600">{tag.code}</TableCell>
                        <TableCell className="font-black text-slate-900 uppercase tracking-widest">{tag.name}</TableCell>
                        <TableCell className="text-slate-500 font-medium text-[11px]">{tag.desc}</TableCell>
                        <TableCell className="text-right px-8">
                          <Badge variant="outline" className="text-[9px] uppercase font-black text-slate-400 border-slate-200">Padronizado</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeTab === "api" && (
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-900 p-8 border-b border-slate-800">
                <CardTitle className="text-[14px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  <FileCode className="h-5 w-5 text-amber-500" /> Documentação Técnica API SketchUp
                </CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Especificações para o Desenvolvedor do Plugin Ruby</p>
              </CardHeader>
              <CardContent className="p-8 space-y-8 overflow-y-auto max-h-[600px] prose prose-invert prose-slate max-w-none">
                <div className="space-y-6">
                  <section className="space-y-4">
                    <h4 className="text-amber-500 font-black uppercase text-[12px] tracking-widest border-l-4 border-amber-500 pl-4">1. Autenticação Operacional</h4>
                    <div className="bg-slate-950 p-6 rounded-[1.5rem] border border-slate-800">
                      <p className="text-[11px] text-slate-300 mb-4 font-medium">Use as credenciais do Supabase para obter o JWT.</p>
                      <pre className="text-[10px] text-emerald-400 font-mono">
{`POST https://nhkburqoligtdyrjtkrs.supabase.co/auth/v1/token?grant_type=password
Headers: {
  "apikey": "sb_publishable_M9jDHpJ214--HnafZLr8dA_CS3WAlF2",
  "Content-Type": "application/json"
}
Body: { "email": "...", "password": "..." }`}
                      </pre>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-amber-500 font-black uppercase text-[12px] tracking-widest border-l-4 border-amber-500 pl-4">2. Envio do Pacote (manifest.json)</h4>
                    <div className="bg-slate-950 p-6 rounded-[1.5rem] border border-slate-800">
                      <p className="text-[11px] text-slate-300 mb-4 font-medium">Endpoint seguro para processamento de geometria e auditoria técnica.</p>
                      <pre className="text-[10px] text-emerald-400 font-mono">
{`RPC: /_server/processSkpPackage
Payload: {
  "projectId": "UUID",
  "manifest": {
    "plugin_version": "1.0.0",
    "version_number": 1,
    "items": [{
      "environment_id": "Cozinha",
      "module_id": "GUID_UNIQUE_SKP",
      "group_code": "G1",
      "module_name": "Balcão Pia 1200",
      "thickness_mm": 18,
      "width_mm": 1200, "height_mm": 720, "depth_mm": 580,
      "position_x": 0, "position_y": 0, "position_z": 0,
      "tags": ["02_MODULOS", "03_G1"]
    }]
  }
}`}
                      </pre>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-amber-500 font-black uppercase text-[12px] tracking-widest border-l-4 border-amber-500 pl-4">3. Arquivos de Apoio</h4>
                    <p className="text-[11px] text-slate-400 font-medium">O pacote deve incluir URLs do Supabase Storage para:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['SKP (Modelo 3D)', 'PDF (Planta)', 'Perspectivas', 'Cotas Técnicas'].map(f => (
                        <div key={f} className="p-3 bg-slate-800 rounded-xl text-center text-[9px] font-black uppercase text-slate-300 border border-slate-700">{f}</div>
                      ))}
                    </div>
                  </section>

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800">
                    <Button variant="outline" asChild className="rounded-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700 font-black uppercase text-[10px]">
                      <a href="/monta-ai-sketchup-bridge.zip" download><Download className="mr-2 h-4 w-4" /> Plugin SketchUp (ZIP)</a>
                    </Button>
                    <Button variant="outline" asChild className="rounded-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700 font-black uppercase text-[10px]">
                      <a href="/manifest_valid_example.json" download><Download className="mr-2 h-4 w-4" /> Exemplo Válido</a>
                    </Button>
                    <Button variant="outline" asChild className="rounded-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700 font-black uppercase text-[10px]">
                      <a href="/manifest_invalid_example.json" download><Download className="mr-2 h-4 w-4" /> Exemplo Inválido</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Package Details Panel */}
      {currentVersion && activeTab === "versions" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="rounded-[2.5rem] border-none shadow-xl p-8 space-y-4">
            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" /> Resumo do Pacote
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-[1.5rem]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Módulos</p>
                <p className="text-xl font-black text-slate-900">24</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-[1.5rem]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ambientes</p>
                <p className="text-xl font-black text-slate-900">3</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl p-8 space-y-4 md:col-span-2">
            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" /> Validações de Integridade
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-[1rem] border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Campos obrigatórios preenchidos</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-[1rem] border border-red-100">
                <span className="text-[10px] font-bold text-red-700 uppercase">Divergência de medidas detectada (G2)</span>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-[1rem] border border-amber-100">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Módulos sem ambiente (AV)</span>
                <Badge className="bg-amber-200 text-amber-700 border-none text-[8px] font-black">2 ITENS</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Safety Locks Panel */}
      <div className="bg-blue-50/50 rounded-[2rem] p-8 border border-blue-100 flex items-start gap-6">
        <div className="h-12 w-12 rounded-[1rem] bg-blue-600 flex items-center justify-center shrink-0">
          <Info className="h-6 w-6 text-white" />
        </div>
        <div className="space-y-2">
          <h4 className="text-[12px] font-black text-blue-900 uppercase tracking-widest">Protocolo de Segurança Técnica</h4>
          <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
            A Ponte SketchUp ↔ Promob utiliza o XML como fonte de identidade e o SketchUp como fonte de layout. 
            Em caso de divergência, o sistema bloqueia automaticamente a usinagem (machining_blocked = true).
            <strong> Ferragens e furações não são inventadas; a validação humana é obrigatória em divergências críticas.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
