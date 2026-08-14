import { useState, useMemo } from "react";
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
  Binary
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseDXF, DXFGeometry } from "@/lib/dxf-parser";
import { parseExecutivePDF, CriticalDimension } from "@/lib/pdf-parser";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PROMOB_BITOLA_RULES, mapDxfToDrillings, DrillingCoordinate } from "@/lib/bitola-engineering";
import { DrillingInspector } from "./DrillingInspector";

interface EngineeringTabProps {
  projectId: string;
  parts: any[];
}


export function EngineeringTab({ projectId, parts }: EngineeringTabProps) {
  const [pdfData, setPdfData] = useState<CriticalDimension[]>([]);
  const [dxfData, setDxfData] = useState<DXFGeometry[]>([]);
  const [activeView, setActiveView] = useState<'drillings' | 'comparison' | 'inspect' | 'report'>('comparison');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  
  const selectedPart = useMemo(() => 
    parts.find(p => p.id === selectedPartId),
    [parts, selectedPartId]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'dxf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'pdf') {
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
    <div className="space-y-6">
      <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-bold">PROTOCOLO DE ENGENHARIA ATIVO</AlertTitle>
        <AlertDescription>
          A visualização 3D está suspensa até a validação das cotas críticas via PDF e furações via DXF. 
          <strong> Nunca deduza medidas ou posições.</strong>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSearch className="h-4 w-4" /> PDF Executivo (Cotas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input 
              type="file" 
              accept=".pdf" 
              className="text-xs" 
              onChange={(e) => handleFileUpload(e, 'pdf')} 
            />
            {pdfData.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                {pdfData.length} cotas críticas extraídas para comparação.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCode className="h-4 w-4" /> DXF ASCII (Furação/Geometria)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input 
              type="file" 
              accept=".dxf" 
              className="text-xs" 
              onChange={(e) => handleFileUpload(e, 'dxf')} 
            />
            {dxfData.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                {dxfData.length} pontos geométricos mapeados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button 
          variant={activeView === 'comparison' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('comparison')}
        >
          <Ruler className="h-4 w-4 mr-2" />
          Comparação XML × PDF × DXF
        </Button>
        <Button 
          variant={activeView === 'drillings' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('drillings')}
        >
          <CircleDot className="h-4 w-4 mr-2" />
          Tela de Furação
        </Button>
        <Button 
          variant={activeView === 'report' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('report')}
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          Relatório de Bitolas
        </Button>
      </div>

      {activeView === 'comparison' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-5 w-5" /> Matriz de Comparação Técnica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peça / Dimensão</TableHead>
                  <TableHead>Promob (XML)</TableHead>
                  <TableHead>Executivo (PDF)</TableHead>
                  <TableHead>Projeto (DXF)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.filter(p => p.kind === 'peca').map((part) => {
                  // Simulação de busca de correspondência (Match heurístico)
                  const pdfMatch = pdfData.find(d => 
                    Math.abs(d.value - (part.width_mm || 0)) < 1 || 
                    Math.abs(d.value - (part.length_mm || 0)) < 1
                  );
                  
                  const isMatched = !!pdfMatch;

                    const rule = PROMOB_BITOLA_RULES.find(r => 
                      Math.abs((part.thickness_mm || 0) - r.bitola) <= r.tolerancia_mm
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
                        <TableCell>{part.width_mm} × {part.length_mm} mm</TableCell>
                        <TableCell>
                          {pdfMatch ? (
                            <span className="text-green-600 font-medium">{pdfMatch.value} {pdfMatch.unit}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Não detectado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dxfData.length > 0 ? (
                            <span className="text-blue-600 font-medium">Extraído via DXF</span>
                          ) : (
                            "Aguardando DXF..."
                          )}
                        </TableCell>
                        <TableCell>
                          {isMatched && rule ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Validado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200">
                              <AlertCircle className="h-3 w-3 mr-1" /> {rule ? "Medida PDF?" : "Bitola Desconhecida"}
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

      {activeView === 'drillings' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="h-5 w-5" /> Mapa de Furação e Usinagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1 space-y-4">
                <h3 className="text-sm font-semibold">Peças Fabricáveis</h3>
                <ScrollArea className="h-[400px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {parts.filter(p => p.kind === 'peca').map(part => (
                      <button 
                        key={part.id}
                        onClick={() => setSelectedPartId(part.id)}
                        className={`w-full text-left p-2 text-xs rounded hover:bg-muted flex items-center justify-between group transition-colors ${selectedPartId === part.id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
                      >
                        <span className={selectedPartId === part.id ? 'font-bold' : ''}>{part.name}</span>
                        <ChevronRight className={`h-3 w-3 transition-opacity ${selectedPartId === part.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="md:col-span-2 space-y-4">
                {selectedPart ? (
                  <div className="space-y-6">
                    <DrillingInspector 
                      drillings={selectedPartId ? mapDxfToDrillings(dxfData, selectedPartId) : []} 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg bg-amber-50/50">
                        <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Grau de Confirmação</p>
                        <p className="text-lg font-bold">0%</p>
                        <p className="text-[10px] text-amber-600 mt-1">Aguardando validação técnica</p>
                      </div>
                      <div className="p-3 border rounded-lg bg-blue-50/50">
                        <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Peça Selecionada</p>
                        <p className="text-sm font-bold">{selectedPart.name}</p>
                        <p className="text-[10px] text-blue-600 mt-1">{selectedPart.width_mm}x{selectedPart.length_mm}x{selectedPart.thickness_mm}mm</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                    <div className="text-center">
                      <Database className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground font-medium">Selecione uma peça para ver o mapa de furação</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Origem DXF e Confirmação Técnica exigida</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'report' && (
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50/50">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <ClipboardList className="h-5 w-5" /> Relatório Técnico de Bitolas e Tolerâncias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {PROMOB_BITOLA_RULES.map(rule => (
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
                <AlertTitle className="text-red-900 font-bold">MATRIZ DE AUDITORIA CRÍTICA</AlertTitle>
                <AlertDescription className="text-xs text-red-800">
                  Relacionando bitolas nominais aos códigos reais e tolerâncias permitidas. 
                  <strong> A liberação de usinagem exige conformidade 100% com a matriz abaixo.</strong>
                </AlertDescription>
              </Alert>

              <Table>
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
                  {parts.filter(p => p.kind === 'peca').map(part => {
                    const rule = PROMOB_BITOLA_RULES.find(r => 
                      Math.abs((part.thickness_mm || 0) - r.bitola) <= r.tolerancia_mm
                    );
                    return (
                      <TableRow key={part.id}>
                        <TableCell className="text-xs font-medium">{part.name}</TableCell>
                        <TableCell className="text-xs">{part.thickness_mm}mm</TableCell>
                        <TableCell className="text-xs">
                          {rule ? (
                            <div className="flex flex-col">
                              <span>{rule.bitola}mm</span>
                              <span className="text-[10px] text-muted-foreground italic">{rule.origem_regra}</span>
                            </div>
                          ) : (
                            <span className="text-red-600 font-bold">Não identificado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{rule ? `±${rule.tolerancia_mm}mm` : '-'}</TableCell>
                        <TableCell>
                          {part.machining_blocked ? (
                            <Badge variant="destructive" className="text-[10px]">BLOQUEADO</Badge>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
