import { useMemo } from "react";
import { DXFGeometry } from "@/lib/dxf-parser";
import { Box, Layers, ShieldAlert, Maximize2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Technical3DViewProps {
  geometries: DXFGeometry[];
  projectName?: string;
}

export function Technical3DView({ geometries, projectName }: Technical3DViewProps) {
  // Filtramos apenas as geometrias úteis para visualização de ambiente
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasData = false;

    geometries.forEach(g => {
      if (g.start) {
        minX = Math.min(minX, g.start.x);
        minY = Math.min(minY, g.start.y);
        maxX = Math.max(maxX, g.start.x);
        maxY = Math.max(maxY, g.start.y);
        hasData = true;
      }
      if (g.end) {
        minX = Math.min(minX, g.end.x);
        minY = Math.min(minY, g.end.y);
        maxX = Math.max(maxX, g.end.x);
        maxY = Math.max(maxY, g.end.y);
        hasData = true;
      }
      if (g.center && g.radius) {
        minX = Math.min(minX, g.center.x - g.radius);
        minY = Math.min(minY, g.center.y - g.radius);
        maxX = Math.max(maxX, g.center.x + g.radius);
        maxY = Math.max(maxY, g.center.y + g.radius);
        hasData = true;
      }
      if (g.vertices) {
        g.vertices.forEach(v => {
          minX = Math.min(minX, v.x);
          minY = Math.min(minY, v.y);
          maxX = Math.max(maxX, v.x);
          maxY = Math.max(maxY, v.y);
          hasData = true;
        });
      }
    });

    if (!hasData) return { x: 0, y: 0, width: 1000, height: 1000, padding: 50 };
    
    const width = maxX - minX;
    const height = maxY - minY;
    return {
      x: minX,
      y: minY,
      width: width || 1,
      height: height || 1,
      padding: Math.max(width, height) * 0.1 || 50
    };
  }, [geometries]);

  const viewBox = `${bounds.x - bounds.padding} ${bounds.y - bounds.padding} ${bounds.width + bounds.padding * 2} ${bounds.height + bounds.padding * 2}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <Box className="h-5 w-5" /> Gêmeo Digital do DXF
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Visualização Geométrica Fiel • {projectName || "Projeto"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="rounded-full bg-slate-50 border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-widest px-3 py-1">
            {geometries.length} Entidades
          </Badge>
          <Badge className="rounded-full bg-lime-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none">
            DXF Real
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-950 overflow-hidden relative group aspect-square lg:aspect-video flex items-center justify-center">
            {geometries.length > 0 ? (
              <svg 
                viewBox={viewBox} 
                className="w-full h-full p-8 transform transition-transform duration-500 hover:scale-[1.02]"
                style={{ vectorEffect: 'non-scaling-stroke' }}
              >
                <g transform="scale(1, -1)"> {/* Inverte Y para padrão CAD */}
                  {geometries.map((g, i) => {
                    if (g.type === 'LINE' && g.start && g.end) {
                      return (
                        <line 
                          key={i} 
                          x1={g.start.x} y1={g.start.y} 
                          x2={g.end.x} y2={g.end.y} 
                          stroke="rgba(255,255,255,0.4)" 
                          strokeWidth={2}
                        />
                      );
                    }
                    if ((g.type === 'CIRCLE' || g.type === 'ARC') && g.center && g.radius) {
                      return (
                        <circle 
                          key={i} 
                          cx={g.center.x} cy={g.center.y} 
                          r={g.radius} 
                          fill="none" 
                          stroke="var(--status-usinagem)" 
                          strokeWidth={1.5}
                        />
                      );
                    }
                    if ((g.type === 'LWPOLYLINE' || g.type === 'POLYLINE') && g.vertices && g.vertices.length > 1) {
                      return (
                        <polyline 
                          key={i} 
                          points={g.vertices.map(v => `${v.x},${v.y}`).join(' ')} 
                          fill="none" 
                          stroke="rgba(255,255,255,0.7)" 
                          strokeWidth={2.5}
                        />
                      );
                    }
                    return null;
                  })}
                </g>
              </svg>
            ) : (
              <div className="text-center p-12">
                <div className="h-20 w-20 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Aguardando Arquivo DXF</h3>
                <p className="text-slate-500 text-[10px] mt-2 uppercase font-bold tracking-widest">
                  Nenhuma geometria detectada para renderização.
                </p>
              </div>
            )}
            
            {/* Overlay Info */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-3xl text-white">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-lime-400 mb-1">Status do Ambiente</p>
                  <p className="text-[10px] font-bold">Baseado em Geometria Pura</p>
               </div>
               <button className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <Maximize2 className="h-5 w-5" />
               </button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
            <Layers className="h-3 w-3" /> Camadas do DXF
          </h3>
          {Array.from(new Set(geometries.map(g => g.layer))).map(layer => (
            <Card key={layer} className="rounded-2xl border-none shadow-sm bg-white p-4 flex items-center justify-between border-l-4 border-l-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[120px]">{layer}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
                    {geometries.filter(g => g.layer === layer).length} Entidades
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[8px] uppercase font-black bg-slate-50 border-slate-100 text-slate-400 px-2">
                Ativa
              </Badge>
            </Card>
          ))}
          {geometries.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed rounded-[2rem] border-slate-100 bg-slate-50/30">
              <p className="text-[10px] text-slate-400 italic uppercase font-bold tracking-widest">
                Importe um DXF para ver as camadas técnicas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}