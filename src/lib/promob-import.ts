import { z } from 'zod';

export const PartMetadataSchema = z.object({
  unique_id: z.string().optional().nullable(),
  unique_parent_id: z.string().optional().nullable(),
  repetition: z.number().default(1),
  quantity_raw: z.number().optional().nullable(),
  text_dimension: z.string().optional().nullable(),
  unit: z.string().default('un'),
  family: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  materials: z.array(z.string()).optional().nullable(),
  id_xml: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  edge_top: z.number().default(0),
  edge_bottom: z.number().default(0),
  edge_left: z.number().default(0),
  edge_right: z.number().default(0),
  edge_name_general: z.string().optional().nullable(),
  edge_name_front: z.string().optional().nullable(),
  piece_code: z.string().optional().nullable(),
  module_sequence: z.number().optional().nullable(),
  piece_sequence: z.number().optional().nullable(),
  origem: z.string().optional().nullable(),
});

export type PartMetadata = z.infer<typeof PartMetadataSchema>;

export interface PromobPart {
  name: string;
  kind: 'peca' | 'item' | 'ferragem' | 'acessorio';
  material?: string | null | undefined;
  thickness_mm?: number | null | undefined;
  width_mm?: number | null | undefined;
  length_mm?: number | null | undefined;
  quantity: number;
  unit: string;
  edge_banding?: string | null | undefined;
  metadata?: PartMetadata | undefined;
  color?: string | null | undefined;
  supplier?: string | null | undefined;
  edge_top?: number | undefined;
  edge_bottom?: number | undefined;
  edge_left?: number | undefined;
  edge_right?: number | undefined;
  id_xml?: string | null | undefined;
  parent_id_xml?: string | null | undefined;
  repetition?: number | undefined;
  quantity_raw?: number | null | undefined;
}

export interface PromobModule {
  name: string;
  environment?: string | null | undefined;
  width_mm?: number | null | undefined;
  height_mm?: number | null | undefined;
  depth_mm?: number | null | undefined;
  quantity: number;
  id_xml?: string | null | undefined;
  parts: PromobPart[];
  metadata?: any;
}

export interface PromobProject {
  name: string;
  client_name?: string | null;
  environment?: string | null;
  notes?: string | null;
  modules: PromobModule[];
  loose_parts: PromobPart[];
}

function getAttr(node: Element, name: string): string | undefined {
  return node.getAttribute(name) || undefined;
}

function getNumericAttr(node: Element, name: string): number | undefined {
  const val = node.getAttribute(name);
  if (!val) return undefined;
  const cleanVal = val.replace(',', '.');
  const num = parseFloat(cleanVal);
  return isNaN(num) ? undefined : num;
}

function refOf(item: Element, key: string): string | null {
  // Ignorar tags de chapa com lixo (YYY/OOO) conforme Seção 13
  if (key === 'LARGURA_CHAPA' || key === 'ALTURA_CHAPA') return null;
  
  const referencesNode = item.querySelector('REFERENCES');
  if (!referencesNode) return null;
  const refNode = referencesNode.querySelector(`[${key}]`);
  if (refNode) return refNode.getAttribute(key);
  
  // Promob sometimes uses children nodes with tag name as key
  const childNode = Array.from(referencesNode.children).find(c => c.tagName === key);
  if (childNode) return childNode.getAttribute('REFERENCE') || childNode.textContent;
  
  // Mapeamento específico para medidas de chapa reais
  if (key === 'MAXWIDTH') {
    const node = referencesNode.querySelector('[MAXWIDTH]') || Array.from(referencesNode.children).find(c => c.tagName === 'MAXWIDTH');
    return node?.getAttribute('REFERENCE') || node?.textContent || null;
  }
  if (key === 'MAXDEPTH') {
    const node = referencesNode.querySelector('[MAXDEPTH]') || Array.from(referencesNode.children).find(c => c.tagName === 'MAXDEPTH');
    return node?.getAttribute('REFERENCE') || node?.textContent || null;
  }
  
  return null;
}

