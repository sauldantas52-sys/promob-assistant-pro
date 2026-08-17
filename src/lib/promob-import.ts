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
  // Preserva a precisão original do XML
  const cleanVal = val.replace(',', '.');
  const num = parseFloat(cleanVal);
  return isNaN(num) ? undefined : num;
}

function parsePartNode(node: Element): PromobPart {
  const name = getAttr(node, 'DESCRIPTION') || getAttr(node, 'NAME') || 'Peça Sem Nome';
  const family = getAttr(node, 'FAMILY')?.toUpperCase();
  
  // Extração de Bordas
  const edgeTop = getNumericAttr(node, 'EDGE_TOP') || 0;
  const edgeBottom = getNumericAttr(node, 'EDGE_BOTTOM') || 0;
  const edgeLeft = getNumericAttr(node, 'EDGE_LEFT') || 0;
  const edgeRight = getNumericAttr(node, 'EDGE_RIGHT') || 0;

  const metadata: PartMetadata = {
    unique_id: getAttr(node, 'UNIQUEID'),
    unique_parent_id: getAttr(node, 'UNIQUEPARENTID'),
    repetition: getNumericAttr(node, 'REPETITION') || 1,
    quantity_raw: getNumericAttr(node, 'QUANTITY'),
    text_dimension: getAttr(node, 'TEXTDIMENSION'),
    unit: getAttr(node, 'UNIT') || 'un',
    family: family,
    group: getAttr(node, 'GROUP'),
    reference: getAttr(node, 'REFERENCE'),
    id_xml: getAttr(node, 'ID'),
    color: getAttr(node, 'COLOR') || getAttr(node, 'MODEL'),
    supplier: getAttr(node, 'SUPPLIER'),
    edge_top: edgeTop,
    edge_bottom: edgeBottom,
    edge_left: edgeLeft,
    edge_right: edgeRight,
    edge_name_general: getAttr(node, 'EDGE_NAME'),
    piece_code: getAttr(node, 'PIECE_CODE'),
  };

  const quantity = getNumericAttr(node, 'QUANTITY') || 1;
  
  let kind: 'peca' | 'item' | 'ferragem' | 'acessorio' = 'peca';
  if (family === 'FERRAGEM') kind = 'ferragem';
  else if (family === 'ACESSORIO') kind = 'acessorio';

  return {
    name,
    kind,
    material: getAttr(node, 'MATERIAL') || null,
    thickness_mm: getNumericAttr(node, 'HEIGHT') || getNumericAttr(node, 'THICKNESS') || null,
    width_mm: getNumericAttr(node, 'WIDTH') || null,
    length_mm: getNumericAttr(node, 'DEPTH') || null,
    quantity, 
    unit: metadata.unit,
    edge_banding: getAttr(node, 'EDGE_BANDING') || (edgeTop || edgeBottom || edgeLeft || edgeRight ? 'Sim' : null),
    metadata,
    color: metadata.color,
    supplier: metadata.supplier,
    edge_top: edgeTop,
    edge_bottom: edgeBottom,
    edge_left: edgeLeft,
    edge_right: edgeRight,
    id_xml: metadata.id_xml,
    parent_id_xml: metadata.unique_parent_id,
    repetition: metadata.repetition,
    quantity_raw: metadata.quantity_raw,
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
