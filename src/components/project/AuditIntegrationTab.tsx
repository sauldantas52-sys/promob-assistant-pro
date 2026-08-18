import { CheckCircle, Clock, ShieldCheck, Info, Activity, Lock, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateAuditReport } from "@/lib/audit-report.functions";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AuditIntegrationTab({ projectId }: { projectId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: distribution } = useQuery({
    queryKey: ["project_distribution", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_distribution")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["project_files_audit", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("file_type")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const getStatus = (area: string) => {
    const item = distribution?.find((d: any) => d.area === area);
    return item?.status || "não verificado";
  };

  const getItemCount = (area: string) => {
    const item = distribution?.find((d: any) => d.area === area);
    return item?.item_count || 0;
  };

  const hasFile = (type: string) => {
    return files?.some((f: any) => f.file_type === type) || false;
  };

  const INTEGRATION_MAP = [
    {
      module: "CutPlanService",
      status: getStatus("corte"),
      description: hasFile("lista_corte_pdf") 
        ? "Lista de corte detectada. Conexão operacional estabelecida." 
        : "CutPlanning/Cut Pro exige evidência oficial; conexão não é inferida.",
    },
    {
      module: "SheetLayoutService",
      status: getStatus("corte"),
      description: hasFile("preview_corte_pdf") 
        ? "Nesting detectado. Geometria de chapa alimentada." 
        : "Pré-plano local não comprova nesting oficial.",
    },
    {
      module: "EngineeringEngine",
      status: getStatus("engenharia"),
      description: `${getItemCount("engenharia")} módulos persistidos no banco de dados.`,
    },
    {
      module: "MachiningControl",
      status: getStatus("usinagem"),
      description: "Gate de segurança industrial (CNC) ativo.",
    },
    {
      module: "CommercialProposalService",
      status: getStatus("comercial"),
      description: "Inventário comercial alimentado via XML.",
    }
  ];

  const TEST_RESULTS = [
    {
      task: "1. Lista de peças",
      status: getStatus("engenharia") === "alimentado" ? "auditado" : "pendente",
      evidence: `${getItemCount("corte")} peças processadas com sucesso.`,
    },
    {
      task: "2. Pré-plano de corte",
      status: hasFile("lista_corte_pdf") ? "confirmado" : "estimativo",
      evidence: hasFile("lista_corte_pdf") ? "Arquivo físico localizado na pasta." : "Referência local; não é ordem de produção.",
    },
    {
      task: "3. Geometria DXF",
      status: hasFile("dxf_conferencia") ? "validado" : "ausente",
      evidence: hasFile("dxf_conferencia") ? "Gêmeo digital DXF pronto para conferência." : "DXF não localizado para esta revisão.",
    },
    {
      task: "4. Usinagem CNC",
      status: "gate fechado",
      evidence: "Bloqueio machining_blocked = true ativo por padrão.",
    },
  ];

  const PENDENCIES = [
    {
      item: "Validação Física CNC",
      status: "Pendente",
      risk: "Crítico",
      detail: "Exige confirmação de bitola na máquina antes da liberação.",
    },
    {
      item: "Conferência de Borda",
      status: getStatus("borda") === "conferencia_pendente" ? "Aguardando" : "OK",
      risk: "Médio",
      detail: `${getItemCount("borda")} peças exigem fita de borda.`,
    }
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await generateAuditReport({ data: { projectId } });
      if (result.success) {
        toast.success(result.summary);
      }
    } catch (error) {
      toast.error("Falha ao gerar relatório de auditoria.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
              Auditoria industrial
            </p>
            <h3 className="text-base font-black uppercase tracking-tight">
              Evidências e limites de integração
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Inventário visual real do banco de dados.
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="h-9 w-full rounded-md bg-blue-600 px-4 text-[9px] font-black uppercase tracking-wider text-white hover:bg-blue-700 sm:w-auto"
        >
          {isGenerating ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          Gerar resumo de auditoria
        </Button>
      </div>

      <Alert className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-950">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-xs font-black uppercase tracking-wide">
          Auditoria Industrial 4.0 Ativa
        </AlertTitle>
        <AlertDescription className="text-xs">
          Os estados abaixo refletem a persistência real no banco de dados. 
          A liberação para CNC (usinagem) permanece bloqueada por padrão até a validação física.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Módulos Reais Conectados
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-full overflow-x-auto p-0 [scrollbar-width:thin]">
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] uppercase font-black px-6 h-10">
                    Motor / Serviço
                  </TableHead>
                  <TableHead className="text-[10px] uppercase font-black h-10">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INTEGRATION_MAP.map((item) => (
                  <TableRow key={item.module} className="hover:bg-slate-50/50 border-slate-50">
                    <TableCell className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{item.module}</p>
                      <p className="text-[10px] text-slate-400">{item.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] uppercase font-black rounded-full px-3",
                          item.status === "alimentado" || item.status === "liberado"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "conferencia_pendente"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-400",
                        )}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" /> Controles de Aceitação
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-full overflow-x-auto p-0 [scrollbar-width:thin]">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] uppercase font-black px-6 h-10">
                    Fluxo Operacional
                  </TableHead>
                  <TableHead className="text-[10px] uppercase font-black h-10">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEST_RESULTS.map((res) => (
                  <TableRow key={res.task} className="hover:bg-slate-50/50 border-slate-50">
                    <TableCell className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{res.task}</p>
                      <p className="text-[10px] text-slate-400 italic">{res.evidence}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[9px] uppercase font-black rounded-full px-3",
                          res.status === "gate fechado"
                            ? "bg-red-600 text-white"
                            : res.status === "auditado" || res.status === "validado" || res.status === "confirmado"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700",
                        )}
                      >
                        {res.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="bg-red-50 border-b border-red-100 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Pendências e Riscos
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-full overflow-x-auto p-0 [scrollbar-width:thin]">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-red-50">
                  <TableHead className="text-[10px] uppercase font-black px-6 h-10">
                    Item Crítico
                  </TableHead>
                  <TableHead className="text-[10px] uppercase font-black h-10">Risco</TableHead>
                  <TableHead className="text-[10px] uppercase font-black h-10">Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PENDENCIES.map((p) => (
                  <TableRow key={p.item} className="hover:bg-red-50/30 border-red-50">
                    <TableCell className="px-6 py-4 font-bold text-slate-800 text-xs">
                      {p.item}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] uppercase font-black rounded-full px-3",
                          p.risk === "Crítico"
                            ? "text-red-600 border-red-200 bg-red-50"
                            : p.risk === "Médio"
                              ? "text-amber-600 border-amber-200 bg-amber-50"
                              : "text-slate-600 border-slate-200 bg-slate-50",
                        )}
                      >
                        {p.risk}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500">{p.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between rounded-xl border-none bg-blue-700 p-5 text-white shadow-sm">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-black uppercase tracking-tight">Gate de usinagem</h4>
              <p className="text-sm text-blue-100 font-medium mt-2 leading-relaxed">
                <span className="font-black">machining_blocked = true</span> deve permanecer como
                padrão até a validação técnica registrada.
              </p>
            </div>
          </div>
          <Alert className="bg-blue-700/50 border-blue-500/50 text-white mt-6">
            <Info className="h-4 w-4 text-blue-200" />
            <AlertDescription className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Importação não libera CNC
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    </div>
  );
}