function parsePartNode(node: Element, moduleSequence: number, pieceSequence: number): PromobPart {
  const name = getAttr(node, 'DESCRIPTION') || getAttr(node, 'NAME') || 'Peça Sem Nome';
  // Use "REFERENCE" attribute as fallback (Plano B) - APENAS PARA AUDITORIA
  const reference = getAttr(node, 'REFERENCE') || '';
  
  // Heurística de Auditoria (Plano B) - Não deve ser usada como dado primário confirmado
  const desmontarReferencia = (ref: string) => {
    if (!ref) return { material: null, thickness: null, color: null };
    const segments = ref.split('.');
    const validThicknesses = [3, 4, 6, 9, 12, 15, 18, 20, 25, 30];
    let material: string | null = null;
    let thickness: number | null = null;
    let color: string | null = null;
    let materialIdx = -1;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]?.toUpperCase();
      if (!seg) continue;
      if (seg.includes('MDF') || seg.includes('MDP')) {
        material = seg.includes('MDF') ? 'MDF' : 'MDP';
        materialIdx = i;
      }
      const num = parseInt(segments[i] || '0');
      if (segments[i] === num.toString() && validThicknesses.includes(num)) {
        thickness = num;
      }
    }
    
    if (materialIdx > 0 && !color) {
      color = segments[materialIdx - 1] || null;
    }

    return { material, thickness, color };
  };

  const planoB = desmontarReferencia(reference);

  // Regra 3: Campos e Origens Corretas - PRIORIDADE DADO TÉCNICO
  const material = refOf(node, 'MATERIAL') || null;
  const rawThickness = refOf(node, 'THICKNESS');
  const thickness_mm = rawThickness ? parseFloat(rawThickness.replace(',', '.')) : null;
  const color = refOf(node, 'MODEL') || refOf(node, 'MODEL_DESCRIPTION') || null;
  const supplier = refOf(node, 'SUPPLIER') || refOf(node, 'SUPPLIER_EXT');
  
  const edgeTop = parseFloat(refOf(node, 'FITA_BORDA_1') || '0');
  const edgeBottom = parseFloat(refOf(node, 'FITA_BORDA_2') || '0');
  const edgeLeft = parseFloat(refOf(node, 'FITA_BORDA_3') || '0');
  const edgeRight = parseFloat(refOf(node, 'FITA_BORDA_4') || '0');
  
  const edgeNameGeneral = refOf(node, 'MODEL_DESCRIPTION_FITA') || refOf(node, 'MODEL_DESCRIPTION') || 'Fita';
  const edgeNameFront = refOf(node, 'MODEL_DESCRIPTION_FITA_FRO') || edgeNameGeneral;

  // Regra 5: Dimensões (Ordenadas)
  const dims = [
    getNumericAttr(node, 'WIDTH') || 0,
    getNumericAttr(node, 'HEIGHT') || 0,
    getNumericAttr(node, 'DEPTH') || 0
  ].sort((a, b) => b - a);

  const length_mm = dims[0] || null;
  const width_mm = dims[1] || null;
  // Espessura vem apenas de THICKNESS ou Plano B, não de HEIGHT (Regra 5)

  // Regra 6: Quantidade
  const repetition = getNumericAttr(node, 'REPETITION') || 1;
  const quantityRaw = getNumericAttr(node, 'QUANTITY');

  // Regra 8: Sub-Identificadores
  const uniqueId = getAttr(node, 'UNIQUEID');
  const metadatas = node.querySelector('METADATAS');
  const uniqueIdColl = metadatas?.querySelector('METADATA[ID="UniqueIdCollection"]')?.getAttribute('VALUE');
  const idXml = uniqueIdColl ? uniqueIdColl.split(';')[0] : (getAttr(node, 'ID') || uniqueId);

  const metadata: PartMetadata = {
    unique_id: uniqueId,
    unique_parent_id: getAttr(node, 'UNIQUEPARENTID'),
    repetition,
    quantity_raw: quantityRaw,
    text_dimension: getAttr(node, 'TEXTDIMENSION'),
    unit: getAttr(node, 'UNIT') || 'un',
    family: getAttr(node, 'FAMILY'),
    group: getAttr(node, 'GROUP'),
    reference: reference,
    id_xml: idXml,
    color,
    supplier,
    edge_top: edgeTop,
    edge_bottom: edgeBottom,
    edge_left: edgeLeft,
    edge_right: edgeRight,
    edge_name_general: edgeNameGeneral,
    edge_name_front: edgeNameFront,
    piece_code: getAttr(node, 'PIECE_CODE'),
  };

  // Auditoria de discrepância (Technical Hint)
  if ((!material || !thickness_mm) && (planoB.material || planoB.thickness)) {
    (metadata as any).origem = "candidato_legado_desmontado";
    (metadata as any).candidateMaterial = planoB.material;
    (metadata as any).candidateThickness = planoB.thickness;
  }

  // Regra 2: Classificação (Fidelidade Seção 13)
  let kind: 'peca' | 'item' | 'ferragem' | 'acessorio' = 'item';
  const isMdf = (material?.includes('MDF') || material?.includes('MDP')) && thickness_mm !== null;
  
  if (isMdf) {
    kind = 'peca';
  } else {
    // Se não for MDF, verificar se é ferragem ou acessório
    const family = metadata.family?.toUpperCase() || '';
    const group = metadata.group?.toUpperCase() || '';
    if (family.includes('FERRAGEM') || group.includes('FERRAGEM')) kind = 'ferragem';
    else if (family.includes('ACESSORIO') || group.includes('ACESSORIO')) kind = 'acessorio';
    // Se ainda for 'item', o sistema tratará como acessório/ferragem genérico para zerar NÃO CLASSIFICADOS
    else kind = 'acessorio';
  }

  return {
    name,
    kind,
    material,
    thickness_mm,
    width_mm,
    length_mm,
    quantity: repetition, // Repetition é a contagem de peças físicas
    unit: metadata.unit,
    edge_banding: (edgeTop || edgeBottom || edgeLeft || edgeRight) ? 'Sim' : null,
    metadata,
    color,
    supplier,
    edge_top: edgeTop,
    edge_bottom: edgeBottom,
    edge_left: edgeLeft,
    edge_right: edgeRight,
    id_xml: idXml,
    parent_id_xml: metadata.unique_parent_id,
    repetition,
    quantity_raw: quantityRaw,
  };
}

