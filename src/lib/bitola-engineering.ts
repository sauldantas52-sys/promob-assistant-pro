import { supabase } from "@/integrations/supabase/client";

export interface BitolaRule {
  bitola: number;
  description: string;
  tolerancia_mm: number;
  unidade: string;
}

export interface DrillingCoordinate {
  part_id: string;
  x: number;
  y: number;
  z: number;
  diametro: number;
  profundidade: number;
  face: string;
  origem: "XML" | "DXF" | "PDF" | "INFERIDO";
  status: "confirmada" | "inferida" | "ausente" | "conflitante";
}

export interface EngineeringReport {
  project_id: string;
  timestamp: string;
  total_parts: number;
  validated_parts: number;
  blocked_machining: number;
  conflicts: string[];
  bitola_summary: Record<string, any>;
}

/**
 * Regras originais de bitola extraídas das referências Promob
 */
export const PROMOB_BITOLA_RULES: BitolaRule[] = [
  { bitola: 6, description: "Fundo / Painel Fino", tolerancia_mm: 0.3, unidade: "mm" },
  { bitola: 15, description: "Estrutura Padrão / Portas", tolerancia_mm: 0.5, unidade: "mm" },
  { bitola: 18, description: "Estrutura Reforçada / Portas", tolerancia_mm: 0.5, unidade: "mm" },
  { bitola: 25, description: "Tamponamentos / Prateleiras", tolerancia_mm: 0.8, unidade: "mm" },
  { bitola: 36, description: "Engrossados / Paineis", tolerancia_mm: 1.0, unidade: "mm" }
];

export async function generateEngineeringAudit(projectId: string): Promise<EngineeringReport> {
  const { data: parts, error: partsError } = await supabase
    .from("parts")
    .select("*")
    .eq("project_id", projectId);

  if (partsError) throw partsError;

  const conflicts: string[] = [];
  let validatedCount = 0;
  let blockedCount = 0;

  const report: EngineeringReport = {
    project_id: projectId,
    timestamp: new Date().toISOString(),
    total_parts: parts?.length || 0,
    validated_parts: 0,
    blocked_machining: 0,
    conflicts: [],
    bitola_summary: {}
  };

  parts?.forEach(part => {
    // 1. Validação de Bitola
    const rule = PROMOB_BITOLA_RULES.find(r => 
      Math.abs((part.thickness_mm || 0) - r.bitola) <= r.tolerancia_mm
    );

    if (!rule && part.kind === 'peca') {
      conflicts.push(`Peça ${part.name}: Bitola ${part.thickness_mm}mm não coincide com padrões Promob.`);
    }

    // 2. Verificação de Usinagem
    if (part.machining_blocked) {
      blockedCount++;
    } else {
      validatedCount++;
    }
  });

  report.validated_parts = validatedCount;
  report.blocked_machining = blockedCount;
  report.conflicts = conflicts;

  return report;
}
