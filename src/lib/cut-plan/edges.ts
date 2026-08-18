import { PhysicalPiece } from "@/lib/cut-plan/engine";

export const getEdgeColor = (edgeName: string | null | undefined): string => {
  const map: Record<string, string> = {
    'branco': '#cbd5e1',
    'carbono': '#374151',
    'grafite': '#374151',
    'chumbo': '#374151',
    'cinza': '#7c8798',
    'prata': '#7c8798',
    'vermelho': '#dc2626',
    'azul': '#2563eb',
    'verde': '#15803d',
    'amarelo': '#eab308',
    'laranja': '#ea580c',
    'fendi': '#a68a64',
    'bege': '#a68a64',
    'areia': '#a68a64',
    'cumaru': '#7c4828',
    'durban': '#8b6648',
    'almeria': '#b49a72',
    'carvalho': '#a87543',
    'freijo': '#a87543',
    'nogueira': '#5f3b25',
    'imbuia': '#5f3b25',
  };

  if (!edgeName) return '#111111'; // Preto default
  
  const lower = edgeName.toLowerCase();
  for (const key in map) {
    if (lower.includes(key)) return map[key]!;
  }
  
  return '#111111';
};

export const getEdgeData = (piece: PhysicalPiece) => {
  const edges = [
    { label: 'F1', val: piece.edgeTop },
    { label: 'F2', val: piece.edgeBottom },
    { label: 'F3', val: piece.edgeLeft },
    { label: 'F4', val: piece.edgeRight }
  ].filter(e => e.val > 0);

  return {
    hasEdges: edges.length > 0,
    edgeCount: edges.length,
    sides: edges,
    label: edges.length === 0 ? 'SEM FITA' : `F${edges.map(e => e.label.replace('F', '')).join('/')} · ${edges.length} LADOS`
  };
};
