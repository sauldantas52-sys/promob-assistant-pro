import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Info, Binary } from "lucide-react";

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
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Peça / Módulo</TableHead>
              <TableHead>Material / Esp.</TableHead>
              <TableHead>X / Y / Z</TableHead>
              <TableHead>Ø / Prof.</TableHead>
              <TableHead>Face</TableHead>
              <TableHead>Origem / Regra</TableHead>
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
                <TableRow key={i} className="text-xs">
                  <TableCell>
                    <div className="font-medium">{d.part_id}</div>
                    <div className="text-[10px] text-muted-foreground">{d.module_name} ({d.group})</div>
                  </TableCell>
                  <TableCell>
                    <div>{d.material}</div>
                    <div className="text-[10px] text-muted-foreground">{d.thickness_mm}mm</div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {d.x.toFixed(1)} | {d.y.toFixed(1)} | {d.z.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <div>Ø{d.diametro}mm</div>
                    <div className={d.profundidade > 0 ? "" : "text-amber-600 italic"}>
                      P: {d.profundidade > 0 ? `${d.profundidade}mm` : "Não conf."}
                    </div>
                  </TableCell>
                  <TableCell className="uppercase font-semibold">{d.face || "???"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[9px] h-4">{d.origem}</Badge>
                      <span className="text-[9px] text-muted-foreground leading-tight">
                        {d.regra_aplicada || "Sem regra"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {d.status === 'confirmada' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {d.status === 'calculada' && <Binary className="h-4 w-4 text-blue-500" />}
                      {d.status === 'conflitante' && <XCircle className="h-4 w-4 text-red-500" />}
                      {d.status === 'inferida' && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      {d.status === 'ausente' && <Info className="h-4 w-4 text-slate-400" />}
                      <span className="text-[10px] capitalize">{d.status}</span>
                    </div>
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
