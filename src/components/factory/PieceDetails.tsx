import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Scissors, 
  Square, 
  Drill, 
  Boxes, 
  Wrench, 
  Truck,
  CheckCircle2,
  AlertCircle,
  Maximize2
} from 'lucide-react';
import { ProductionStep, ProductionStatus, updateStepStatus } from '@/lib/production';
import { getEdgeData } from '@/lib/cut-plan/edges';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface PieceDetailsProps {
  piece: any;
  steps: ProductionStep[];
  physicalId: string;
  cutPlan?: any;
}

const STEP_ICONS = {
  corte: Scissors,
  borda: Square,
  usinagem: Drill,
  separacao: Boxes,
  montagem: Wrench,
  expedicao: Truck
};

const STEP_LABELS = {
  corte: 'Corte',
  borda: 'Fita de Borda',
  usinagem: 'Usinagem/Furação',
  separacao: 'Separação',
  montagem: 'Montagem',
  expedicao: 'Expedição'
};

const STEP_ORDER = ['corte', 'borda', 'usinagem', 'separacao', 'montagem', 'expedicao'];


export function PieceDetails({ piece, steps, physicalId, cutPlan }: PieceDetailsProps) {
  const queryClient = useQueryClient();
  const edgeData = getEdgeData({
    ...piece,
    edgeTop: piece.edge_top,
    edgeBottom: piece.edge_bottom,
    edgeLeft: piece.edge_left,
    edgeRight: piece.edge_right
  } as any);

  const handleUpdateStatus = async (stepId: string, currentStatus: ProductionStatus) => {
    try {
      const nextStatus: ProductionStatus = currentStatus === 'concluido' ? 'pendente' : 'concluido';
      await updateStepStatus(stepId, nextStatus);
      toast.success('Status atualizado com sucesso.');
      void queryClient.invalidateQueries({ queryKey: ['piece-detail', physicalId] });
    } catch (err) {
      toast.error('Erro ao atualizar status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Industrial */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-4 border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-slate-900 text-blue-400 font-black uppercase text-[10px] tracking-widest px-3">
              {piece.modules?.name || 'Peça Avulsa'}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] border-slate-300">
              {physicalId}
            </Badge>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950">
            {piece.name}
          </h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
            Código: {piece.piece_code || 'N/A'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ficha Técnica */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Maximize2 className="h-4 w-4" /> Dimensões e Material
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comprimento</p>
                  <p className="text-2xl font-black font-mono">{piece.length_mm}mm</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Largura</p>
                  <p className="text-2xl font-black font-mono">{piece.width_mm}mm</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Espessura</p>
                  <p className="text-2xl font-black font-mono">{piece.thickness_mm}mm</p>
                </div>
              </div>

              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 mb-8">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Material / Cor</p>
                <p className="text-lg font-black uppercase text-slate-900">{piece.material} {piece.color}</p>
              </div>

              {/* Fita de Borda Visual */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Esquema de Bordas</h3>
                {edgeData.hasEdges ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['F1', 'F2', 'F3', 'F4'].map((f) => {
                      const val = piece[`edge_${f.toLowerCase() === 'f1' ? 'top' : f.toLowerCase() === 'f2' ? 'bottom' : f.toLowerCase() === 'f3' ? 'left' : 'right'}`];
                      return (
                        <div key={f} className={cn(
                          "p-3 rounded-lg border-2 flex flex-col items-center gap-1",
                          val > 0 ? "border-amber-500 bg-amber-50" : "border-slate-100 bg-slate-50 text-slate-300"
                        )}>
                          <span className="text-[10px] font-black">{f}</span>
                          <span className="text-sm font-bold">{val > 0 ? `${val}mm` : '0'}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    SEM FITA
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Operação */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-950 px-1">Fluxo Operacional</h3>
            <div className="grid grid-cols-1 gap-2">
              {steps.sort((a, b) => {
                return STEP_ORDER.indexOf(a.step_type) - STEP_ORDER.indexOf(b.step_type);
              }).map((step) => {
                const Icon = STEP_ICONS[step.step_type as keyof typeof STEP_ICONS] || AlertCircle;
                const isDone = step.status === 'concluido';
                const isNotRequired = step.status === 'nao_necessaria';
                const isBlocked = step.status === 'bloqueado';
                
                if (isNotRequired) return null;

                return (
                  <Button
                    key={step.id}
                    variant={isDone ? "default" : "outline"}
                    className={cn(
                      "h-16 justify-between px-6 rounded-xl border-2 transition-all active:scale-[0.98]",
                      isDone 
                        ? "bg-emerald-600 border-emerald-700 hover:bg-emerald-700 text-white" 
                        : isBlocked
                          ? "border-red-200 bg-red-50 text-red-700 cursor-not-allowed opacity-80"
                          : "border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700"
                    )}
                    onClick={() => !isBlocked && handleUpdateStatus(step.id, step.status)}
                    disabled={isBlocked}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        isDone ? "bg-emerald-500/20" : isBlocked ? "bg-red-100" : "bg-slate-100"
                      )}>
                        <Icon className={cn("h-6 w-6", isDone ? "text-white" : isBlocked ? "text-red-500" : "text-slate-500")} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-widest">
                          {STEP_LABELS[step.step_type as keyof typeof STEP_LABELS]}
                        </span>
                        {isBlocked && (
                          <span className="text-[9px] font-bold uppercase text-red-500">Bloqueado pela Engenharia</span>
                        )}
                      </div>
                    </div>
                    {isDone && <CheckCircle2 className="h-6 w-6" />}
                  </Button>
                );
              })}

            </div>
          </div>
        </div>

        {/* Sidebar Tablet */}
        <div className="space-y-6">
          <Card className="border-slate-900 border-2 bg-slate-950 text-white overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-800">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Posição no Plano</CardTitle>
            </CardHeader>
            <CardContent className="p-0 aspect-square flex items-center justify-center bg-slate-900/50">
              {cutPlan ? (
                <div className="text-center p-6 space-y-2">
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">CUT PRO OFICIAL</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                    Localize na Chapa {cutPlan.cut_sheets?.[0]?.sheet_number || '1'}
                  </p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <p className="text-xs font-black text-blue-400 uppercase tracking-widest">ESTIMATIVA MONTA AI</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                    Referência visual baseada em motor interno
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-4 border-2 border-amber-200 bg-amber-50 rounded-xl space-y-2">
            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="h-3 w-3" /> Furação / Usinagem
            </h4>
            <p className="text-xs font-bold text-amber-700 italic">
              Furação não informada no projeto original.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
