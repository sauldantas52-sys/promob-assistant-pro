import { supabase } from "@/integrations/supabase/client";

/**
 * CutProParser - Especialista em interpretar exportações do Cut Pro.
 * Formatos suportados: CSV (Padrão Industrial).
 */
export const CutProParser = {
  /**
   * Converte CSV do Cut Pro em estrutura de cut_plan.
   * O CSV do Cut Pro geralmente traz as peças já individualizadas.
   */
  async parseCSV(projectId: string, csvText: string): Promise<any> {
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) throw new Error("Arquivo CSV inválido ou vazio.");

    const firstLine = lines[0];
    if (!firstLine) throw new Error("Cabeçalho do CSV não encontrado.");

    // O Cut Pro pode usar vírgula ou ponto e vírgula
    const delimiter = firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
    
    // Identificar colunas críticas
    const idxWidth = headers.findIndex(h => h.includes('largura') || h.includes('width'));
    const idxLength = headers.findIndex(h => h.includes('comprimento') || h.includes('length'));
    const idxMaterial = headers.findIndex(h => h.includes('material'));
    const idxThickness = headers.findIndex(h => h.includes('espessura') || h.includes('thickness'));
    const idxName = headers.findIndex(h => h.includes('nome') || h.includes('description') || h.includes('peca'));
    
    const rows = lines.slice(1);
    const pieces: any[] = [];
    
    // Heurística para detectar chapas e cortes (se o CSV for consolidado)
    // Se não, usaremos valores aproximados baseados na área
    let estimatedSheets = 0;
    let totalArea = 0;

    rows.forEach((row, i) => {
      const cols = row.split(delimiter).map(c => c.trim());
      
      const width = parseFloat(cols[idxWidth]?.replace(',', '.') || '0');
      const length = parseFloat(cols[idxLength]?.replace(',', '.') || '0');
      const thickness = parseFloat(cols[idxThickness]?.replace(',', '.') || '0');
      
      if (width > 0 && length > 0) {
        totalArea += (width * length) / 1000000;
        pieces.push({
          physicalId: `cutpro_${projectId}_${i}`,
          name: cols[idxName] || `Peça ${i+1}`,
          width_mm: width,
          length_mm: length,
          thickness_mm: thickness,
          material: cols[idxMaterial] || 'MDF',
          source: 'cutpro_oficial'
        });
      }
    });

    // Área útil de uma chapa 2750x1830 com refilo de 5mm é ~4.98m2
    estimatedSheets = Math.ceil(totalArea / 4.9);
    const utilizationPercent = Math.min(98, (totalArea / (estimatedSheets * 5.03)) * 100);

    return {
      source: 'cutpro_oficial',
      total_pieces: pieces.length,
      total_sheets: estimatedSheets,
      total_cuts: pieces.length * 4, // Estimativa conservadora de cortes
      utilization_percent: utilizationPercent,
      pieces,
      headers: headers,
      delimiter: delimiter,
      line_count: lines.length,
      metadata: {
        parser_version: '4.3.2',
        total_area_m2: totalArea,
        detected_delimiter: delimiter,
        detected_headers: headers
      }
    };
  }
};
