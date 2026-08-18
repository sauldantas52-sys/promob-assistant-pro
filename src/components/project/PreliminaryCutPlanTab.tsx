import { Scissors, ShieldCheck, Layers, Package, Settings as Tool, AlertCircle, Ruler, Box, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IndustrialCutPlanEngine, CutPlanGroup, Sheet, Placement } from "@/lib/cut-plan/engine";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndustrialLabelsTab } from "./labels/IndustrialLabelsTab";
import { useEffect, useState } from "react";


export function PreliminaryCutPlanTab({ projectId }: { projectId: string }) {
  const [integrityStatus, setIntegrityStatus] = useState<'validating' | 'pass' | 'fail'>('validating');
  const [integrityErrors, setIntegrityErrors] = useState<string[]>([]);

  const { data: cutPlanGroups, isLoading } = useQuery({
    queryKey: ["industrial_cut_plan", projectId],
    queryFn: () => IndustrialCutPlanEngine.generateForProject(projectId),
  });

  const { data: allParts, isLoading: partsLoading } = useQuery({
    queryKey: ["parts_audit", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (cutPlanGroups && allParts) {
      validateIntegrity(cutPlanGroups, projectId);
    }
  }, [cutPlanGroups, allParts]);

  const validateIntegrity = (groups: CutPlanGroup[], targetProjectId: string) => {
    // Apenas rodar validação pesada se for o projeto Closet solicitado ou se quisermos manter global
    const errors: string[] = [];
    let totalPhysicalPieces = 0;
    let totalAllocated = 0;

    groups.forEach(group => {
      totalPhysicalPieces += group.pieces.length;
      group.sheets.forEach(sheet => {
        sheet.shelves.forEach(shelf => {
          totalAllocated += shelf.placements.length;
          shelf.placements.forEach(p => {
            // Trim validation
            if (p.x < 5 || p.y < 5) errors.push(`Placement invadiu margem esquerda/topo: ${p.physicalId}`);
            if (p.x + p.w > 2745) errors.push(`Placement invadiu margem direita: ${p.physicalId}`);
            if (p.y + p.h > 1825) errors.push(`Placement invadiu margem inferior: ${p.physicalId}`);
          });
        });
      });
    });

    if (totalPhysicalPieces !== totalAllocated) {
      errors.push(`Divergência de peças: Esperado ${totalPhysicalPieces}, Alocado ${totalAllocated}`);
    }

    if (errors.length > 0) {
      setIntegrityStatus('fail');
      setIntegrityErrors(errors);
    } else {
      setIntegrityStatus('pass');
    }
  };

  if (isLoading || partsLoading) return <div className="p-8 text-center text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">Calculando Nesting Industrial Real...</div>;


  // Filtros de Auditoria
  const cutParts = allParts?.filter(p => (p.kind === 'peca' || p.kind === 'chapa') && p.thickness_mm) || [];
  const hardware = allParts?.filter(p => p.kind === 'ferragem') || [];
  const accessories = allParts?.filter(p => p.kind === 'acessorio') || [];
  const noMaterial = allParts?.filter(p => (p.kind === 'peca' || p.kind === 'chapa') && !p.material) || [];
  const noThickness = allParts?.filter(p => (p.kind === 'peca' || p.kind === 'chapa') && !p.thickness_mm) || [];

  const excluded = allParts?.filter(p => 
    !cutParts.find(cp => cp.id === p.id) && 
    !hardware.find(h => h.id === p.id) && 
    !accessories.find(a => a.id === p.id)
  ) || [];

  const renderCutGroup = (group: CutPlanGroup) => {
    const { supplier, material, color, thicknessMm, sheets, stats, pieces } = group;
    const label = `${color} ${thicknessMm}mm`;
    const totalItems = pieces.length;
    const totalRepetitions = stats.totalPieces;
    const totalArea = stats.totalAreaPieces;

    return (
      <Card key={group.groupKey} className="overflow-hidden border-2 border-slate-200 shadow-sm mb-6">
        <CardHeader className="bg-slate-900 text-white py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-lime-500 flex items-center justify-center">
                <Layers className="h-5 w-5 text-slate-900" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tighter">MDF {label}</CardTitle>
                <div className="flex gap-4 mt-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Itens: {totalItems}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Repetições: {totalRepetitions}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Chapas: {stats.sheetCount}</span>
                  <span className="text-[9px] font-bold text-lime-400 uppercase tracking-widest ml-2 border-l border-slate-700 pl-2">Área Útil: 2740 x 1820 mm</span>
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest ml-2 border-l border-slate-700 pl-2">Kerf: 4mm</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-lime-400 uppercase tracking-widest">Aproveitamento</p>
              <p className="text-xl font-black">{stats.utilizationPercent.toFixed(1)}%</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8 bg-slate-50">
          {/* Visualização das Chapas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sheets.map((sheet, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Chapa {idx + 1}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[8px] font-bold text-slate-400 border-slate-200">REFILO 5mm</Badge>
                    <span className="text-[9px] font-bold text-slate-400 italic">2750 x 1830 mm</span>
                  </div>
                </div>
                <div 
                  className="relative bg-white border-2 border-slate-300 rounded shadow-inner overflow-hidden"
                  style={{ 
                    aspectRatio: '2750/1830',
                    width: '100%'
                  }}
                >
                  {/* Linha de Refilo (Tracejada) */}
                  <div 
                    className="absolute border border-dashed border-slate-300 pointer-events-none z-10"
                    style={{
                      left: `${(5 / 2750) * 100}%`,
                      top: `${(5 / 1830) * 100}%`,
                      right: `${(5 / 2750) * 100}%`,
                      bottom: `${(5 / 1830) * 100}%`,
                    }}
                  />

                  {/* Placements */}
                  {sheet.shelves.flatMap(s => s.placements).map((p, pIdx) => (
                    <div 
                      key={pIdx}
                      className="absolute border border-slate-900 flex flex-col items-center justify-center overflow-hidden hover:opacity-80 transition-opacity cursor-help group p-0.5"
                      title={`${p.piece.name} (${p.w}x${p.h}) - Módulo: ${p.piece.moduleName || 'N/A'}`}
                      style={{
                        left: `${(p.x / 2750) * 100}%`,
                        top: `${(p.y / 1830) * 100}%`,
                        width: `${(p.w / 2750) * 100}%`,
                        height: `${(p.h / 1830) * 100}%`,
                        backgroundColor: `hsla(${(Number(p.piece.moduleId?.split('-')[0] || 0) * 57) % 360}, 70%, 90%, 0.8)`,
                        borderColor: `hsl(${(Number(p.piece.moduleId?.split('-')[0] || 0) * 57) % 360}, 70%, 40%)`
                      }}
                    >
                      {/* Identificação da Peça */}
                      <div className="w-full h-full flex flex-col relative pointer-events-none">
                         {/* Top row */}
                         <div className="flex justify-between w-full px-0.5 pt-0.5">
                            <span className="text-[5px] font-black opacity-60">G{(p.piece.moduleSequence || 0)}</span>
                            <span className="text-[5px] font-black opacity-60">#{p.piece.pieceSequence}{p.rotated ? ' ↻' : ''}</span>
                         </div>
                         
                         {/* Center content */}
                         <div className="flex-1 flex flex-col items-center justify-center text-center overflow-hidden">
                            {p.w > 40 && p.h > 20 && (
                              <span className="text-[6px] font-bold truncate w-full px-1">{p.piece.name}</span>
                            )}
                            {p.w > 30 && p.h > 15 && (
                              <span className="text-[7px] font-black">{p.w}x{p.h}</span>
                            )}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tabela de Peças do Grupo */}
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[9px] font-black uppercase px-4">Peça / UID</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-center">W x L (mm)</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-center">Rep / Status</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-right px-4">Área</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieces.map((part) => {
                  const area = (part.widthMm * part.lengthMm) / 1000000;
                  return (
                    <TableRow key={part.physicalId} className="text-[10px] hover:bg-slate-50 border-slate-100">
                      <TableCell className="px-4 py-2">
                        <p className="font-black text-slate-900 uppercase">{part.name}</p>
                        <p className="text-[8px] font-mono text-slate-400">UID: {part.idXml}</p>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-slate-700">
                        {part.widthMm} x {part.lengthMm}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[8px] font-bold uppercase bg-lime-50 text-lime-700 border-lime-200">
                          {part.repetitionIndex + 1}/{part.metadata?.repetition || 1} ALOCADA
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-4 font-bold text-slate-900">
                        {area.toFixed(3)} m²
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const allPieces = cutPlanGroups?.flatMap(g => g.pieces) || [];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-4 lg:p-0 print:p-0">
      <div className="no-print">
        {integrityStatus === 'fail' ? (
          <Alert variant="destructive" className="rounded-xl border-2 border-red-500 bg-red-50 shadow-sm mb-6">
            <AlertCircle className="h-5 w-5" />
            <div>
              <AlertTitle className="text-sm font-black uppercase tracking-widest">Falha de Integridade Industrial</AlertTitle>
              <AlertDescription className="text-xs font-medium mt-1 leading-relaxed">
                Foram detectados erros no motor de corte que impedem a liberação das etiquetas:
                <ul className="list-disc ml-4 mt-2">
                  {integrityErrors.slice(0, 3).map((err, i) => <li key={i}>{err}</li>)}
                  {integrityErrors.length > 3 && <li>... e mais {integrityErrors.length - 3} erros.</li>}
                </ul>
              </AlertDescription>
            </div>
          </Alert>
        ) : (
          <Alert className="rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-900 shadow-sm mb-6">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <div>
              <AlertTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                Plano de Corte Industrial Real (Banco de Dados)
                {integrityStatus === 'pass' && <Badge className="bg-emerald-500 text-white border-none ml-2">INTEGRIDADE OK</Badge>}
              </AlertTitle>
              <AlertDescription className="text-xs font-medium mt-1 leading-relaxed">
                Fonte: XML Promob • Persistência confirmada via consulta direta. Ferragens e itens sem espessura estão segregados na auditoria.
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="plano" className="w-full no-print">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl h-12">
          <TabsTrigger value="plano" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900">
            <Layers className="h-4 w-4 mr-2" /> Plano de Corte
          </TabsTrigger>
          <TabsTrigger value="etiquetas" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Printer className="h-4 w-4 mr-2" /> Etiquetas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="plano" className="mt-6">
          {/* Visão Resumida */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {cutPlanGroups?.map(group => (

        {cutPlanGroups?.map(group => (
          <Card key={group.groupKey} className="border-2 border-slate-100 shadow-none">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{group.color} {group.thicknessMm}mm</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-black text-slate-900">{group.stats.totalAreaPieces.toFixed(2)} <span className="text-xs text-slate-400">m²</span></p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{group.stats.sheetCount} CHAPAS (NESTING)</p>
                </div>
                <Box className="h-8 w-8 text-slate-100" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

          </div>
          
          <div className="space-y-6">
            {cutPlanGroups?.map(group => renderCutGroup(group))}
          </div>
        </TabsContent>
        
        <TabsContent value="etiquetas" className="mt-6">
          <IndustrialLabelsTab pieces={allPieces} />
        </TabsContent>
      </Tabs>

      <div className="print-area hidden print:block">
        <IndustrialLabelsTab pieces={allPieces} />
      </div>

      <div className="no-print space-y-8">
        {/* Tabela de Auditoria solicitada */}

      <Card className="border-2 border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Tool className="h-4 w-4" /> Auditoria de Integridade do Plano
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-bold text-xs uppercase px-6">Total de Parts no Banco</TableCell>
                <TableCell className="text-right px-6 font-black">{allParts?.length || 0}</TableCell>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-bold text-xs uppercase px-6">Total de Parts consideradas no corte</TableCell>
                <TableCell className="text-right px-6 font-black text-lime-600">{cutParts.length}</TableCell>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-bold text-xs uppercase px-6">Total de Ferragens</TableCell>
                <TableCell className="text-right px-6 font-black">{hardware.length}</TableCell>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-bold text-xs uppercase px-6">Total de Acessórios</TableCell>
                <TableCell className="text-right px-6 font-black">{accessories.length}</TableCell>
              </TableRow>
              <TableRow className={cn("hover:bg-transparent", noMaterial.length > 0 && "bg-amber-50")}>
                <TableCell className="font-bold text-xs uppercase px-6">Total de Parts sem material</TableCell>
                <TableCell className="text-right px-6 font-black">{noMaterial.length}</TableCell>
              </TableRow>
              <TableRow className={cn("hover:bg-transparent", noThickness.length > 0 && "bg-red-50")}>
                <TableCell className="font-bold text-xs uppercase px-6">Total de Parts sem espessura</TableCell>
                <TableCell className="text-right px-6 font-black">{noThickness.length}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fora do Plano de Corte */}
      {(hardware.length > 0 || accessories.length > 0 || excluded.length > 0) && (
        <Card className="border-2 border-red-100 bg-red-50/30 overflow-hidden">
          <CardHeader className="bg-red-50 border-b border-red-100 py-3 px-6">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Fora do Plano de Corte (Segregado)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[9px] font-black uppercase px-6">Item</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Tipo</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Motivo Real</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...hardware, ...accessories, ...excluded].map(item => (
                  <TableRow key={item.id} className="text-[10px] hover:bg-red-50 border-red-50">
                    <TableCell className="px-6 py-2 font-bold uppercase">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[8px] uppercase font-black">{item.kind}</Badge>
                    </TableCell>
                    <TableCell className="text-red-600 font-bold italic">
                      {item.kind === 'ferragem' ? 'ITEM DE FERRAGEM' : 
                       item.kind === 'acessorio' ? 'ITEM DE ACESSÓRIO' : 
                       !item.thickness_mm ? 'ESPESSURA NÃO INFORMADA NO XML' : 'TIPO NÃO CLASSIFICADO PARA CORTE'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Rodapé de Validação */}
      <footer className="bg-slate-900 text-white p-8 rounded-xl shadow-2xl border-t-4 border-lime-400">
        <h2 className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-6">Plano de Corte Gerado a Partir do Banco</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <div>
             <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Project ID</p>
             <p className="text-sm font-mono font-bold mt-1 text-slate-300">{projectId}</p>
           </div>
           <div>
             <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Total de Parts</p>
             <p className="text-2xl font-black mt-1">{allParts?.length || 0}</p>
           </div>
           <div>
             <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Itens de Corte</p>
             <p className="text-2xl font-black mt-1 text-lime-400">{cutParts.length}</p>
           </div>
           <div>
             <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Fonte de Dados</p>
             <p className="text-sm font-black mt-1 uppercase">XML PROMOB (Industrial)</p>
           </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-4">
           <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded text-[9px] font-bold uppercase text-slate-400">
             <Tool className="h-3 w-3" /> Ferragens: {hardware.length}
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded text-[9px] font-bold uppercase text-slate-400">
             <Package className="h-3 w-3" /> Acessórios: {accessories.length}
           </div>
        </div>
      </footer>
    </div>
  );
}
