/**
 * LÓGICA DE NEGÓCIO — Etiquetas de Peça (Plano de Corte Pro)
 * -----------------------------------------------------------------------
 * Complementa o arquivo `logica-plano-de-corte.js`. Gera o HTML de cada
 * etiqueta impressa por peça, EXATAMENTE no mesmo layout do app original.
 */

import { esc, moduleColor, moduleStroke, edgeBandColor } from '../cut-plan/parsers/promob-pro';

// ===================== TEXTO/INFO DA FITA DE BORDA =====================

/**
 * Decide o texto "FITA: ..." (ou "SEM FITA") que aparece na etiqueta,
 * a partir do array fb (fita em cada um dos 4 lados) e bandNames da peça.
 * @param {object} p - peça (com .fb e .bandNames, vindos do parseXML)
 * @returns {{txt:string, has:boolean}}
 */
function fitaInfo(p: any) {
  const fb = p.fb || [0, 0, 0, 0];
  const nLo = (fb[0] > 0 ? 1 : 0) + (fb[1] > 0 ? 1 : 0);
  const nSh = (fb[2] > 0 ? 1 : 0) + (fb[3] > 0 ? 1 : 0);
  const names = [...new Set(((p.bandNames || []) as string[]).filter((name: string, index: number) => fb[index] > 0 && name))];
  const refs = fb.map((value: number, index: number) => value > 0 ? 'F' + (index + 1) : '').filter(Boolean);

  if (nLo + nSh === 0) return { txt: 'SEM FITA', has: false };
  if (nLo + nSh === 4) return { txt: refs.join('/') + ' · 4 LADOS' + (names.length ? ' · ' + names.join(' / ') : ''), has: true };

  const parts = [];
  if (nLo) parts.push(nLo + '× ' + Math.round(p.lo) + 'mm');
  if (nSh) parts.push(nSh + '× ' + Math.round(p.sh) + 'mm');
  return { txt: refs.join('/') + ' · ' + parts.join(' + ') + (names.length ? ' · ' + names.join(' / ') : ''), has: true };
}

/**
 * Desenha o mini-diagrama retangular da peça com as fitas marcadas nos
 * lados certos (F1=topo, F2=baixo, F3=esquerda, F4=direita), colorido
 * conforme o nome do material da fita.
 * @param {object} p - peça
 * @param {number} scale - fator de escala do desenho (1 = tamanho padrão)
 */
function fitaBox(p: any, scale?: number) {
  const sc = scale || 1;
  const fb = p.fb || [0, 0, 0, 0];
  const W = Math.round(70 * sc), H = Math.round(44 * sc), pad = Math.max(3, Math.round(6 * sc));
  const x0 = pad, y0 = pad, x1 = W - pad, y1 = H - pad;
  const sw = Math.max(2, 3.5 * sc);
  const names = (p.bandNames || []) as string[];
  const rl = (a: number, b: number, c: number, d: number, name: string) => '<line x1="' + a + '" y1="' + b + '" x2="' + c + '" y2="' + d + '" stroke="' + edgeBandColor(name) + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
  const fs = Math.max(7, Math.round(8 * sc));
  const tag = (x: number, y: number, label: string, rotate: number) => '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" font-size="' + fs + '" font-weight="800" fill="#111" stroke="#fff" stroke-width="2" paint-order="stroke"' + (rotate ? ' transform="rotate(' + rotate + ' ' + x + ' ' + y + ')"' : '') + '>' + label + '</text>';

  let s = '<svg width="' + W + '" height="' + H + '" style="flex:none">';
  s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="#fff" stroke="#999" stroke-width="1.2"/>';
  if (fb[0] > 0) { s += rl(x0, y0, x1, y0, names[0] || ''); s += tag((x0 + x1) / 2, y0 + fs * .65, 'F1', 0); }
  if (fb[1] > 0) { s += rl(x0, y1, x1, y1, names[1] || ''); s += tag((x0 + x1) / 2, y1 - fs * .65, 'F2', 0); }
  if (fb[2] > 0) { s += rl(x0, y0, x0, y1, names[2] || ''); s += tag(x0 + fs * .65, (y0 + y1) / 2, 'F3', -90); }
  if (fb[3] > 0) { s += rl(x1, y0, x1, y1, names[3] || ''); s += tag(x1 - fs * .65, (y0 + y1) / 2, 'F4', 90); }
  return s + '</svg>';
}

// Ordena etiquetas por módulo e depois pelo código da peça (ex: "3.A" antes de "10.B")
export function codeKey(c: string) {
  const p = String(c || '').split('.');
  return (p[1] || '') + String(p[0] || '').padStart(4, '0');
}

