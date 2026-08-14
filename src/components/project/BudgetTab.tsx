import { useState } from "react";
import { Calculator, FileText, Download, Building2, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function BudgetTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest opacity-80">
              <Calculator className="h-4 w-4" /> Orçamento Preliminar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">R$ 12.450,00</div>
            <p className="text-xs mt-2 opacity-70 italic">*Estimado via SketchUp/Bridge</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
              <Layers className="h-4 w-4" /> Resumo de Materiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-bold text-slate-700">MDF 18mm Branco</span>
              <Badge variant="outline">12 chapas</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-bold text-slate-700">MDF 15mm Louro Freijó</span>
              <Badge variant="outline">4 chapas</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
              <Building2 className="h-4 w-4" /> Impostos e Taxas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">R$ 1.867,50</div>
            <p className="text-xs mt-1 text-slate-400">ICMS/IPI + Frete Industrial</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-xl bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg font-black uppercase text-slate-900">Itens do Orçamento</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full gap-2">
              <FileText className="h-4 w-4" /> Gerar Contrato
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full gap-2">
              <Download className="h-4 w-4" /> Proposta Comercial
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Ambiente / Módulo</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Material Base</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Mão de Obra</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold">Cozinha - Armário Inferior Pia</TableCell>
                <TableCell>MDF 18mm Branco</TableCell>
                <TableCell className="text-right">R$ 450,00</TableCell>
                <TableCell className="text-right font-black">R$ 2.890,00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">Dormitório - Roupeiro 4 Portas</TableCell>
                <TableCell>MDF 18mm Louro Freijó</TableCell>
                <TableCell className="text-right">R$ 1.200,00</TableCell>
                <TableCell className="text-right font-black">R$ 7.560,00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
