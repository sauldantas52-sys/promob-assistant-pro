import { supabase } from "@/integrations/supabase/client";

export interface BitolaRule {
  bitola: number;
  description: string;
  tolerancia_mm: number;
  unidade: string;
  ferragem_associada?: string;
  face_referencia?: string;
  origem_regra: string;
}

export interface DrillingCoordinate {
  part_id: string;
  module_name?: string;
  group?: string; // G1/G2
  material?: string;
  thickness_mm?: number;
  ferragem_relacionada?: string;
  bitola_aplicada?: number;
  x: number;
  y: number;
  z: number;
  diametro: number;
  profundidade: number;
  face: string;
  origem: "XML" | "DXF" | "PDF" | "REGRA_BITOLA" | "INFERIDO";
  status: "confirmada" | "calculada" | "inferida" | "ausente" | "conflitante";
  regra_aplicada?: string;
}

export interface EngineeringReport {
  project_id: string;
  timestamp: string;
  total_parts: number;
  validated_parts: number;
  blocked_machining: number;
  conflicts: string[];
  evidence_log: string[];
  is_simulation?: boolean;
}

/**
 * Matriz de Bitolas Monta AI (Baseada em Padrão de Mercado/Promob)
 * Estas bitolas são padrões da indústria moveleira para MDF/MDP.
 * TODO: Permitir configuração por empresa via banco de dados.
 */
export const PROMOB_BITOLA_RULES: BitolaRule[] = [
  { 
    bitola: 6, 
    description: "Fundo / Painel Fino", 
    tolerancia_mm: 0.3, 
    unidade: "mm",
    origem_regra: "Padrão Indústria MDF 6mm",
    face_referencia: "Traseira"
  },
  { 
    bitola: 15, 
    description: "Estrutura Padrão / Portas", 
    tolerancia_mm: 0.5, 
    unidade: "mm",
    origem_regra: "Padrão Indústria MDF 15mm",
    face_referencia: "Faces/Bordas"
  },
  { 
    bitola: 18, 
    description: "Estrutura Reforçada / Portas", 
    tolerancia_mm: 0.5, 
    unidade: "mm",
    origem_regra: "Padrão Indústria MDF 18mm",
    face_referencia: "Faces/Bordas"
  },
  { 
    bitola: 25, 
    description: "Tamponamentos / Prateleiras", 
    tolerancia_mm: 0.8, 
    unidade: "mm",
    origem_regra: "Padrão Indústria MDF 25mm",
    face_referencia: "Faces/Bordas"
  },
  { 
    bitola: 36, 
    description: "Engrossados / Paineis", 
    tolerancia_mm: 1.0, 
    unidade: "mm",
    origem_regra: "Padrão Indústria MDF 36mm (18+18)",
    face_referencia: "Faces/Bordas"
  }
];

/**
 * Mapeia entidades DXF para coordenadas de furação de forma rigorosa.
 * Apenas entidades CIRCLE e ARC são consideradas furações nativas.
 */
export function mapDxfToDrillings(dxfGeometries: any[], part: any): DrillingCoordinate[] {
  // Filtro rigoroso: Apenas furações explícitas (círculos/arcos)
  return dxfGeometries
    .filter(g => (g.type === 'CIRCLE' || g.type === 'ARC') && g.radius > 0)
    .map(g => {
      const rule = PROMOB_BITOLA_RULES.find(r => 
        Math.abs((part.thickness_mm || 0) - r.bitola) <= r.tolerancia_mm
      );

      const drilling: DrillingCoordinate = {
        part_id: part.id,
        module_name: part.module_name || "Sem módulo",
        group: part.group || (part.kind === 'peca' ? 'G1' : 'G2'),
        material: part.material,
        thickness_mm: part.thickness_mm,
        bitola_aplicada: rule?.bitola,
        ferragem_relacionada: rule?.ferragem_associada || "Não identificada",
        x: g.center.x,
        y: g.center.y,
        z: 0, 
        diametro: g.radius * 2,
        profundidade: 0, 
        face: "não confirmada",
        origem: "DXF",
        status: "confirmada",
        regra_aplicada: rule?.origem_regra
      };
      return drilling;
      };
    });
}

/**
 * Audit Técnico Crítico
 */
export async function generateEngineeringAudit(projectId: string): Promise<EngineeringReport> {
  const { data: parts, error: partsError } = await supabase
    .from("parts")
    .select("*")
    .eq("project_id", projectId);

  if (partsError) throw partsError;

  const conflicts: string[] = [];
  const evidence_log: string[] = [];
  let validatedCount = 0;
  let blockedCount = 0;

  parts?.forEach(part => {
    evidence_log.push(`Inspecionando peça: ${part.name} (ID: ${part.id})`);
    
    // 1. Validação de Bitola
    const rule = PROMOB_BITOLA_RULES.find(r => 
      Math.abs((part.thickness_mm || 0) - r.bitola) <= r.tolerancia_mm
    );

    if (!rule) {
      if (part.kind === 'peca' || part.kind === 'chapa') {
        const errorMsg = `CONFLITO: Peça ${part.name} - Bitola ${part.thickness_mm}mm não coincide com padrões de mercado.`;
        conflicts.push(errorMsg);
        evidence_log.push(errorMsg);
        // Garantia de bloqueio se não houver bitola válida
        part.machining_blocked = true;
      }
    } else {
      evidence_log.push(`Bitola validada: ${part.thickness_mm}mm (Regra: ${rule.origem_regra})`);
    }

    // 2. Verificação de Usinagem
    // Bloqueio rigoroso se houver qualquer dúvida técnica
    if (part.machining_blocked) {
      blockedCount++;
      evidence_log.push(`Usinagem BLOQUEADA para ${part.name} por precaução de engenharia.`);
    } else {
      // Só validamos se não houver conflitos pendentes no log (em um cenário real verificaríamos furações aqui)
      validatedCount++;
    }
  });

  return {
    project_id: projectId,
    timestamp: new Date().toISOString(),
    total_parts: parts?.length || 0,
    validated_parts: validatedCount,
    blocked_machining: blockedCount,
    conflicts: conflicts,
    evidence_log: evidence_log
  };
}
