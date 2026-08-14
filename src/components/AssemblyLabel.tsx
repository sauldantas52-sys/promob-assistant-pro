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
}

export function AssemblyLabel({
  moduleCode,
  moduleName,
  color,
  partName,
  dimensions,
  qrValue,
  projectId
}: AssemblyLabelProps) {
  return (
    <Card className="w-[300px] h-[180px] bg-white text-slate-950 border-2 border-slate-900 overflow-hidden print:break-inside-avoid shadow-sm">
      <CardContent className="p-3 h-full flex flex-col gap-1">
        {/* Top Header: Module Info */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-2">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Grupo Físico</span>
            <span className="text-2xl font-black leading-none tracking-tighter text-slate-900">{moduleCode}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge 
              style={{ backgroundColor: color }} 
              className="text-[9px] px-2 py-0.5 border-none font-black uppercase tracking-wider text-white rounded-sm"
            >
              {moduleName}
            </Badge>
            <span className="text-[8px] font-bold text-slate-400 font-mono">ID: {projectId.slice(0, 8)}</span>
          </div>
        </div>

        {/* Middle: Part Info */}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{partName}</h3>
          <p className="text-xs font-black font-mono text-slate-500 mt-0.5">{dimensions}</p>
        </div>

        {/* Bottom: QR Code & Brand */}
        <div className="flex justify-between items-end pt-1 border-t">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-900 tracking-tighter uppercase">MONTA AI</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Assistant Pro 4.0</span>
          </div>
          <div className="bg-white p-1 rounded-lg border-2 border-slate-900 shadow-sm">
            <QRCodeSVG value={qrValue} size={50} level="H" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
