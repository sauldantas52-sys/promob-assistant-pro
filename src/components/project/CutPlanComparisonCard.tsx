import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, TrendingDown, TrendingUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonStats {
  estimated: number;
  official: number;
}

interface CutPlanComparisonProps {
  stats: {
    pieces: ComparisonStats;
    sheets: ComparisonStats;
    utilization: ComparisonStats;
    cuts: ComparisonStats;
  };
}

export function CutPlanComparisonCard({ stats }: CutPlanComparisonProps) {
  const deltaSheets = stats.sheets.official - stats.sheets.estimated;
  const deltaUtilization = stats.utilization.official - stats.utilization.estimated;
  const deltaPieces = stats.pieces.official - stats.pieces.estimated;

  return (
    <Card className="border-2 border-slate-900 bg-slate-950 text-white shadow-2xl overflow-hidden">
      <CardHeader className="bg-slate-900 border-b border-slate-800 py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-lime-500 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-slate-900" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tighter">Comparativo Industrial</CardTitle>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Estimativa vs Cut Pro Oficial</p>
            </div>
          </div>
          <Badge className="bg-lime-500 text-slate-900 border-none font-black text-[9px] px-3">FIDELITY 4.3</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Peças */}
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total de Peças</p>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-black">{stats.pieces.official}</span>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold mb-1",
                deltaPieces === 0 ? "text-emerald-400" : "text-amber-400"
              )}>
                {deltaPieces === 0 ? "PEÇAS = CONFERE" : `PEÇAS = DIVERGE (${deltaPieces > 0 ? '+' : ''}${deltaPieces})`}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Estimado: {stats.pieces.estimated}</p>
          </div>

          {/* Chapas */}
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consumo de Chapas</p>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-black">{stats.sheets.official}</span>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold mb-1",
                deltaSheets <= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {deltaSheets > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {deltaSheets === 0 ? "DELTA = 0" : `DELTA = ${deltaSheets > 0 ? '+' : ''}${deltaSheets}`}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Estimado: {stats.sheets.estimated}</p>
          </div>

          {/* Aproveitamento */}
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aproveitamento Final</p>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-black text-lime-400">{stats.utilization.official.toFixed(1)}%</span>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold mb-1",
                deltaUtilization >= 0 ? "text-emerald-400" : "text-amber-400"
              )}>
                {deltaUtilization > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {deltaUtilization > 0 ? '+' : ''}{deltaUtilization.toFixed(1)} p.p.
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Estimado: {stats.utilization.estimated.toFixed(1)}%</p>
          </div>

          {/* Cortes */}
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total de Cortes</p>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-black text-slate-200">{stats.cuts.official}</span>
              <div className="text-[10px] font-bold mb-1 text-slate-400">
                OFICIAL
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Cortes estimados não calculados</p>
          </div>
        </div>

        {deltaPieces !== 0 && (
          <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <Layers className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-[10px] text-amber-200 font-medium leading-relaxed">
              Divergência detectada na contagem física de peças. O Cut Pro oficial reporta {stats.pieces.official} peças, enquanto a estimativa do Monta AI previu {stats.pieces.estimated}. 
              Verifique se todas as peças físicas (409 esperadas para o Closet) foram corretamente importadas no Cut Pro.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
