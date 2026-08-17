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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Módulos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">{modules?.data?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">
              {parts?.filter(p => p.kind === 'peca' || p.kind === 'chapa').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ferragens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">
              {parts?.filter(p => p.kind === 'ferragem').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-500">Acessórios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900">
              {parts?.filter(p => p.kind === 'acessorio').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b py-3 bg-slate-950">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white">Inventário Industrial (Fonte: Banco de Dados)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] font-black uppercase">Peça</TableHead>
                <TableHead className="text-[9px] font-black uppercase">UID</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Material</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Espessura</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Largura</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Comprimento</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-center">Qtd</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Fonte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts?.map((part: any) => (
                <TableRow key={part.id} className="text-[11px]">
                  <TableCell className="font-bold uppercase">{part.name}</TableCell>
                  <TableCell className="text-[9px] font-mono">{(part.metadata as any)?.id_xml || '-'}</TableCell>
                  <TableCell>{part.material || "Não informado no XML"}</TableCell>
                  <TableCell>{part.thickness_mm ? `${part.thickness_mm} mm` : "Não informado no XML"}</TableCell>
                  <TableCell>{part.width_mm ? `${part.width_mm} mm` : "N/I"}</TableCell>
                  <TableCell>{part.length_mm ? `${part.length_mm} mm` : "N/I"}</TableCell>
                  <TableCell className="text-center font-bold">{part.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[8px] uppercase">{part.data_source || 'XML'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!parts || parts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400 italic">
                    Nenhum dado persistido encontrado para este projeto.
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
