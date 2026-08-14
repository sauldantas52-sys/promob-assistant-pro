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
    <Card className="w-[300px] h-[180px] bg-white text-black border-2 overflow-hidden print:break-inside-avoid">
      <CardContent className="p-2 h-full flex flex-col gap-1">
        {/* Top Header: Module Info */}
        <div className="flex justify-between items-start border-b pb-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-gray-500">Módulo</span>
            <span className="text-lg font-black leading-none">{moduleCode}</span>
          </div>
          <div className="flex flex-col items-end">
            <Badge 
              style={{ backgroundColor: color, color: 'white' }} 
              className="text-[10px] px-2 py-0 border-none"
            >
              {moduleName}
            </Badge>
            <span className="text-[8px] text-gray-400 mt-1">PROJ: {projectId.slice(0, 8)}</span>
          </div>
        </div>

        {/* Middle: Part Info */}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-sm font-bold truncate">{partName}</h3>
          <p className="text-xs font-mono text-gray-600">{dimensions}</p>
        </div>

        {/* Bottom: QR Code & Brand */}
        <div className="flex justify-between items-end pt-1 border-t">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-primary">MONTA AI</span>
            <span className="text-[7px] text-gray-400">Promob Assistant Pro</span>
          </div>
          <div className="bg-white p-0.5 rounded border">
            <QRCodeSVG value={qrValue} size={45} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
