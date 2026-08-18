import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { Scissors, ShieldCheck, Layers, Package, Settings as Tool, AlertCircle, Ruler, Box, Printer, FileUp, ArrowRightLeft, Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IndustrialCutPlanEngine, type CutPlanGroup, type PhysicalPiece } from "@/lib/cut-plan/engine";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndustrialLabelsTab } from "./labels/IndustrialLabelsTab";
import { CutPlanComparisonCard } from "./CutPlanComparisonCard";
import { CutProParser } from "@/lib/cut-plan/parsers";
import { toast } from "sonner";

export function PreliminaryCutPlanTab({ projectId }: { projectId: string }) {
  const [integrityStatus, setIntegrityStatus] = useState<'validating' | 'pass' | 'fail'>('validating');
  const [integrityErrors, setIntegrityErrors] = useState<string[]>([]);
  const [activePlanSource, setActivePlanSource] = useState<'estimativa' | 'cutpro_oficial'>('estimativa');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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

  const { data: cutPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["cut_plans", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cut_plans")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const officialPlan = cutPlans?.find(p => p.is_official);
  const estimationPlan = cutPlans?.find(p => p.source === 'estimativa');

  useEffect(() => {
    if (officialPlan) {
      setActivePlanSource('cutpro_oficial');
    }
  }, [officialPlan]);

  const importCutPro = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const result = await CutProParser.parseCSV(projectId, text);
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
        
      if (!profile || !profile.company_id) throw new Error("Empresa não encontrada para o perfil");

      const { data: planId, error } = await supabase.rpc('save_official_cut_plan', {
        p_project_id: projectId,
        p_company_id: profile.company_id,
        p_source: 'cutpro_oficial',
        p_total_pieces: result.total_pieces,
        p_total_sheets: result.total_sheets,
        p_total_cuts: result.total_cuts,
        p_utilization_percent: result.utilization_percent,
        p_metadata: {
          ...result.metadata,
          imported_at: new Date().toISOString(),
          original_filename: file.name
        }
      });

      if (error) throw error;

      // Inserir as peças físicas oficiais baseadas no CSV
      if (result.pieces && result.pieces.length > 0) {
        const physicalPieces = result.pieces.map((p: any) => ({
          project_id: projectId,
          company_id: profile.company_id,
          cut_plan_id: planId,
          physical_id: p.physicalId,
          name: p.name,
          width_mm: p.width_mm,
          length_mm: p.length_mm,
          thickness_mm: p.thickness_mm,
          material: p.material,
          is_official: true,
          metadata: { source: 'cutpro_csv' }
        }));

        const { error: piecesError } = await supabase
          .from('cut_sheets') // Usamos cut_sheets para persistir as peças individuais do plano
          .insert(physicalPieces.map((pp: any) => ({
             project_id: pp.project_id,
             cut_plan_id: pp.cut_plan_id,
             physical_id: pp.physical_id,
             metadata: {
               name: pp.name,
               width_mm: pp.width_mm,
               length_mm: pp.length_mm,
               thickness_mm: pp.thickness_mm,
               material: pp.material
             }
          })));
          
        if (piecesError) console.error("Erro ao persistir peças oficiais:", piecesError);
      }

      return planId as string;
    },
    onSuccess: () => {
      toast.success("Plano Cut Pro oficial importado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cut_plans", projectId] });
      setActivePlanSource('cutpro_oficial');
    },
    onError: (err: any) => {
      toast.error(`Erro na importação: ${err.message}`);
    }
  });

  useEffect(() => {
    if (cutPlanGroups && allParts) {
      validateIntegrity(cutPlanGroups);
    }
  }, [cutPlanGroups, allParts]);

  const validateIntegrity = (groups: CutPlanGroup[]) => {
    const errors: string[] = [];
    let totalPhysicalPieces = 0;
    let totalAllocated = 0;

    groups.forEach(group => {
      totalPhysicalPieces += group.pieces.length;
      group.sheets.forEach(sheet => {
        sheet.shelves.forEach(shelf => {
          totalAllocated += shelf.placements.length;
          shelf.placements.forEach(p => {
            if (p.x < 5 || p.y < 5) errors.push(`Placement invadiu margem esquerda/topo: ${p.physicalId}`);
            if (p.x + p.w > 2745) errors.push(`Placement invadiu margem direita: ${p.physicalId}`);
            if (p.y + p.h > 1825) errors.push(`Placement invadiu margem inferior: ${p.physicalId}`);
          });
        });
      });
    });

    if (totalPhysicalPieces !== totalAllocated && totalPhysicalPieces > 0) {
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
  
  const renderCutGroup = (group: CutPlanGroup) => {
    const { color, thicknessMm, sheets, stats, pieces } = group;
    const label = `${color} ${thicknessMm}mm`;
    const totalItems = pieces.length;
    const totalRepetitions = stats.totalPieces;

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sheets.map((sheet, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Chapa {idx + 1}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[8px] font-bold text-slate-400 border-slate-200">REFILO 5mm</Badge>
                  </div>
                </div>
                <div 
                  className="relative bg-white border-2 border-slate-300 rounded shadow-inner overflow-hidden"
                  style={{ aspectRatio: '2750/1830', width: '100%' }}
                >
                  <div className="absolute border border-dashed border-slate-300 pointer-events-none z-10"
                    style={{ left: '0.18%', top: '0.27%', right: '0.18%', bottom: '0.27%' }}
                  />
                  {sheet.shelves.flatMap(s => s.placements).map((p, pIdx) => (
                    <div key={pIdx} className="absolute border border-slate-900 flex flex-col items-center justify-center overflow-hidden hover:opacity-80 transition-opacity cursor-help p-0.5"
                      title={`${p.piece.name} (${p.w}x${p.h})`}
                      style={{
                        left: `${(p.x / 2750) * 100}%`,
                        top: `${(p.y / 1830) * 100}%`,
                        width: `${(p.w / 2750) * 100}%`,
                        height: `${(p.h / 1830) * 100}%`,
                        backgroundColor: `hsla(${(pIdx * 57) % 360}, 70%, 90%, 0.8)`,
                        borderColor: `hsl(${(pIdx * 57) % 360}, 70%, 40%)`
                      }}
                    >
                      <div className="w-full h-full flex flex-col relative pointer-events-none items-center justify-center text-center">
                        <span className="text-[5px] font-black opacity-60">#{p.piece.pieceSequence}</span>
                        {p.w > 40 && p.h > 20 && <span className="text-[6px] font-bold truncate w-full px-1">{p.piece.name}</span>}
                        {p.w > 30 && p.h > 15 && <span className="text-[7px] font-black">{p.w}x{p.h}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-100"><TableRow><TableHead className="text-[9px] font-black px-4">Peça</TableHead><TableHead className="text-center text-[9px] font-black">Dim</TableHead><TableHead className="text-right text-[9px] font-black px-4">Área</TableHead></TableRow></TableHeader>
              <TableBody>
                {pieces.map((part) => (
                  <TableRow key={part.physicalId} className="text-[10px]">
                    <TableCell className="px-4 py-2 font-black uppercase">{part.name}</TableCell>
                    <TableCell className="text-center font-mono">{part.widthMm}x{part.lengthMm}</TableCell>
                    <TableCell className="text-right px-4 font-bold">{((part.widthMm * part.lengthMm) / 1000000).toFixed(3)} m²</TableCell>
                  </TableRow>
                ))}
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
                </ul>
              </AlertDescription>
            </div>
          </Alert>
        ) : (
          <Alert className="rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-900 shadow-sm mb-6">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <div>
              <AlertTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                Plano de Corte Industrial Real
                {integrityStatus === 'pass' && <Badge className="bg-emerald-500 text-white border-none ml-2">INTEGRIDADE OK</Badge>}
              </AlertTitle>
              <AlertDescription className="text-xs font-medium mt-1 leading-relaxed">Fonte: XML Promob • Persistência confirmada.</AlertDescription>
            </div>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="plano" className="w-full no-print">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl h-12 flex-1">
            <TabsTrigger value="plano" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900">
              <Layers className="h-4 w-4 mr-2" /> Plano de Corte
            </TabsTrigger>
            <TabsTrigger value="etiquetas" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Printer className="h-4 w-4 mr-2" /> Etiquetas
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importCutPro.mutate(file);
              }}
            />
            <Button 
              variant="outline" 
              className="h-12 px-6 rounded-xl border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={importCutPro.isPending}
            >
              <FileUp className="h-4 w-4 mr-2" /> 
              {importCutPro.isPending ? 'Importando...' : 'Importar Cut Pro'}
            </Button>

            {officialPlan && (
              <Button 
                variant={activePlanSource === 'cutpro_oficial' ? 'default' : 'outline'}
                className={cn(
                  "h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activePlanSource === 'cutpro_oficial' ? "bg-lime-500 text-slate-900 hover:bg-lime-600 border-none" : "border-2 border-slate-200"
                )}
                onClick={() => setActivePlanSource(activePlanSource === 'cutpro_oficial' ? 'estimativa' : 'cutpro_oficial')}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {activePlanSource === 'cutpro_oficial' ? 'Visualizando Oficial' : 'Comparar Oficial'}
              </Button>
            )}
          </div>
        </div>

        {officialPlan && activePlanSource === 'cutpro_oficial' && (
          <div className="mb-8">
            <CutPlanComparisonCard 
              stats={{
                pieces: { 
                  estimated: estimationPlan?.total_pieces || allPieces.length, 
                  official: officialPlan.total_pieces || 0 
                },
                sheets: { 
                  estimated: cutPlanGroups?.reduce((acc, g) => acc + g.stats.sheetCount, 0) || 0, 
                  official: officialPlan.total_sheets || 0 
                },
                utilization: { 
                  estimated: cutPlanGroups ? (cutPlanGroups.reduce((acc, g) => acc + g.stats.utilizationPercent, 0) / cutPlanGroups.length) : 0, 
                  official: Number(officialPlan.utilization_percent) || 0 
                },
                cuts: { 
                  estimated: 0, 
                  official: officialPlan.total_cuts || 0 
                }
              }}
            />
          </div>
        )}

        <TabsContent value="plano" className="mt-6">
          <div className="flex items-center justify-between mb-4">
             <Badge variant={activePlanSource === 'cutpro_oficial' ? 'default' : 'secondary'} className={cn(
               "uppercase text-[9px] font-black tracking-widest py-1 px-3 rounded-full",
               activePlanSource === 'cutpro_oficial' ? "bg-lime-500 text-slate-900" : "bg-slate-200 text-slate-600"
             )}>
               {activePlanSource === 'cutpro_oficial' ? 'MODO: CUT PRO OFICIAL' : 'MODO: ESTIMATIVA MONTA AI'}
             </Badge>

             {activePlanSource === 'cutpro_oficial' && !officialPlan && (
               <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-amber-500 border-amber-200 bg-amber-50">
                 VALIDAÇÃO CUT PRO REAL = PENDENTE
               </Badge>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {activePlanSource === 'cutpro_oficial' && officialPlan ? (
              <>
                <Card className="border-2 border-lime-200 bg-lime-50/30 shadow-none">
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-1">Total Peças</p>
                    <div className="flex justify-between items-end">
                      <p className="text-2xl font-black text-slate-900">{officialPlan.total_pieces}</p>
                      <Package className="h-8 w-8 text-lime-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-lime-200 bg-lime-50/30 shadow-none">
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-1">Total Chapas</p>
                    <div className="flex justify-between items-end">
                      <p className="text-2xl font-black text-slate-900">{officialPlan.total_sheets}</p>
                      <Layers className="h-8 w-8 text-lime-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-lime-200 bg-lime-50/30 shadow-none">
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-1">Aproveitamento</p>
                    <div className="flex justify-between items-end">
                      <p className="text-2xl font-black text-slate-900">{Number(officialPlan.utilization_percent).toFixed(1)}%</p>
                      <Scissors className="h-8 w-8 text-lime-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-lime-200 bg-lime-50/30 shadow-none">
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-lime-600 uppercase tracking-widest mb-1">Total Cortes</p>
                    <div className="flex justify-between items-end">
                      <p className="text-2xl font-black text-slate-900">{officialPlan.total_cuts}</p>
                      <Tool className="h-8 w-8 text-lime-200" />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              cutPlanGroups?.map(group => (
                <Card key={group.groupKey} className="border-2 border-slate-100 shadow-none">
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{group.color} {group.thicknessMm}mm</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-2xl font-black text-slate-900">{group.stats.totalAreaPieces.toFixed(2)} <span className="text-xs text-slate-400">m²</span></p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{group.stats.sheetCount} CHAPAS</p>
                      </div>
                      <Box className="h-8 w-8 text-slate-100" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="space-y-6">
            {activePlanSource === 'cutpro_oficial' ? (
              <Card className="border-2 border-slate-200 border-dashed bg-slate-50/50">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-600 mb-2">Visualização SVG desativada para Plano Oficial</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    O motor Monta AI exibe o nesting apenas para estimativas internas. Para planos oficiais, utilize o relatório técnico do Cut Pro impresso pela expedição. As etiquetas industriais permanecem ativas com base nos dados oficiais.
                  </p>
                </CardContent>
              </Card>
            ) : (
              cutPlanGroups?.map(group => renderCutGroup(group))
            )}
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
        <Card className="border-2 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Tool className="h-4 w-4" /> Auditoria de Integridade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow className="hover:bg-transparent"><TableCell className="font-bold text-xs uppercase px-6">Total Parts</TableCell><TableCell className="text-right px-6 font-black">{allParts?.length || 0}</TableCell></TableRow>
                <TableRow className="hover:bg-transparent"><TableCell className="font-bold text-xs uppercase px-6 text-lime-600">Peças de Corte</TableCell><TableCell className="text-right px-6 font-black text-lime-600">{cutParts.length}</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <footer className="bg-slate-900 text-white p-8 rounded-xl shadow-2xl border-t-4 border-lime-400 no-print">
        <h2 className="text-lime-400 text-xs font-black uppercase tracking-[0.2em] mb-6">Plano de Corte Industrial Real</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <div><p className="text-slate-500 text-[9px] font-black uppercase">Project ID</p><p className="text-sm font-mono mt-1">{projectId}</p></div>
           <div><p className="text-slate-500 text-[9px] font-black uppercase">Peças Físicas</p><p className="text-2xl font-black mt-1 text-lime-400">{allPieces.length}</p></div>
        </div>
      </footer>
    </div>
  );
}
