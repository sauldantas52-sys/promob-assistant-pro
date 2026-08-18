/**
 * LÓGICA DE NEGÓCIO — Relatórios, Custos e Visualizador de Etiquetas
 * -----------------------------------------------------------------------
 * Terceira parte extraída do Plano de Corte Pro. Cobre as abas:
 *   - Relatório de custos (RELATÓRIO GERAL DE CUSTOS)
 *   - Planilha de materiais e ferragens
 *   - Relatório completo do projeto (memorial + técnico + custos)
 *   - WhatsApp (link de contato)
 *   - Cards de módulo (agrupamento de peças por módulo/gaveteiro)
 *   - Visualizador de etiquetas em tempo real ("balizador"): a grade que
 *     mostra ao vivo onde cada etiqueta cai na folha impressa, avisando
 *     se alguma etiqueta ultrapassa a borda.
 */

import { esc, num, toNum, CUT_CONFIG } from './cut-plan/parsers/promob-pro';

// ===================== 1) MÉTRICAS E CUSTOS =====================

/** Valores padrão de preço (R$) usados até o usuário configurar os seus próprios. */
export const COST_DEFAULTS = {
  label: 0.15, inkPage: 0.40, tape: 1.50, cut: 0.80, glue: 0.60, planSheet: 0.25,
  manualTapeQty: 0, manualCutQty: 0, manualGlueQty: 0
};

/**
 * Calcula as métricas físicas do projeto (peças, chapas, cortes, metros de fita)
 * necessárias pra depois calcular custos. 
 * 
 * @param {any} materiais - Lista de materiais com peças já empacotadas ou pendentes
 * @param {number} chapaW - Largura da chapa
 * @param {number} chapaH - Altura da chapa
 * @param {number} etiquetasPorPagina - colunas × linhas da folha de etiqueta configurada
 */
export function calcularMetricasProjeto(materiais: any[], chapaW: number, chapaH: number, etiquetasPorPagina: number) {
  if (!materiais) return { pieces: 0, labelPages: 0, planSheets: 0, cuts: 0, edgeMeters: 0 };

  let totalPieces = 0;
  let edgeMm = 0;
  let planSheets = 0;
  let cuts = 0;

  materiais.forEach(m => {
    const pecas = m.pieces || m.pecas || [];
    totalPieces += pecas.length;
    
    // Se já tiver as chapas processadas pelo IndustrialCutPlanEngine
    if (m.sheets) {
      planSheets += m.sheets.length;
      m.sheets.forEach((sheet: any) => {
        sheet.shelves.forEach((shelf: any) => {
          cuts += shelf.placements.length + 1; // Simplificação: 1 corte por peça + 1 por prateleira
        });
      });
    }

    pecas.forEach((p: any) => {
      const fb = p.fb || [p.edgeTop, p.edgeBottom, p.edgeLeft, p.edgeRight] || [];
      const lo = p.lo || p.lengthMm || 0;
      const sh = p.sh || p.widthMm || 0;
      
      if (fb[0] > 0) edgeMm += lo;
      if (fb[1] > 0) edgeMm += lo;
      if (fb[2] > 0) edgeMm += sh;
      if (fb[3] > 0) edgeMm += sh;
    });
  });

  const perPage = Math.max(1, etiquetasPorPagina || 10);
  
  return { 
    pieces: totalPieces, 
    labelPages: Math.ceil(totalPieces / perPage), 
    planSheets: planSheets || Math.ceil(totalPieces / 15), // Fallback se não processado
    cuts: cuts || totalPieces * 4, // Fallback
    edgeMeters: edgeMm / 1000 
  };
}

/**
 * Calcula as linhas de custo de escritório e de produção, e o total geral.
 */
export function calcularCustos(metricas: any, configCustos?: any) {
  const s = Object.assign({}, COST_DEFAULTS, configCustos || {});
  const tapeQty = metricas.edgeMeters + (+s.manualTapeQty || 0);
  const cutQty = metricas.cuts + (+s.manualCutQty || 0);
  const glueQty = metricas.edgeMeters + (+s.manualGlueQty || 0);

  const linha = (item: string, quantidade: number, valorUnitario: number) => ({ 
    item, 
    quantidade, 
    valorUnitario, 
    total: quantidade * valorUnitario 
  });

  const custosEscritorio = [
    linha('Etiquetas', metricas.pieces, s.label),
    linha('Tinta da impressora / página', metricas.labelPages + metricas.planSheets, s.inkPage),
    linha('Folhas do plano de corte', metricas.planSheets, s.planSheet)
  ];
  const custosProducao = [
    linha('Fita de borda (m)', tapeQty, s.tape),
    linha('Cortes', cutQty, s.cut),
    linha('Colagem de fita (m)', glueQty, s.glue)
  ];

  const total = [...custosEscritorio, ...custosProducao].reduce((sum, row) => sum + row.total, 0);
  return { custosEscritorio, custosProducao, total };
}

// ===================== 2) LISTA DE COMPRAS E MATERIAIS =====================

/**
 * Interpreta um texto e extrai linhas estruturadas de materiais.
 */
export function interpretarListaDeComprasTexto(textoPdf: string) {
  if (!textoPdf) return [];
  const ignored = /^(lista|rela[cç][aã]o|material|ferragem|descri[cç][aã]o|quantidade|qtd|unidade|valor|total|cliente|projeto|data)\b/i;

  return textoPdf.split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 2 && !ignored.test(line))
    .map(line => {
      const prices = [...line.matchAll(/R\$\s*([\d.]+(?:,\d{1,2})?)/gi)].map(match => toNum(match[1]));
      const quantity = line.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(un|und|unid|pc|p[cç]|m|m2|m²|kg|cx|jg|par)\b/i);
      const qty = quantity ? toNum(quantity[1]) : 1;
      const unit = (quantity && quantity[2]) ? (quantity[2].toLowerCase() === 'und' ? 'un' : quantity[2]) : 'un';

      let description = line
        .replace(/R\$\s*[\d.]+(?:,\d{1,2})?/gi, '')
        .replace(/(?:^|\s)\d+(?:[.,]\d+)?\s*(?:un|und|unid|pc|p[cç]|m|m2|m²|kg|cx|jg|par)\b/i, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      return {
        description: description || 'Item sem descrição',
        qty,
        unit,
        price: prices[0] || 0,
        total: (prices.length > 1 ? prices[1] : (qty * (prices[0] || 0)))
      };
    });
}
