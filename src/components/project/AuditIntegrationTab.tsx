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

const INTEGRATION_MAP = [
  {
    module: "CutPlanService",
    status: "não verificado",
    description: "CutPlanning/Cut Pro exige evidência oficial; conexão não é inferida.",
  },
  {
    module: "SheetLayoutService",
    status: "não verificado",
    description: "Pré-plano local não comprova nesting oficial.",
  },
  {
    module: "OcrService",
    status: "não verificado",
    description: "Disponibilidade não consultada por esta tela.",
  },
  {
    module: "ReceiptParser",
    status: "não verificado",
    description: "Disponibilidade não consultada por esta tela.",
  },
  {
    module: "StoreCreditService",
    status: "não verificado",
    description: "Disponibilidade não consultada por esta tela.",
  },
  {
    module: "QuoteEngine",
    status: "não verificado",
    description: "Disponibilidade não consultada por esta tela.",
  },
  {
    module: "CommercialProposalService",
    status: "não verificado",
    description: "Disponibilidade não consultada por esta tela.",
  },
  {
    module: "ContractGenerator",
    status: "não verificado",
    description: "Disponibilidade não consultada por esta tela.",
  },
  {
    module: "RelatorioService",
    status: "resumo local",
    description: "A tela gera somente um resumo; nenhum PDF é produzido.",
  },
  {
    module: "BusinessEngine",
    status: "não verificado",
    description: "Gates devem ser confirmados pelos registros do projeto.",
  },
  {
    module: "WhatsAppService",
    status: "simulado",
    description: "Sem credenciais ou envio real confirmado.",
  },
];

const TEST_RESULTS = [
  {
    task: "1. Lista de peças",
    status: "autoridade XML",
    evidence: "Identidade e revisão devem corresponder ao XML anexado",
  },
  {
    task: "2. Pré-plano de corte",
    status: "estimativo",
    evidence: "Referência local; não é ordem de produção",
  },
  {
    task: "3. Resultado CutPlanning / Cut Pro",
    status: "gate manual",
    evidence: "Exige arquivo oficial e conferência de revisão",
  },
  {
    task: "4. Geometria DXF",
    status: "conferência",
    evidence: "DXF confere geometria; não substitui a autoridade XML",
  },
  {
    task: "5. Leitura OCR",
    status: "não verificado",
    evidence: "Nenhum health check é executado por esta tela",
  },
  {
    task: "6. Estoque e baixas",
    status: "confirmação humana",
    evidence: "Não inferir movimentação sem registro operacional",
  },
  {
    task: "7. Orçamento",
    status: "não verificado",
    evidence: "Disponibilidade do motor não é medida aqui",
  },
  {
    task: "8. Proposta e contrato",
    status: "não verificado",
    evidence: "Geração não equivale a assinatura digital",
  },
  {
    task: "9. Usinagem CNC",
    status: "gate fechado",
    evidence: "Importação não concede liberação CNC",
  },
  {
    task: "10. Logs e histórico",
    status: "evidência exigida",
    evidence: "Validar registros persistidos no projeto",
  },
];

const PENDENCIES = [
  {
    item: "Credenciais WhatsApp",
    status: "Pendente",
    risk: "Médio",
    detail: "Sem provedor oficial Meta/Twilio configurado.",
  },
  {
    item: "Validação Física CNC",
    status: "Pendente",
    risk: "Crítico",
    detail: "Exige confirmação de bitola na máquina.",
  },
  {
    item: "Assinatura Digital",
    status: "Pendente",
    risk: "Baixo",
    detail: "Integração DocuSign/Gov.br futura.",
  },
];

export function AuditIntegrationTab({ projectId }: { projectId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

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
              Inventário visual, não monitoramento de disponibilidade.
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

      <Alert className="rounded-lg border-amber-200 bg-amber-50 text-amber-950">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-xs font-black uppercase tracking-wide">
          Sem telemetria de integração
        </AlertTitle>
        <AlertDescription className="text-xs">
          Os estados abaixo não afirmam conexão externa. Serviços sem verificação permanecem
          neutros; CutPlanning/Cut Pro requer saída oficial anexada e CNC continua sujeito aos gates
          industriais.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Módulos Conectados
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
                          item.status.includes("local")
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : item.status === "simulado"
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
                            : res.status === "autoridade XML"
                              ? "bg-blue-600 text-white"
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