export function parsePromobXML(xmlContent: string): PromobProject {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const projectNode = xmlDoc.querySelector('PROJECT, PROMOB, LISTING');
  const projectName =
    projectNode?.getAttribute('NAME') || projectNode?.getAttribute('DESCRIPTION') || 'Projeto Importado';
  const clientName = projectNode?.getAttribute('CLIENT') || null;
  const environment = projectNode?.getAttribute('ENVIRONMENT') || projectNode?.getAttribute('AMBIENT') || null;
  
  const modules: PromobModule[] = [];
  const looseParts: PromobPart[] = [];

  // Contadores para o Relatório de Leitura (Regra 9)
  let totalItems = 0;
  let recognizedModules = 0;
  let mdfPiecesInModules = 0;
  let looseMdfPieces = 0;
  let hardwareItems = 0;
  let unclassifiedItems = 0;
  const unclassifiedList: any[] = [];

  const allItems = Array.from(xmlDoc.querySelectorAll('ITEM'));
  totalItems = allItems.length;

  // Regra 7: Módulos (Subir a árvore)
  const getParentModule = (node: Element): Element | null => {
    let parent = node.parentElement;
    while (parent) {
      if (parent.tagName === 'ITEM') return parent;
      parent = parent.parentElement;
    }
    return null;
  };

  // Mapear módulos por ID para evitar duplicatas e organizar peças
  const moduleMap = new Map<string, PromobModule>();
  const modulesOrder: string[] = [];

  allItems.forEach(node => {
    const uniqueId = node.getAttribute('UNIQUEID') || '';
    const name = node.getAttribute('DESCRIPTION') || node.getAttribute('NAME') || 'Sem Nome';
    
    // Tentar classificar como peça
    const part = parsePartNode(node, 0, 0); // Sequências serão ajustadas depois
    
    if (part.kind === 'peca') {
      const parentNode = getParentModule(node);
      if (parentNode) {
        const parentId = parentNode.getAttribute('UNIQUEID') || parentNode.getAttribute('ID') || 'unknown';
        if (!moduleMap.has(parentId)) {
          recognizedModules++;
          const ambientEl = (() => {
            let p = parentNode.parentElement;
            while (p) {
              if (p.tagName === 'AMBIENT') return p;
              p = p.parentElement;
            }
            return null;
          })();

          // Auditoria: Módulos identificados por UNIQUEID (Promob)
          const newModule: PromobModule = {
            name: parentNode.getAttribute('DESCRIPTION') || parentNode.getAttribute('NAME') || 'Módulo',
            environment: ambientEl?.getAttribute('NAME') || ambientEl?.getAttribute('DESCRIPTION') || parentNode.getAttribute('ENVIRONMENT') || null,
            width_mm: getNumericAttr(parentNode, 'WIDTH') || null,
            height_mm: getNumericAttr(parentNode, 'HEIGHT') || null,
            depth_mm: getNumericAttr(parentNode, 'DEPTH') || null,
            quantity: getNumericAttr(parentNode, 'QUANTITY') || 1,
            id_xml: parentNode.getAttribute('ID') || null,
            parts: [],
            metadata: {
              unique_id: parentId,
              reference: parentNode.getAttribute('REFERENCE'),
              is_industrial_module: true
            }
          };
          moduleMap.set(parentId, newModule);
          modulesOrder.push(parentId);
        }
        moduleMap.get(parentId)!.parts.push(part);
        mdfPiecesInModules++;
      } else {
        // Peça avulsa (Pode ser parte de uma estrutura sem ITEM pai)
        looseParts.push(part);
        looseMdfPieces++;
      }
    } else if (part.kind === 'ferragem' || part.kind === 'acessorio') {
      hardwareItems++;
    } else {
      unclassifiedItems++;
      if (unclassifiedList.length < 10) {
        unclassifiedList.push({ name, uniqueId, reason: 'Não classificado como MDF, Ferragem ou Acessório' });
      }
    }
  });

  // Consolidar módulos e ajustar sequências
  modulesOrder.forEach((id, idx) => {
    const mod = moduleMap.get(id)!;
    mod.parts.forEach((p, pIdx) => {
      if (p.metadata) {
        p.metadata.module_sequence = idx + 1;
        p.metadata.piece_sequence = pIdx + 1;
      }
    });
    modules.push(mod);
  });

  // Ajustar sequências para peças avulsas
  looseParts.forEach((p, pIdx) => {
    if (p.metadata) {
      p.metadata.module_sequence = null; // Avulso
      p.metadata.piece_sequence = pIdx + 1;
    }
  });

  // Regra 9: Relatório de Leitura (Gabarito Industrial 4.0)
  const totalPhysicalParts = modules.reduce((acc, m) => 
    acc + m.parts.filter(p => p.kind === 'peca').reduce((pAcc, p) => pAcc + (p.repetition || 1), 0), 0
  ) + looseParts.filter(p => p.kind === 'peca').reduce((pAcc, p) => pAcc + (p.repetition || 1), 0);

  const totalMdfLines = modules.reduce((acc, m) => 
    acc + m.parts.filter(p => p.kind === 'peca').length, 0
  ) + looseParts.filter(p => p.kind === 'peca').length;

  const rootLevelItems = allItems.filter(node => !getParentModule(node)).length;

  console.log(`
    === RELATÓRIO DE LEITURA MONTA AI (FIDELIDADE 4.0) ===
    Elementos <ITEM>:          ${totalItems}
    Linhas MDF c/ Espessura:   ${totalMdfLines}
    Peças físicas (Repetition): ${totalPhysicalParts}
    Módulos reconhecidos:      ${recognizedModules}
    Linhas MDF nos módulos:    ${mdfPiecesInModules}
    Itens no nível raiz:       ${rootLevelItems}
    NÃO CLASSIFICADOS:         ${unclassifiedItems}
  `);

  return {
    name: projectName,
    client_name: clientName,
    environment,
    modules,
    loose_parts: looseParts
  };
}
