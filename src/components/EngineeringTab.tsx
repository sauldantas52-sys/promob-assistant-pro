import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileSearch,
  Ruler,
  CircleDot,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCode,
  AlertTriangle,
  ClipboardList,
  Binary,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseDXF, DXFGeometry } from "@/lib/dxf-parser";
import { parseExecutivePDF, CriticalDimension } from "@/lib/pdf-parser";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PROMOB_BITOLA_RULES, mapDxfToDrillings } from "@/lib/bitola-engineering";
import { DrillingInspector } from "./DrillingInspector";
import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";

type Part = Pick<
  SupabaseDatabase["public"]["Tables"]["parts"]["Row"],
  | "id"
  | "kind"
  | "length_mm"
  | "machining_blocked"
  | "material"
  | "name"
  | "thickness_mm"
  | "width_mm"
>;

interface EngineeringTabProps {
  projectId: string;
  parts: Part[];
  isValidated?: boolean;
}

export function EngineeringTab({ projectId, parts, isValidated }: EngineeringTabProps) {
  const { data: checks } = useQuery({
    queryKey: ["validation-checks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_checks")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  const gate2Items = ["documentacao_tecnica", "cotas_furacao", "bitolas", "tags_skp"];
  const gate2Ok = gate2Items.every((id) => checks?.find((c) => c.check_type === id)?.is_completed);

  const [pdfData, setPdfData] = useState<CriticalDimension[]>([]);
  const [dxfData, setDxfData] = useState<DXFGeometry[]>([]);
  const [activeView, setActiveView] = useState<"drillings" | "comparison" | "inspect" | "report">(
    "comparison",
  );
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const selectedPart = useMemo(
    () => parts.find((p) => p.id === selectedPartId),
    [parts, selectedPartId],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "dxf") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === "pdf") {
        const dims = await parseExecutivePDF(file);
        setPdfData(dims);
        toast.success(`PDF processado: ${dims.length} cotas detectadas.`);
      } else {
        const text = await file.text();
        const geometry = parseDXF(text);
        setDxfData(geometry);
        toast.success(`DXF processado: ${geometry.length} entidades detectadas.`);
      }
    } catch (err) {
      toast.error(`Falha ao processar arquivo ${type.toUpperCase()}`);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              isValidated
                ? "bg-emerald-600 shadow-emerald-600/20"
                : "bg-amber-600 shadow-amber-600/20",
            )}
          >
            {isValidated ? (
              <ShieldCheck className="h-5 w-5 text-white" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
              Gate industrial · usinagem
            </p>
            <h3 className="text-base font-black uppercase tracking-tight text-slate-950">
              {gate2Ok ? "Protocolo de Usinagem Validado" : "Gate 2: Usinagem Pendente"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {gate2Ok
                ? "Documentação técnica confirmada. Liberação manual permitida."
                : "A liberação individual exige o Gate 2 do checklist concluído."}
            </p>
          </div>
        </div>
        {!gate2Ok && (
          <Badge className="w-fit shrink-0 rounded-md border-none bg-red-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">
            Bloqueio CNC Ativo
          </Badge>
        )}
      </div>

      <Alert className="rounded-lg border-amber-200 bg-amber-50 text-amber-950">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-xs font-black uppercase tracking-wide text-amber-900">
          Autoridade técnica
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed">
          XML é a autoridade de peças e medidas. PDF apoia a leitura de cotas e DXF é conferência
          geométrica; nenhum deles, isoladamente, libera CNC.
          <span className="mt-1 block font-black text-amber-800">
            Nunca deduza medidas, furos ou posições ausentes.
          </span>
        </AlertDescription>
      </Alert>

      <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3">
        <EngineeringSource
          label="XML · autoridade"
          value={parts.length > 0 ? `${parts.length} itens disponíveis` : "Sem peças: gate fechado"}
          ok={parts.length > 0}
        />
        <EngineeringSource
          label="PDF · referência de cotas"
          value={
            pdfData.length > 0 ? `${pdfData.length} cotas locais` : "Arquivo ausente: gate fechado"
          }
          ok={pdfData.length > 0}
        />
        <EngineeringSource
          label="DXF · conferência geométrica"
          value={
            dxfData.length > 0
              ? `${dxfData.length} entidades locais`
              : "Arquivo ausente: gate fechado"
          }
          ok={dxfData.length > 0}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
              <FileSearch className="h-5 w-5 text-blue-600" /> PDF Executivo (Cotas)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <input
              type="file"
              accept=".pdf"
              className="block w-full min-w-0 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-[9px] file:font-black file:uppercase file:text-white"
              onChange={(e) => handleFileUpload(e, "pdf")}
            />
            {pdfData.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                {pdfData.length} cotas críticas extraídas para comparação.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
              <FileCode className="h-5 w-5 text-blue-600" /> DXF · Conferência geométrica
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <input
              type="file"
              accept=".dxf"
              className="block w-full min-w-0 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-[9px] file:font-black file:uppercase file:text-white"
              onChange={(e) => handleFileUpload(e, "dxf")}
            />
            {dxfData.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                {dxfData.length} entidades carregadas para conferência. Sem liberação automática.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1 [scrollbar-width:thin]">
        <div className="flex w-max gap-1">
          <Button
            variant={activeView === "comparison" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-9 shrink-0 rounded-md px-3 text-[9px] font-bold uppercase tracking-wide",
              activeView === "comparison"
                ? "bg-white text-blue-600 shadow-sm hover:bg-white"
                : "text-slate-500",
            )}
            onClick={() => setActiveView("comparison")}
          >
            <Ruler className="h-4 w-4 mr-2" />
            Comparação Técnica
          </Button>
          <Button
            variant={activeView === "drillings" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-9 shrink-0 rounded-md px-3 text-[9px] font-bold uppercase tracking-wide",
              activeView === "drillings"
                ? "bg-white text-blue-600 shadow-sm hover:bg-white"
                : "text-slate-500",
            )}
            onClick={() => setActiveView("drillings")}
          >
            <CircleDot className="h-4 w-4 mr-2" />
            Tela de Furação
          </Button>
          <Button
            variant={activeView === "report" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-9 shrink-0 rounded-md px-3 text-[9px] font-bold uppercase tracking-wide",
              activeView === "report"
                ? "bg-white text-blue-600 shadow-sm hover:bg-white"
                : "text-slate-500",
            )}
            onClick={() => setActiveView("report")}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Relatório Bitolas
          </Button>
        </div>
      </div>

      {activeView === "comparison" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-5 w-5" /> Matriz de Comparação Técnica
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-full overflow-x-auto p-0 [scrollbar-width:thin]">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Peça / Dimensão</TableHead>
                  <TableHead>XML · Autoridade</TableHead>
                  <TableHead>Executivo (PDF)</TableHead>
                  <TableHead>DXF · Conferência</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts
                  .filter((p) => p.kind === "peca")
                  .map((part) => {
                    // Simulação de busca de correspondência (Match heurístico)
                    const pdfMatch = pdfData.find(
                      (d) =>
                        Math.abs(d.value - (part.width_mm || 0)) < 1 ||
                        Math.abs(d.value - (part.length_mm || 0)) < 1,
                    );

                    const isMatched = !!pdfMatch;

                    const rule = PROMOB_BITOLA_RULES.find(
                      (r) => Math.abs((part.thickness_mm || 0) - r.bitola) <= r.tolerancia_mm,
                    );

                    return (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">
                          {part.name}
                          {rule && (
                            <div className="text-[10px] text-muted-foreground uppercase mt-1">
                              Bitola Promob: {rule.bitola}mm ({rule.description})
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {part.width_mm} × {part.length_mm} mm
                        </TableCell>
                        <TableCell>
                          {pdfMatch ? (
                            <span className="text-green-600 font-medium">
                              {pdfMatch.value} {pdfMatch.unit}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Não detectado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dxfData.length > 0 ? (
                            <span className="font-medium text-blue-600">
                              Geometria carregada · conferir
                            </span>
                          ) : (
                            "Aguardando DXF..."
                          )}
                        </TableCell>
                        <TableCell>
                          {isMatched && rule ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Comparado localmente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200">
                              <AlertCircle className="h-3 w-3 mr-1" />{" "}
                              {rule ? "Medida PDF?" : "Bitola Desconhecida"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeView === "drillings" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="h-5 w-5" /> Mapa de Furação e Usinagem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1 space-y-4">
                <h3 className="text-sm font-semibold">Peças Fabricáveis</h3>
                <ScrollArea className="h-[400px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {parts
                      .filter((p) => p.kind === "peca")
                      .map((part) => (
                        <button
                          key={part.id}
                          onClick={() => setSelectedPartId(part.id)}
                          className={`w-full text-left p-2 text-xs rounded hover:bg-muted flex items-center justify-between group transition-colors ${selectedPartId === part.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                        >
                          <span className={selectedPartId === part.id ? "font-bold" : ""}>
                            {part.name}
                          </span>
                          <ChevronRight
                            className={`h-3 w-3 transition-opacity ${selectedPartId === part.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          />
                        </button>
                      ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="md:col-span-2 space-y-4">
                {selectedPart ? (
                  <div className="space-y-6">
                    <DrillingInspector
                      drillings={selectedPart ? mapDxfToDrillings(dxfData, selectedPart) : []}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="p-3 border rounded-lg bg-amber-50/50">
                        <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">
                          Grau de Confirmação
                        </p>
                        <p className="text-lg font-bold">0%</p>
                        <p className="text-[10px] text-amber-600 mt-1">
                          Aguardando validação técnica
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg bg-blue-50/50">
                        <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">
                          Peça Selecionada
                        </p>
                        <p className="text-sm font-bold">{selectedPart.name}</p>
                        <p className="text-[10px] text-blue-600 mt-1">
                          {selectedPart.width_mm}x{selectedPart.length_mm}x
                          {selectedPart.thickness_mm}mm
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                    <div className="text-center">
                      <Database className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground font-medium">
                        Selecione uma peça para ver o mapa de furação
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Origem DXF e Confirmação Técnica exigida
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === "report" && (
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50/50">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <ClipboardList className="h-5 w-5" /> Relatório Técnico de Bitolas e Tolerâncias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {PROMOB_BITOLA_RULES.map((rule) => (
                  <div key={rule.bitola} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-lg font-bold">{rule.bitola}mm</span>
                      <Badge variant="secondary">±{rule.tolerancia_mm}mm</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                ))}
              </div>

              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <Binary className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-900 font-bold">
                  MATRIZ DE AUDITORIA CRÍTICA
                </AlertTitle>
                <AlertDescription className="text-xs text-red-800">
                  Relacionando bitolas nominais aos códigos reais e tolerâncias permitidas.
                  <strong>
                    {" "}
                    A liberação de usinagem exige conformidade 100% com a matriz abaixo.
                  </strong>
                </AlertDescription>
              </Alert>

              <div className="max-w-full overflow-x-auto [scrollbar-width:thin]">
                <Table className="min-w-[680px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead>Bitola Real</TableHead>
                      <TableHead>Padrão / Origem</TableHead>
                      <TableHead>Tolerância</TableHead>
                      <TableHead>Usinagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts
                      .filter((p) => p.kind === "peca")
                      .map((part) => {
                        const rule = PROMOB_BITOLA_RULES.find(
                          (r) => Math.abs((part.thickness_mm || 0) - r.bitola) <= r.tolerancia_mm,
                        );
                        return (
                          <TableRow key={part.id}>
                            <TableCell className="text-xs font-medium">{part.name}</TableCell>
                            <TableCell className="text-xs">{part.thickness_mm}mm</TableCell>
                            <TableCell className="text-xs">
                              {rule ? (
                                <div className="flex flex-col">
                                  <span>{rule.bitola}mm</span>
                                  <span className="text-[10px] text-muted-foreground italic">
                                    {rule.origem_regra}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-red-600 font-bold">Não identificado</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {rule ? `±${rule.tolerancia_mm}mm` : "-"}
                            </TableCell>
                            <TableCell>
                              {part.machining_blocked ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  BLOQUEADO
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600 text-[10px]">LIBERADO</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EngineeringSource({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <span className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")} />
      </div>
      <p className={cn("mt-1.5 text-xs font-bold", ok ? "text-slate-700" : "text-red-700")}>
        {value}
      </p>
    </div>
  );
}
