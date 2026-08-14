import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";

interface DrillingInspectorProps {
  drillings: any[];
}

export function DrillingInspector({ drillings }: DrillingInspectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4" /> Coordenadas e Origens de Furação
        </h3>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>X</TableHead>
              <TableHead>Y</TableHead>
              <TableHead>Ø</TableHead>
              <TableHead>Prof.</TableHead>
              <TableHead>Face</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drillings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                  Nenhuma furação detectada nos arquivos técnicos fornecidos.
                </TableCell>
              </TableRow>
            ) : (
              drillings.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>{d.x.toFixed(2)}</TableCell>
                  <TableCell>{d.y.toFixed(2)}</TableCell>
                  <TableCell>{d.diametro}mm</TableCell>
                  <TableCell>{d.profundidade}mm</TableCell>
                  <TableCell className="uppercase">{d.face}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.origem}</Badge>
                  </TableCell>
                  <TableCell>
                    {d.status === 'confirmada' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {d.status === 'conflitante' && <XCircle className="h-4 w-4 text-red-500" />}
                    {d.status === 'inferida' && <AlertCircle className="h-4 w-4 text-amber-500" />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
