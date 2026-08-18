import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndustrialCutPlanEngine } from '@/lib/cut-plan/engine';
import { calcularMetricasProjeto, calcularCustos, COST_DEFAULTS } from '@/lib/industrial-reports';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Wallet, Factory, Info } from 'lucide-react';

export function IndustrialCostsTab({ projectId }: { projectId: string }) {
  const { data: cutPlanGroups } = useQuery({
    queryKey: ["industrial_cut_plan", projectId],
    queryFn: () => IndustrialCutPlanEngine.generateForProject(projectId),
  });

  const metricas = useMemo(() => {
    if (!cutPlanGroups) return null;
    return calcularMetricasProjeto(cutPlanGroups, 2750, 1830, 10);
  }, [cutPlanGroups]);

  const custos = useMemo(() => {
    if (!metricas) return null;
    return calcularCustos(metricas);
  }, [metricas]);

  if (!custos || !metricas) {
    return (
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-12 text-center">
        <Calculator className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Calculando Custos Industriais...</h3>
        <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">Aguardando processamento do plano de corte.</p>
      </Card>
    );
  }

  const formatBRL = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-600" /> Relatório Geral de Custos
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Métricas de Escritório e Produção • Baseado no Plano de Corte Pro
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Estimado</p>
          <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatBRL(custos.total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Módulos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">{metricas.pieces > 0 ? Math.ceil(metricas.pieces / 15) : 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">{metricas.pieces}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Metros Fita</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">{metricas.edgeMeters.toFixed(1)}m</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cortes Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">{metricas.cuts}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-900 py-4 px-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <Building2Icon className="h-3 w-3 text-blue-400" /> Custos de Escritório
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Item</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Qtd</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Unit</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custos.custosEscritorio.map((row: any, i: number) => (
                  <TableRow key={i} className="text-[11px] font-bold text-slate-700">
                    <TableCell className="uppercase">{row.item}</TableCell>
                    <TableCell className="text-right">{row.quantidade.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatBRL(row.valorUnitario)}</TableCell>
                    <TableCell className="text-right text-slate-900">{formatBRL(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-900 py-4 px-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <Factory className="h-3 w-3 text-emerald-400" /> Custos de Produção
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Item</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Qtd</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Unit</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custos.custosProducao.map((row: any, i: number) => (
                  <TableRow key={i} className="text-[11px] font-bold text-slate-700">
                    <TableCell className="uppercase">{row.item}</TableCell>
                    <TableCell className="text-right">{row.quantidade.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatBRL(row.valorUnitario)}</TableCell>
                    <TableCell className="text-right text-slate-900">{formatBRL(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Alert variant="default" className="bg-blue-50 border-blue-100 rounded-2xl">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-blue-900">Informação Industrial</AlertTitle>
        <AlertDescription className="text-[9px] font-bold text-blue-700 uppercase leading-relaxed">
          Estes custos são estimativas baseadas nos parâmetros industriais configurados. O custo real pode variar dependendo do aproveitamento real das chapas e perdas no processo.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Building2Icon(props: any) { return <Info {...props} />; }

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
