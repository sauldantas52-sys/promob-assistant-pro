import * as React from 'react';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { PhysicalPiece } from '@/lib/cut-plan/engine';
import { generateLabelData } from '@/lib/labels/engine';
import { pieceLabelHtml } from '@/lib/labels/piece-label';
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
  
  const pieceForHtml = {
    modNum: piece.moduleSequence || 0,
    code: `${piece.moduleSequence || 0}.${piece.pieceSequence || 0}`,
    masterUid: data.masterUid,
    uid: piece.physicalId,
    modulePieceNumber: piece.pieceSequence || 0,
    modName: piece.moduleName || 'Peça',
    desc: piece.name,
    lo: piece.lo,
    sh: piece.sh,
    thick: piece.thicknessMm,
    model: piece.material,
    fb: [piece.edgeTop, piece.edgeBottom, piece.edgeLeft, piece.edgeRight],
    bandNames: [piece.edgeNameGeneral || '', piece.edgeNameFront || '', piece.edgeNameGeneral || '', piece.edgeNameGeneral || ''],
    obs: piece.metadata?.observations || '',
    group: piece.metadata?.group || `G${piece.moduleSequence || 0}`
  };

  const qrSizeMm = Math.max(10, Math.min(17, Math.min(height * 0.58, width * 0.22)));

  const html = pieceLabelHtml(pieceForHtml, {
    larguraMm: width,
    alturaMm: height,
    qrSvg: renderToString(
      <QRCodeSVG 
        value={data.qrPayload} 
        size={qrSizeMm * 3.78} 
        level="L"
        includeMargin={false}
      />
    )
  });

  return (
    <div 
      className="print:m-0 no-print-shadow"
      style={{ 
        width: `${width}mm`, 
        height: `${height}mm`,
        pageBreakInside: 'avoid',
        boxSizing: 'border-box'
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

