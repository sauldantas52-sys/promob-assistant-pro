import { useEffect, useRef } from "react";
import { Scissors, Maximize, AlertCircle, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Board {
  width: number;
  height: number;
  parts: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    name: string;
  }>;
}

export function PreliminaryCutPlanTab({ projectId }: { projectId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mock data for preliminary nesting
  const boards: Board[] = [
    {
      width: 2750,
      height: 1840,
      parts: [
        { x: 10, y: 10, w: 600, h: 800, name: "Lateral Esq" },
        { x: 620, y: 10, w: 600, h: 800, name: "Lateral Dir" },
        { x: 10, y: 820, w: 1200, h: 600, name: "Base" },
        { x: 1220, y: 10, w: 800, h: 1400, name: "Porta A" },
      ],
    },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and scale
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / 2800, canvas.height / 1900);

    boards.forEach((board) => {
      // Draw board
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, board.width * scale, board.height * scale);
      
      // Draw parts
      board.parts.forEach((part) => {
        ctx.fillStyle = "#3b82f622";
        ctx.fillRect(part.x * scale, part.y * scale, part.w * scale, part.h * scale);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1;
        ctx.strokeRect(part.x * scale, part.y * scale, part.w * scale, part.h * scale);
        
        ctx.fillStyle = "#1e40af";
        ctx.font = "bold 10px Inter";
        if (part.w * scale > 40) {
          ctx.fillText(part.name, (part.x + 5) * scale, (part.y + 15) * scale);
        }
      });
    });
  }, [boards]);

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 text-blue-800 rounded-2xl">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle className="font-black uppercase tracking-tight text-xs">Conformidade Industrial 4.0</AlertTitle>
        <AlertDescription className="text-sm">
          Este plano de corte é uma **estimativa local**. A produção industrial requer a importação do resultado oficial do **Cut Pro** para garantir a precisão de furação e fitagem.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                <Scissors className="h-4 w-4" /> Visualização de Aproveitamento (Chapa 1)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-slate-50 flex items-center justify-center min-h-[500px]">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={500} 
                className="max-w-full h-auto drop-shadow-2xl"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Métricas de Otimização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Aproveitamento</span>
                  <span>78.4%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[78.4%]" />
                </div>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-xs font-medium text-slate-500 italic">Retalhos úteis</span>
                <Badge variant="outline">2.4m²</Badge>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-xs font-medium text-slate-500 italic">Perda (Serragem)</span>
                <Badge variant="outline">0.8m²</Badge>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest gap-2 shadow-lg">
            <Maximize className="h-4 w-4" /> Importar Oficial (Cut Pro)
          </Button>
        </div>
      </div>
    </div>
  );
}
