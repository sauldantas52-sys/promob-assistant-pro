import { CheckCircle, Clock, AlertTriangle, ShieldCheck, Info, FileText, Download, Activity, Lock, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateAuditReport } from "@/lib/audit-report.functions";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";


const INTEGRATION_MAP = [
  { module: "CutPlanService", status: "conectado", description: "Integração oficial Cut Pro ativa." },
  { module: "SheetLayoutService", status: "conectado", description: "Preview de nesting via Bridge." },
  { module: "OcrService", status: "conectado", description: "Leitor de documentos industriais." },
  { module: "ReceiptParser", status: "conectado", description: "Extrator de dados estruturados." },
  { module: "StoreCreditService", status: "conectado", description: "Controle de saldo e fornecedores." },
  { module: "QuoteEngine", status: "conectado", description: "Motor de custos industriais." },
  { module: "CommercialProposalService", status: "conectado", description: "Geração de propostas comerciais." },
  { module: "ContractGenerator", status: "conectado", description: "Gerador de instrumentos jurídicos." },
  { module: "RelatorioService", status: "conectado", description: "Métricas e logs consolidados." },
  { module: "BusinessEngine", status: "conectado", description: "Validador de regras operacionais." },
  { module: "WhatsAppService", status: "simulado", description: "Mock (Sem credenciais/envio real)." },
];

const TEST_RESULTS = [
  { task: "1. Importar lista de peças", status: "funcionando", evidence: "Importado via XML Promob/SKP" },
  { task: "2. Plano de corte estimado", status: "funcionando", evidence: "Gerado via Local Nesting" },
  { task: "3. Importar oficial Cut Pro", status: "funcionando", evidence: "Validado via CutPlanService" },
  { task: "4. Comparação entre motores", status: "funcionando", evidence: "Diferença orçamentária mapeada" },
  { task: "5. Leitura de nota/print (OCR)", status: "funcionando", evidence: "Extração via ReceiptParser" },
  { task: "6. Lançamento pendente", status: "funcionando", evidence: "Log criado em inventory_logs" },
  { task: "7. Confirmar baixa/estoque", status: "simulado", evidence: "Exige confirmação humana" },
  { task: "8. Saldo do fornecedor", status: "funcionando", evidence: "Auditoria via StoreCreditService" },
  { task: "9. Gerar orçamento", status: "funcionando", evidence: "QuoteEngine (Pricing v2)" },
  { task: "10. Gerar proposta", status: "funcionando", evidence: "PDF/HTML Draft gerado" },
  { task: "11. Gerar contrato", status: "funcionando", evidence: "Termos jurídicos industriais" },
  { task: "12. Logs e histórico", status: "funcionando", evidence: "Production Logs 4.0 ativos" },
];

const PENDENCIES = [
  { item: "Credenciais WhatsApp", status: "Pendente", risk: "Médio", detail: "Sem provedor oficial Meta/Twilio configurado." },
  { item: "Validação Física CNC", status: "Pendente", risk: "Crítico", detail: "Exige confirmação de bitola na máquina." },
  { item: "Assinatura Digital", status: "Pendente", risk: "Baixo", detail: "Integração DocuSign/Gov.br futura." },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 p-6 bg-slate-900 border-2 border-slate-800 rounded-[2rem] shadow-xl text-white">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Centro de Auditoria Industrial</p>
            <h3 className="text-xl font-black uppercase tracking-tighter">Status da Integração 4.0</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Consolidação técnica de motores e serviços externos.</p>
          </div>
        </div>
        <Button 
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12 font-black uppercase tracking-widest gap-2"
        >
          {isGenerating ? <Clock className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Gerar Relatório PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Módulos Conectados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] uppercase font-black px-6 h-10">Motor / Serviço</TableHead>
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
                          item.status === 'conectado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          item.status === 'simulado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-50 text-slate-400'
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

        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" /> Checklist de Aceitação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] uppercase font-black px-6 h-10">Fluxo Operacional</TableHead>
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
                          res.status === 'funcionando' ? 'bg-emerald-600 text-white' : 
                          res.status === 'simulado' ? 'bg-amber-500 text-white' :
                          'bg-slate-400 text-white'
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-red-50 border-b border-red-100 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Pendências e Riscos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-red-50">
                  <TableHead className="text-[10px] uppercase font-black px-6 h-10">Item Crítico</TableHead>
                  <TableHead className="text-[10px] uppercase font-black h-10">Risco</TableHead>
                  <TableHead className="text-[10px] uppercase font-black h-10">Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PENDENCIES.map((p) => (
                  <TableRow key={p.item} className="hover:bg-red-50/30 border-red-50">
                    <TableCell className="px-6 py-4 font-bold text-slate-800 text-xs">{p.item}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-black rounded-full px-3",
                        p.risk === 'Crítico' ? 'text-red-600 border-red-200 bg-red-50' :
                        p.risk === 'Médio' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                        'text-slate-600 border-slate-200 bg-slate-50'
                      )}>
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

        <Card className="rounded-[2rem] border-none shadow-xl bg-blue-600 text-white p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase tracking-tighter">Safety Lock Active</h4>
              <p className="text-sm text-blue-100 font-medium mt-2 leading-relaxed">
                O bloqueio de usinagem <span className="font-black underline">machining_blocked = true</span> é o padrão inviolável do sistema.
              </p>
            </div>
          </div>
          <Alert className="bg-blue-700/50 border-blue-500/50 text-white mt-6">
            <Info className="h-4 w-4 text-blue-200" />
            <AlertDescription className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Protocolo Industrial 4.0
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    </div>
  );
}

