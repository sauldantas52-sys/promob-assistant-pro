import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AssemblyLabelProps {
  moduleCode: string;
  moduleName: string;
  color: string;
  partName: string;
  dimensions: string;
  qrValue: string;
  projectId: string;
  material?: string | null;
  thickness?: number | null;
  edgeBanding?: string | null;
  storageLocation?: string | null;
}

export function AssemblyLabel({
  moduleCode,
  moduleName,
  color,
  partName,
  dimensions,
  qrValue,
  projectId,
  material,
  thickness,
  edgeBanding,
  storageLocation,
}: AssemblyLabelProps) {
  return (
    <Card className="h-[180px] w-full max-w-[300px] overflow-hidden border-2 border-slate-900 bg-white text-slate-950 shadow-sm print:w-[300px] print:break-inside-avoid">
      <CardContent className="flex h-full min-w-0 flex-col gap-1 p-3">
        {/* Top Header: Module Info */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Grupo Físico
            </span>
            <span className="text-2xl font-black leading-none tracking-tighter text-slate-900">
              {moduleCode}
            </span>
          </div>
          <div className="flex min-w-0 max-w-[58%] flex-col items-end gap-1">
            <Badge
              style={{ backgroundColor: color }}
              className="max-w-full truncate rounded-sm border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
            >
              {moduleName}
            </Badge>
            <span className="text-[8px] font-bold text-slate-400 font-mono">
              ID: {projectId.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Middle: Part Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
            {partName}
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <p className="text-[10px] font-black font-mono text-slate-600">{dimensions}</p>
            {material && (
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                {material}
                {thickness != null ? ` ${thickness}mm` : ""}
              </p>
            )}
          </div>
          <div className="flex justify-between items-center">
            {edgeBanding && (
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                Borda: {edgeBanding}
              </p>
            )}
            {storageLocation && (
              <Badge
                variant="outline"
                className="text-[7px] px-1.5 py-0 border-slate-200 bg-slate-50 font-black uppercase tracking-tighter"
              >
                LOC: {storageLocation}
              </Badge>
            )}
          </div>
        </div>

        {/* Bottom: QR Code & Brand */}
        <div className="flex items-end justify-between gap-2 border-t pt-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">
              MONTA AI · RASTREIO
            </span>
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400">
              QR vinculado à peça
            </span>
            <span className="max-w-[180px] truncate font-mono text-[6px] text-slate-400">
              {qrValue}
            </span>
          </div>
          <div className="shrink-0 rounded-md border-2 border-slate-900 bg-white p-1">
            <QRCodeSVG
              value={qrValue}
              size={46}
              level="H"
              aria-label={`Rastreabilidade da peça ${partName}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
