import { Calculator, FileText, Download, Building2, Layers, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BudgetTab({ projectId }: { projectId: string }) {
  const { data: quote } = useQuery({
    queryKey: ["project_quote", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_quotes")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: parts } = useQuery({
    queryKey: ["parts_summary", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("kind, material, quantity")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const materialSummary = parts?.reduce((acc: Record<string, number>, part) => {
    if (part.kind === 'chapa' || part.kind === 'peca') {
      const key = part.material || 'Material não informado';
      acc[key] = (acc[key] || 0) + (part.quantity || 1);
    }
    return acc;
  }, {});

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "Pendente";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 text-blue-800 rounded-2xl">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle className="font-black uppercase tracking-tight text-xs">Aviso de Governança Comercial</AlertTitle>
        <AlertDescription className="text-sm">
          A produção industrial deste projeto está **bloqueada** até a aprovação formal da Proposta Comercial e Contrato. 
          O uso de estimativas visuais é estritamente orçamentário.
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest opacity-80">
              <Calculator className="h-4 w-4" /> Orçamento Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{formatCurrency(quote?.total_value)}</div>
            <p className="text-xs mt-2 opacity-70 italic">
              {quote ? `Baseado na revisão ${quote.version || '1'}` : "*Aguardando cálculo técnico"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
              <Layers className="h-4 w-4" /> Resumo de Materiais (XML)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {materialSummary && Object.keys(materialSummary).length > 0 ? (
              Object.entries(materialSummary).map(([material, qty]) => (
                <div key={material} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-bold text-slate-700 truncate mr-2">{material}</span>
                  <Badge variant="outline">{qty} itens</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4">Nenhum material extraído do XML.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
              <Building2 className="h-4 w-4" /> Impostos e Taxas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 15% estimated if tax_value not available */}
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(quote?.total_value ? quote.total_value * 0.15 : null)}
            </div>
            <p className="text-xs mt-1 text-slate-400">ICMS/IPI + Encargos Industriais</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-xl bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg font-black uppercase text-slate-900">Itens e Composição</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full gap-2" disabled={!quote}>
              <FileText className="h-4 w-4" /> Gerar Contrato
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full gap-2" disabled={!quote}>
              <Download className="h-4 w-4" /> Proposta Comercial
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Descrição</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Ref. Técnica</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote ? (
                <TableRow>
                  <TableCell className="font-bold">Total do Projeto</TableCell>
                  <TableCell>{quote.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-right font-black">{formatCurrency(quote.total_value)}</TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-400 italic">
                    Orçamento em fase de processamento industrial.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
