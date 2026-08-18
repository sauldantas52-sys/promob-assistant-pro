/**
 * LÓGICA DE NEGÓCIO — Plano de Corte Pro
 * -----------------------------------------------------------------------
 * Extraído do app original (app.asar → PlanoDeCorte.html) e isolado sem
 * NENHUMA dependência do Electron. Roda 100% no navegador.
 */

import { z } from 'zod';

// ===================== HELPERS NUMÉRICOS / TEXTO =====================

export const num = (n: number | string, d = 0) => 
  Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export const toNum = (x: any) => {
  const v = parseFloat(String(x == null ? '' : x).replace(',', '.'));
  return isNaN(v) ? 0 : v;
};

export function fnum(v: any) {
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return isFinite(n) ? n : 0;
}

export function fr2(v: number) { return Math.round(v * 100) / 100; }

export function fmm(v: number) { 
  return (Math.round(v * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); 
}

export function fmoda(a: number[]) {
  const f: Record<number, number> = {}; 
  let b = 0, bn = 0;
  a.forEach(v => { 
    if (v > 0) { 
      f[v] = (f[v] || 0) + 1; 
      if (f[v] > bn) { 
        bn = f[v]; 
        b = v; 
      } 
    } 
  });
  return b;
}

export function esc(s: string | null, n?: number) {
  return String(s || '').slice(0, n || 99).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

// Gera letras de coluna tipo planilha: A, B, C ... Z, AA, AB ...
export function colLetter(i: number) {
  let s = ''; i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

// Cor determinística por número de módulo
export function moduleColor(mod: number) { const h = ((mod || 1) * 57) % 360; return 'hsl(' + h + ',50%,85%)'; }
export function moduleStroke(mod: number) { const h = ((mod || 1) * 57) % 360; return 'hsl(' + h + ',45%,50%)'; }

// Cor da fita de borda a partir do nome do material
export function edgeBandColor(name: string) {
  const key = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const colors: [RegExp, string][] = [
    [/preto|black/, '#111111'], [/branco|white/, '#cbd5e1'], [/carbon|grafite|chumbo/, '#374151'], [/cinza|silver|prata/, '#7c8798'],
    [/vermelh|red/, '#dc2626'], [/azul|blue/, '#2563eb'], [/verde|green/, '#15803d'], [/amarel|yellow/, '#eab308'], [/laranja|orange/, '#ea580c'],
    [/fendi|bege|areia/, '#a68a64'], [/cumaru/, '#7c4828'], [/durban/, '#8b6648'], [/almeria/, '#b49a72'], [/carvalho|freijo/, '#a87543'], [/nogueira|imbuia/, '#5f3b25']
  ];
  for (const entry of colors) if (entry[0].test(key)) return entry[1];
  let hash = 0; for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return key ? 'hsl(' + (hash % 360) + ',55%,42%)' : '#e02424';
}

// Configuração de corte
export const CUT_CONFIG = { trim: 10, kerf: 4 };

// Lê um valor dentro de <REFERENCES><TAG REFERENCE="..."/></REFERENCES>
export function refOf(item: Element, tag: string) {
  const el = item.querySelector(':scope > REFERENCES > ' + tag);
  return el ? el.getAttribute('REFERENCE') : null;
}

// Sobe na árvore do XML até achar o <ITEM> "pai"
export function topItemOf(el: Element) {
  let t: Element | null = null, n = el.parentNode;
  while (n && n.nodeType === 1) { if ((n as Element).tagName === 'ITEM') t = n as Element; n = n.parentNode; }
  return t;
}

// ===================== 1) LEITURA DO XML DO PROMOB =====================

/**
 * Lê o texto de um XML exportado pelo Promob e devolve a estrutura de peças
 * já organizada por material (MDF + espessura).
 */
export function parsePromobProXML(text: string) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML inválido.');

  const listing = doc.querySelector('LISTING');
  const meta = { 
    desc: (listing && listing.getAttribute('DESCRIPTION')) || 'Projeto', 
    date: (listing && listing.getAttribute('DATE')) || '' 
  };

  const groups: Record<string, any> = {}; 
  let chapaW = 2750, chapaH = 1830;

  doc.querySelectorAll('ITEM').forEach(item => {
    if (refOf(item, 'MATERIAL') !== 'MDF' || !refOf(item, 'THICKNESS')) return;

    const rep = Math.max(1, Math.round(toNum(item.getAttribute('REPETITION') || 1)));
    const mw = toNum(refOf(item, 'MAXWIDTH')), md = toNum(refOf(item, 'MAXDEPTH'));
    if (mw > 0 && md > 0) { chapaW = mw; chapaH = md; }

    // Fitas de borda: 4 lados
    const fb = [1, 2, 3, 4].map(i => toNum(refOf(item, 'FITA_BORDA_' + i)));
    const bandName = refOf(item, 'MODEL_DESCRIPTION_FITA') || refOf(item, 'MODEL_DESCRIPTION') || 'Fita';
    const frontBandName = refOf(item, 'MODEL_DESCRIPTION_FITA_FRO') || bandName;
    const bandNames = [bandName, frontBandName, bandName, bandName];

    const dims = [
      toNum(item.getAttribute('WIDTH')), 
      toNum(item.getAttribute('HEIGHT')), 
      toNum(item.getAttribute('DEPTH'))
    ].sort((a, b) => b - a);
    
    const lo = dims[0], sh = dims[1];
    const model = refOf(item, 'MODEL') || 'Material';
    const thick = toNum(refOf(item, 'THICKNESS'));

    const key = model + '||' + thick;
    const g = groups[key] || (groups[key] = { model, thick, pecas: [] });

    let mod: any = item.parentNode; 
    while (mod && mod.nodeType === 1 && mod.tagName !== 'ITEM') mod = mod.parentNode;
    
    const topEl = topItemOf(item);
    const topUid = topEl ? (topEl.getAttribute('UNIQUEID') || '') : '';

    // Lógica simplificada de extração para o port
    g.pecas.push({
      name: item.getAttribute('DESCRIPTION') || 'Peça',
      lo,
      sh,
      rep,
      thick,
      fb,
      bandNames,
      topUid,
      id: item.getAttribute('UNIQUEID') || Math.random().toString(36).substr(2, 9)
    });
  });

  return {
    meta,
    materiais: Object.values(groups),
    chapaW,
    chapaH,
    furacao: {} // Placeholder para lógica de furação futura se necessário
  };
}
