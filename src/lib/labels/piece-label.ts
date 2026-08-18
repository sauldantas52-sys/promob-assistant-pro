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
  const tag = (x: number, y: number, label: string, rotate: number) => '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" font-size="' + fs + '" font-weight="900" fill="#000" stroke="#fff" stroke-width="2" paint-order="stroke"' + (rotate ? ' transform="rotate(' + rotate + ' ' + x + ' ' + y + ')"' : '') + '>' + label + '</text>';

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
  projectInfo?: {
    clientName?: string | null;
    contact?: string | null;
    dueDate?: string | null;
  };
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
  const { larguraMm: W, alturaMm: H, qrSvg = '', mdfOverride, projectInfo } = opts;
  const FS = Math.max(8.5, Math.min(15.2, H * 0.31));
  const k = (FS / 12) * 1.08; // escala do desenho de fita, proporcional ao tamanho da etiqueta

  const f = fitaInfo(piece);
  const SQ = Math.max(5, Math.min(8.5, H * 0.19)); // tamanho do quadrado "G<n>"
  const QR = Math.max(10, Math.min(17, H * 0.58, W * 0.22)); // tamanho do QR

  const labelContent = (
    '<div class="etq" style="width:' + W + 'mm;height:' + H + 'mm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;font-size:' + FS.toFixed(1) + 'px;font-weight:900;line-height:1.1;border:1px solid #000;background:#fff;border-radius:2px;padding:0.3em 0.4em">' +
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) ' + QR.toFixed(1) + 'mm;gap:1mm;align-items:start">' +
        '<div class="etq-main-black" style="min-width:0">' +
          '<div style="display:flex;align-items:center;gap:0.3em;margin-bottom:0.05em">' +
            '<div style="flex:none;width:' + SQ.toFixed(1) + 'mm;height:' + SQ.toFixed(1) + 'mm;background:' + moduleColor(piece.modNum) + ';border:1px solid #000;border-radius:1px;display:flex;align-items:center;justify-content:center;font-size:0.75em;font-weight:900;color:#000">G' + piece.modNum + '</div>' +
            '<div style="width:2.5mm;height:2.5mm;background:' + edgeBandColor(piece.model) + ';border:0.2mm solid #000;flex:none;"></div>' +
            '<div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:1.25em;letter-spacing:-0.03em;color:#000">#' + piece.code + '</div>' +
            (piece.idXml ? '<div style="font-size:0.45em;background:#eee;padding:0.2mm 1mm;border:0.1mm solid #ccc;color:#666;font-family:monospace;letter-spacing:0;font-weight:900;line-height:1">ID:' + piece.idXml + '</div>' : '') +
          '</div>' +
          '<div style="font-size:0.65em;color:#000;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(piece.masterUid, 16) + ' · G' + piece.modNum + '-P' + piece.modulePieceNumber + (piece.group ? ' · ' + piece.group : '') + '</div>' +
          '<div style="font-size:0.65em;color:#000;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">PEÇA ' + esc(piece.uid, 10) + ' · ' + esc(piece.modName, 15) + '</div>' +
        '</div>' +
        '<div style="flex:none;width:' + QR.toFixed(1) + 'mm;height:' + QR.toFixed(1) + 'mm;display:flex;align-items:center;justify-content:center;background:#fff;border:0.5px solid #eee">' + qrSvg + '</div>' +
      '</div>' +
      '<div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;margin:0.05em 0">' +
        '<div style="font-size:1.1em;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#000">' + esc(piece.desc || piece.pdfName) + '</div>' +
        '<div style="font-size:1.3em;font-weight:900;color:#000;letter-spacing:-0.02em">' + Math.round(piece.lo) + ' × ' + Math.round(piece.sh) + ' × ' + piece.thick + ' mm</div>' +
        '<div style="font-size:0.9em;color:#000;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(effectiveMdfColor(piece.model, mdfOverride)) + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:flex-end;gap:0.4em;margin-top:auto">' +
        '<div style="flex:1;min-width:0;padding-bottom:0.1em">' +
          '<div style="font-size:0.8em;font-weight:900;color:' + (f.has ? '#000' : '#888') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">FITA: ' + f.txt + '</div>' +
          (piece.obs ? '<div style="font-size:0.7em;font-weight:900;color:#d00;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">OBS: ' + esc(piece.obs) + '</div>' : '') +
          (piece.operatorName ? '<div style="font-size:0.6em;font-weight:900;color:#444;margin-top:1px">OP: ' + esc(piece.operatorName, 20) + '</div>' : '') +
        '</div>' +
        fitaBox(piece, k) +
      '</div>' +
    '</div>'
  );

  // Se for a etiqueta final (cliente), adicionamos um overlay ou layout alternativo
  if (piece.isClientTag && projectInfo) {
    return (
      '<div class="etq etq-client" style="width:' + W + 'mm;height:' + H + 'mm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;font-size:' + (FS * 0.9).toFixed(1) + 'px;font-weight:900;line-height:1.2;border:2px solid #000;background:#fff;border-radius:4px;padding:0.6em 0.8em">' +
        '<div style="border-bottom:1.5px solid #000;padding-bottom:0.3em;margin-bottom:0.5em;display:flex;justify-content:between;align-items:center">' +
          '<div style="font-size:1.2em;color:#000;text-transform:uppercase">Identificação do Cliente</div>' +
          '<div style="font-size:0.8em;background:#000;color:#fff;padding:0.1em 0.4em;border-radius:2px">PROJETO FINAL</div>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:0.4em">' +
          '<div>' +
            '<div style="font-size:0.7em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Cliente / Obra</div>' +
            '<div style="font-size:1.4em;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(projectInfo.clientName || 'Não informado') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:0.7em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Contato</div>' +
            '<div style="font-size:1.1em;color:#000">' + esc(projectInfo.contact || '-') + '</div>' +
          '</div>' +
          '<div style="margin-top:auto;display:flex;justify-content:between;align-items:flex-end">' +
            '<div>' +
              '<div style="font-size:0.7em;color:#666;text-transform:uppercase;letter-spacing:0.05em">Data de Vencimento</div>' +
              '<div style="font-size:1.3em;color:#d00">' + (projectInfo.dueDate || '-') + '</div>' +
            '</div>' +
            '<div style="font-size:0.6em;color:#aaa;text-align:right">Gerado por Monta AI</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  return labelContent;
}
