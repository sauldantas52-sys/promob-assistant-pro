import { Scissors, ShieldCheck, Ruler, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function PreliminaryCutPlanTab({ projectId }: { projectId: string }) {
  const { data: parts, isLoading } = useQuery({
    queryKey: ["parts_cutplan", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .eq("project_id", projectId)
        .order("thickness_mm", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-8 text-center text-xs text-slate-500">Processando lista de corte...</div>;

  const panels = parts?.filter(p => p.kind === 'peca' || p.kind === 'chapa') || [];
  
  // Agrupar por espessura
  const groups = panels.reduce((acc: Record<string, typeof panels>, part) => {
    const thickness = part.thickness_mm ? `${part.thickness_mm} mm` : "Não informado no XML";
    const material = part.material || "Não informado no XML";
    const key = `${material} | ${thickness}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(part);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Alert className="rounded-lg border-blue-200 bg-blue-50 text-blue-950">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle className="text-xs font-black uppercase tracking-wide">
          Plano de Corte Consolidado (MVP)
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed">
          Este plano é gerado diretamente do banco de dados (PARTS). A quantidade de chapas não é calculada nesta fase.
        </AlertDescription>
      </Alert>

      {Object.entries(groups).length > 0 ? (
        Object.entries(groups).map(([groupKey, groupParts]) => {
          const [material, thickness] = groupKey.split(" | ");
          const totalArea = groupParts.reduce((sum, p) => 
            sum + ((p.width_mm || 0) * (p.length_mm || 0) * (p.quantity || 1)) / 1000000, 0
          );

          return (
            <Card key={groupKey} className="overflow-hidden border-slate-200">
              <CardHeader className="bg-slate-50 border-b py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-xs font-black uppercase tracking-widest">
                      {material} - {thickness}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Área Total: {totalArea.toFixed(2)} m²</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[9px] font-black uppercase">Peça</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Largura</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Comprimento</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Qtd</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">UID XML</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupParts.map((part) => (
                      <TableRow key={part.id} className="text-[11px]">
                        <TableCell className="font-bold uppercase">{part.name}</TableCell>
                        <TableCell>{part.width_mm ? `${part.width_mm} mm` : "N/I"}</TableCell>
                        <TableCell>{part.length_mm ? `${part.length_mm} mm` : "N/I"}</TableCell>
                        <TableCell className="text-center font-bold">{part.quantity}</TableCell>
                        <TableCell className="text-[9px] font-mono">{(part.metadata as any)?.id_xml || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <Scissors className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhuma peça para corte localizada</p>
        </div>
      )}
    </div>
  );
}