/**
 * Nome do material a mostrar na etiqueta.
 * @param {string} original - nome do material vindo do XML (model)
 * @param {string} [override] - nome customizado salvo no projeto, se houver
 */
function effectiveMdfColor(original: string, override?: string) {
  return override || original || 'Material';
}

// ===================== UMA ETIQUETA (HTML de uma peça) =====================

interface PieceLabelOpts {
  larguraMm: number;
  alturaMm: number;
  qrSvg: string;
  mdfOverride?: string;
}

/**
 * Gera o HTML de UMA etiqueta de peça, no layout idêntico ao original:
 * quadrado colorido "G<n>" + código da peça + QR, dados da peça, fita.
 *
 * @param {object} piece - peça com {modNum, code, masterUid, uid,
 *   modulePieceNumber, modName, pdfName, desc, lo, sh, thick, model, fb,
 *   bandNames, obs, operatorName}
 * @param {object} opts
 * @returns {string} HTML pronto da etiqueta
 */
export function pieceLabelHtml(piece: any, opts: PieceLabelOpts) {
  const { larguraMm: W, alturaMm: H, qrSvg = '', mdfOverride } = opts;
  const FS = Math.max(8.5, Math.min(15.2, H * 0.31));
  const k = (FS / 12) * 1.08; // escala do desenho de fita, proporcional ao tamanho da etiqueta

  const f = fitaInfo(piece);
  const SQ = Math.max(5, Math.min(8.5, H * 0.19)); // tamanho do quadrado "G<n>"
  const QR = Math.max(10, Math.min(17, H * 0.58, W * 0.22)); // tamanho do QR

  return (
    '<div class="etq" style="width:' + W + 'mm;height:' + H + 'mm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;font-size:' + FS.toFixed(1) + 'px;font-weight:700;line-height:1.13;border:1px solid #777;background:#fff;border-radius:6px;padding:0.4em 0.55em">' +
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) ' + QR.toFixed(1) + 'mm;gap:1.5mm;align-items:start">' +
        '<div class="etq-main-black" style="min-width:0">' +
          '<div style="display:flex;align-items:center;gap:0.3em;margin-bottom:0.1em">' +
            '<div style="flex:none;width:' + SQ.toFixed(1) + 'mm;height:' + SQ.toFixed(1) + 'mm;background:' + moduleColor(piece.modNum) + ';border:0.8pt solid ' + moduleStroke(piece.modNum) + ';border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:0.7em;color:' + moduleStroke(piece.modNum) + '">G' + piece.modNum + '</div>' +
            '<div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:1.15em;letter-spacing:-0.02em">#' + piece.code + '</div>' +
          '</div>' +
          '<div style="font-size:0.65em;color:#666;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(piece.masterUid, 14) + ' · G' + piece.modNum + '-P' + piece.modulePieceNumber + (piece.group ? ' · ' + piece.group : '') + '</div>' +
          '<div style="font-size:0.65em;color:#666;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">PLANO #' + piece.code + ' · PEÇA ' + esc(piece.uid, 8) + ' · ' + esc(piece.modName, 12) + '</div>' +
        '</div>' +
        '<div style="flex:none;width:' + QR.toFixed(1) + 'mm;height:' + QR.toFixed(1) + 'mm;display:flex;align-items:center;justify-content:center;background:#fff">' + qrSvg + '</div>' +
      '</div>' +
      '<div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;margin:0.1em 0">' +
        '<div style="font-size:1.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#000">' + esc(piece.desc || piece.pdfName) + '</div>' +
        '<div style="font-size:1.15em;color:#000">' + Math.round(piece.lo) + ' × ' + Math.round(piece.sh) + ' × ' + piece.thick + ' mm</div>' +
        '<div style="font-size:0.85em;color:#444;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(effectiveMdfColor(piece.model, mdfOverride)) + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:flex-end;gap:0.5em;margin-top:auto">' +
        '<div style="flex:1;min-width:0;padding-bottom:0.1em">' +
          '<div style="font-size:0.75em;color:' + (f.has ? '#111' : '#aaa') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">FITA: ' + f.txt + '</div>' +
          (piece.obs ? '<div style="font-size:0.65em;color:#c00;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">OBS: ' + esc(piece.obs) + '</div>' : '') +
          (piece.operatorName ? '<div style="font-size:0.55em;color:#888;margin-top:1px">OP: ' + esc(piece.operatorName, 20) + '</div>' : '') +
        '</div>' +
        fitaBox(piece, k) +
      '</div>' +
    '</div>'
  );
}
