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
  const referencesNode = item.querySelector('REFERENCES');
  if (!referencesNode) return null;
  const refNode = referencesNode.querySelector(`[${key}]`);
  if (refNode) return refNode.getAttribute(key);
  // Promob sometimes uses children nodes instead of attributes for references
  const childNode = Array.from(referencesNode.children).find(c => c.tagName === key);
  return childNode ? childNode.getAttribute('REFERENCE') || childNode.textContent : null;
}

function parsePartNode(node: Element, moduleSequence: number, pieceSequence: number): PromobPart {
  const name = getAttr(node, 'DESCRIPTION') || getAttr(node, 'NAME') || 'Peça Sem Nome';
  const reference = getAttr(node, 'REFERENCE') || '';
  
  // Rule 4: Plano B - Desmontar Referência
  const desmontarReferencia = (ref: string) => {
    const segments = ref.split('.');
    const validThicknesses = [3, 4, 6, 9, 12, 15, 18, 20, 25, 30];
    let material: string | null = null;
    let thickness: number | null = null;
    let color: string | null = null;
    let materialIdx = -1;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].toUpperCase();
      if (seg.includes('MDF') || seg.includes('MDP')) {
        material = seg.includes('MDF') ? 'MDF' : 'MDP';
        materialIdx = i;
      }
      const num = parseInt(segments[i]);
      if (!isNaN(num) && validThicknesses.includes(num)) {
        thickness = num;
      }
    }
    
    if (materialIdx > 0) {
      color = segments[materialIdx - 1];
    }

    return { material, thickness, color };
  };

  const planoB = desmontarReferencia(reference);

  // Regra 3: Campos e Origens Corretas
  const material = refOf(node, 'MATERIAL') || planoB.material;
  const thickness_mm = parseFloat(refOf(node, 'THICKNESS') || '0') || planoB.thickness || null;
  const color = refOf(node, 'MODEL') || refOf(node, 'MODEL_DESCRIPTION') || planoB.color;
  const supplier = refOf(node, 'SUPPLIER') || refOf(node, 'SUPPLIER_EXT');
  
  const edgeTop = parseInt(refOf(node, 'FITA_BORDA_1') || '0');
  const edgeBottom = parseInt(refOf(node, 'FITA_BORDA_2') || '0');
  const edgeLeft = parseInt(refOf(node, 'FITA_BORDA_3') || '0');
  const edgeRight = parseInt(refOf(node, 'FITA_BORDA_4') || '0');
  
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

  if (!refOf(node, 'MATERIAL') && !refOf(node, 'THICKNESS')) {
    (metadata as any).origem = "referencia_desmontada";
  }

  // Regra 2: Classificação
  let kind: 'peca' | 'item' | 'ferragem' | 'acessorio' = 'item';
  const isMdf = (material?.includes('MDF') || material?.includes('MDP')) && thickness_mm !== null;
  if (isMdf) kind = 'peca';
  else if (metadata.family?.toUpperCase() === 'FERRAGEM') kind = 'ferragem';
  else if (metadata.family?.toUpperCase() === 'ACESSORIO') kind = 'acessorio';

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
  
  const projectNode = xmlDoc.querySelector('PROJECT, PROMOB');
  const projectName = projectNode?.getAttribute('NAME') || 'Projeto Importado';
  
  const modules: PromobModule[] = [];
  const looseParts: PromobPart[] = [];

  const moduleNodes = xmlDoc.querySelectorAll('ITEMS > ITEM[TYPE="COMPONENT"], ENVIRONMENT > ITEM');
  
  moduleNodes.forEach(node => {
    const isModule = node.children.length > 0;
    
    if (isModule) {
      const parts: PromobPart[] = [];
      const partNodes = node.querySelectorAll('ITEM[TYPE="PART"], ITEM[FAMILY="PECA"], ITEM[FAMILY="FERRAGEM"]');
      
      partNodes.forEach(partNode => {
        parts.push(parsePartNode(partNode));
      });

      modules.push({
        name: getAttr(node, 'DESCRIPTION') || getAttr(node, 'NAME') || 'Módulo',
        environment: getAttr(node, 'ENVIRONMENT') || null,
        width_mm: getNumericAttr(node, 'WIDTH') || null,
        height_mm: getNumericAttr(node, 'HEIGHT') || null,
        depth_mm: getNumericAttr(node, 'DEPTH') || null,
        quantity: getNumericAttr(node, 'QUANTITY') || 1,
        id_xml: getAttr(node, 'ID') || null,
        parts,
        metadata: {
          unique_id: getAttr(node, 'UNIQUEID'),
          id_xml: getAttr(node, 'ID'),
          reference: getAttr(node, 'REFERENCE')
        }
      });
    } else {
      looseParts.push(parsePartNode(node));
    }
  });

  return {
    name: projectName,
    client_name: projectNode?.getAttribute('CLIENT') || null,
    environment: projectNode?.getAttribute('ENVIRONMENT') || null,
    modules,
    loose_parts: looseParts
  };
}
