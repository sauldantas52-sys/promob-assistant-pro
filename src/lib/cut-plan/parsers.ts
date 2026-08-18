import { supabase } from "@/integrations/supabase/client";
import { PhysicalPiece } from "./engine";

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

    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
    
    // Identificar colunas críticas
    const idxWidth = headers.findIndex(h => h.includes('largura') || h.includes('width'));
    const idxLength = headers.findIndex(h => h.includes('comprimento') || h.includes('length'));
    const idxMaterial = headers.findIndex(h => h.includes('material'));
    const idxThickness = headers.findIndex(h => h.includes('espessura') || h.includes('thickness'));
    const idxName = headers.findIndex(h => h.includes('nome') || h.includes('description') || h.includes('peca'));
    
    const rows = lines.slice(1);
    const pieces: any[] = [];
    
    rows.forEach((row, i) => {
      const cols = row.split(';').map(c => c.trim());
      
      const width = parseFloat(cols[idxWidth]?.replace(',', '.') || '0');
      const length = parseFloat(cols[idxLength]?.replace(',', '.') || '0');
      const thickness = parseFloat(cols[idxThickness]?.replace(',', '.') || '0');
      
      pieces.push({
        physicalId: `cutpro_${projectId}_${i}`,
        name: cols[idxName] || `Peça ${i+1}`,
        width_mm: width,
        length_mm: length,
        thickness_mm: thickness,
        material: cols[idxMaterial] || 'MDF',
        source: 'cutpro_oficial'
      });
    });

    return {
      source: 'cutpro_oficial',
      total_pieces: pieces.length,
      pieces,
      metadata: {
        parser_version: '4.3',
        original_filename: 'cutpro_export.csv'
      }
    };
  }
};
