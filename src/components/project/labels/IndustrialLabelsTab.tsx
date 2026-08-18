import * as React from 'react';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PhysicalPiece } from '@/lib/cut-plan/engine';
import { generateLabelData } from '@/lib/labels/engine';
import { getEdgeColor, getEdgeData } from '@/lib/cut-plan/edges';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Settings, Eye, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface LabelPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  cols: number;
  rows?: number;
  type: 'folha' | 'rolo';
}

const PRESETS: LabelPreset[] = [
  { id: 'pimaco-6083', name: 'Pimaco 6083 — Carta, 10 por folha', width: 95, height: 45, cols: 2, rows: 5, type: 'folha' },
  { id: 'custom-95-45', name: 'Personalizado 95 × 45 mm', width: 95, height: 45, cols: 2, type: 'rolo' },
  { id: 'remac-100-80', name: 'REMAC folha 100 × 80 mm', width: 100, height: 80, cols: 1, type: 'folha' },
  { id: 'remac-100-60', name: 'REMAC folha 100 × 60 mm', width: 100, height: 60, cols: 1, type: 'folha' },
  { id: 'remac-90-30', name: 'REMAC folha 90 × 30 mm', width: 90, height: 30, cols: 2, type: 'folha' },
  { id: 'remac-100-30', name: 'REMAC folha 100 × 30 mm', width: 100, height: 30, cols: 1, type: 'folha' },
  { id: 'remac-40-20', name: 'REMAC folha 40 × 20 mm', width: 40, height: 20, cols: 4, type: 'folha' },
  { id: 'zebra-100-50', name: 'Zebra rolo 100 × 50 mm', width: 100, height: 50, cols: 1, type: 'rolo' },
  { id: 'zebra-100-30', name: 'Zebra rolo 100 × 30 mm', width: 100, height: 30, cols: 1, type: 'rolo' },
  { id: 'zebra-50-30', name: 'Zebra rolo 50 × 30 mm', width: 50, height: 30, cols: 1, type: 'rolo' },
  { id: 'manual', name: 'Manual', width: 100, height: 50, cols: 1, type: 'rolo' },
];

export function IndustrialLabelsTab({ pieces }: { pieces: PhysicalPiece[] }) {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0]!.id);
  const [customConfig, setCustomConfig] = useState(PRESETS[0]!);
  const [showSettings, setShowSettings] = useState(false);

  // Ordenação Industrial: Módulo > Código da Peça
  const sortedPieces = [...pieces].sort((a, b) => {
    const modA = a.moduleSequence || 0;
    const modB = b.moduleSequence || 0;
    if (modA !== modB) return modA - modB;
    
    // Ordenação do código (1.A, 2.A, 10.A, 1.B)
    const codeA = `${a.pieceSequence || 0}.${a.metadata?.group || 'A'}`;
    const codeB = `${b.pieceSequence || 0}.${b.metadata?.group || 'A'}`;
    return codeA.localeCompare(codeB, undefined, { numeric: true });
  });

  const handlePresetChange = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setCustomConfig(preset);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Etiquetas Industriais</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Geração de 409 etiquetas físicas • Gabarito Industrial</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest gap-2"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-3.5 w-3.5" /> Ajustes
          </Button>
          <Button 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest gap-2"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir Tudo
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card className="border-2 border-indigo-100 shadow-none no-print">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modelo Predefinido</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-9 text-xs font-bold uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-bold uppercase">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Largura (mm)</Label>
              <Input 
                type="number" 
                value={customConfig.width} 
                onChange={e => setCustomConfig({...customConfig, width: Number(e.target.value)})}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Altura (mm)</Label>
              <Input 
                type="number" 
                value={customConfig.height} 
                onChange={e => setCustomConfig({...customConfig, height: Number(e.target.value)})}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Colunas</Label>
              <Input 
                type="number" 
                value={customConfig.cols} 
                onChange={e => setCustomConfig({...customConfig, cols: Number(e.target.value)})}
                className="h-9 text-xs font-bold"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Etiquetas */}
      <div 
        className="grid gap-4 print:gap-0 print:grid-cols-[repeat(var(--cols),1fr)] print:w-full no-print-margin print:block" 
        style={{ 
          '--cols': customConfig.cols,
          display: 'grid',
          gridTemplateColumns: `repeat(${customConfig.cols}, 1fr)`
        } as React.CSSProperties}
      >
        {sortedPieces.map((piece) => (
          <IndustrialLabel 
            key={piece.physicalId} 
            piece={piece} 
            width={customConfig.width}
            height={customConfig.height}
            presetId={selectedPreset}
          />
        ))}
      </div>

      <style>{`
        @media print {
          body {
             background: white !important;
             margin: 0 !important;
             padding: 0 !important;
          }
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .print-area, .print-area *, .no-print-margin, .no-print-margin * { visibility: visible; }
          
          .no-print-margin {
             position: absolute !important;
             left: 0 !important;
             top: 0 !important;
             width: 100% !important;
             margin: 0 !important;
             padding: 0 !important;
             display: block !important;
          }

          @page {
            margin: 0;
            size: auto;
          }
          
          /* Força o balizador de folha para evitar transbordamento */
          .print-area {
            overflow: hidden;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}

function IndustrialLabel({ piece, width, height, presetId }: { piece: PhysicalPiece, width: number, height: number, presetId?: string }) {
  const data = generateLabelData(piece);
  const edgeData = getEdgeData(piece);
  const qrSize = Math.max(10, Math.min(17, Math.min(height * 0.58, width * 0.22)));
  const fontSize = height * 0.31;

  // Lógica de "Balizador" para evitar que as etiquetas saiam da folha (Remac/Zebra)
  // Aplica margens de segurança internas e garante que o conteúdo não transborde os limites físicos
  const isFolha = presetId?.includes('remac') || presetId?.includes('folha');
  const padding = isFolha ? '4mm' : '3mm';

  return (
    <div 
      className="bg-white border border-slate-200 relative overflow-hidden print:border-slate-300 print:shadow-none shadow-sm rounded-lg print:rounded-none flex flex-col justify-between print:m-0"
      style={{ 
        width: `${width}mm`, 
        height: `${height}mm`,
        maxWidth: `${width}mm`,
        maxHeight: `${height}mm`,
        minWidth: `${width}mm`,
        minHeight: `${height}mm`,
        padding: padding,
        pageBreakInside: 'avoid',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-900 text-white text-[10px] font-black px-1.5 py-0.5 rounded leading-none flex items-center justify-center min-w-[20px]">
            G{piece.moduleSequence || 0}
          </div>
          <span className="text-[10px] font-black text-slate-900 leading-none">
            #{piece.moduleSequence || 0}.{piece.pieceSequence || 0}
            {piece.metadata?.group ? `.${piece.metadata.group}` : ''}
          </span>
        </div>
        <div className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter text-right">
          MESTRE {data.masterUid.substring(0, 8)}<br/>
          {data.physicalId.split('_rep')[0]}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex justify-between items-center flex-1 py-1">
        <div className="flex-1 space-y-0.5 pr-2">
          <p className="text-[10px] font-black text-slate-900 leading-tight uppercase truncate">
            {data.name}
          </p>
          <p className="text-[9px] font-black text-slate-700 leading-none">
            {piece.lengthMm} × {piece.widthMm} × {piece.thicknessMm} mm
          </p>
          <p className="text-[8px] font-bold text-slate-500 uppercase leading-none">
            {data.material} {piece.color}
          </p>
          
          <div className="mt-1 flex items-center gap-2">
             <EdgeSchema piece={piece} />
             <span className={`text-[7px] font-black uppercase ${edgeData.hasEdges ? 'text-indigo-600' : 'text-slate-400'}`}>
               {data.edgeLabel}
             </span>
          </div>

          {piece.metadata?.observations && (
            <p className="text-[7px] font-black uppercase text-red-600 leading-none bg-red-50 p-0.5 rounded mt-1">
              LEGENDA: {piece.metadata.observations}
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          <QRCodeSVG 
            value={data.qrPayload} 
            size={qrSize * 3.78} // mm to px approx
            level="L"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-end border-t border-slate-100 pt-1">
        <span className="text-[6px] font-bold text-slate-400 uppercase">
          PLANO #{piece.moduleSequence || 0}.{piece.pieceSequence || 0}
        </span>
        <span className="text-[6px] font-mono text-slate-300">
          {data.physicalId}
        </span>
      </div>
    </div>
  );
}

function EdgeSchema({ piece }: { piece: PhysicalPiece }) {
  return (
    <div className="relative w-6 h-4 border border-slate-200 bg-slate-50 rounded-[1px]">
      {/* Top Edge */}
      {piece.edgeTop > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 h-[2px]" 
          style={{ backgroundColor: getEdgeColor(piece.edgeNameGeneral) }} 
        />
      )}
      {/* Bottom Edge */}
      {piece.edgeBottom > 0 && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-[2px]" 
          style={{ backgroundColor: getEdgeColor(piece.edgeNameGeneral) }} 
        />
      )}
      {/* Left Edge */}
      {piece.edgeLeft > 0 && (
        <div 
          className="absolute top-0 bottom-0 left-0 w-[2px]" 
          style={{ backgroundColor: getEdgeColor(piece.edgeNameGeneral) }} 
        />
      )}
      {/* Right Edge */}
      {piece.edgeRight > 0 && (
        <div 
          className="absolute top-0 bottom-0 right-0 w-[2px]" 
          style={{ backgroundColor: getEdgeColor(piece.edgeNameGeneral) }} 
        />
      )}
    </div>
  );
}
