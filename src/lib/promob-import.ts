import { z } from 'zod';

export const PartMetadataSchema = z.object({
  unique_id: z.string().optional(),
  unique_parent_id: z.string().optional(),
  repetition: z.number().default(1),
  text_dimension: z.string().optional(),
  unit: z.string().default('un'),
  family: z.string().optional(),
  group: z.string().optional(),
  reference: z.string().optional(),
  materials: z.array(z.string()).optional(),
  id_xml: z.string().optional(),
});

export type PartMetadata = z.infer<typeof PartMetadataSchema>;

export interface PromobPart {
  name: string;
  kind: 'peca' | 'item' | 'ferragem';
  material?: string;
  thickness_mm?: number;
  width_mm?: number;
  length_mm?: number;
  quantity: number;
  unit: string;
  edge_banding?: string;
  metadata?: PartMetadata;
}

export interface PromobModule {
  name: string;
  environment?: string;
  width_mm?: number;
  height_mm?: number;
  depth_mm?: number;
  quantity: number;
  id_xml?: string;
  parts: PromobPart[];
}

export interface PromobProject {
  name: string;
  client_name?: string;
  environment?: string;
  notes?: string;
  modules: PromobModule[];
  loose_parts: PromobPart[];
}

function getAttr(node: Element, name: string): string | undefined {
  return node.getAttribute(name) || undefined;
}

function getNumericAttr(node: Element, name: string): number | undefined {
  const val = node.getAttribute(name);
  if (!val) return undefined;
  const num = parseFloat(val.replace(',', '.'));
  return isNaN(num) ? undefined : num;
}

function parsePartNode(node: Element): PromobPart {
  const name = getAttr(node, 'DESCRIPTION') || getAttr(node, 'NAME') || 'Peça Sem Nome';
  
  // Metadados Industriais Rigorosos (Pasta do Cliente 4.0)
  const metadata: PartMetadata = {
    unique_id: getAttr(node, 'UNIQUEID'),
    unique_parent_id: getAttr(node, 'UNIQUEPARENTID'),
    repetition: getNumericAttr(node, 'REPETITION') || 1,
    text_dimension: getAttr(node, 'TEXTDIMENSION'),
    unit: getAttr(node, 'UNIT') || 'un',
    family: getAttr(node, 'FAMILY'),
    group: getAttr(node, 'GROUP'),
    reference: getAttr(node, 'REFERENCE'),
    id_xml: getAttr(node, 'ID'),
  };

  const quantity = getNumericAttr(node, 'QUANTITY') || 1;
  const totalQuantity = quantity * metadata.repetition;

  return {
    name,
    kind: (getAttr(node, 'FAMILY') === 'FERRAGEM' ? 'ferragem' : 'peca') as any,
    material: getAttr(node, 'MATERIAL') || getAttr(node, 'COLOR'),
    thickness_mm: getNumericAttr(node, 'HEIGHT') || getNumericAttr(node, 'THICKNESS'),
    width_mm: getNumericAttr(node, 'WIDTH'),
    length_mm: getNumericAttr(node, 'DEPTH') || getNumericAttr(node, 'LENGTH'),
    quantity: totalQuantity,
    unit: metadata.unit,
    edge_banding: getAttr(node, 'EDGE_BANDING'),
    metadata
  };
}

export function parsePromobXML(xmlContent: string): PromobProject {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const projectNode = xmlDoc.querySelector('PROJECT, PROMOB');
  const projectName = projectNode?.getAttribute('NAME') || 'Projeto Importado';
  
  const modules: PromobModule[] = [];
  const looseParts: PromobPart[] = [];

  // Mapeamento de Ambientes/Módulos
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
        environment: getAttr(node, 'ENVIRONMENT'),
        width_mm: getNumericAttr(node, 'WIDTH'),
        height_mm: getNumericAttr(node, 'HEIGHT'),
        depth_mm: getNumericAttr(node, 'DEPTH'),
        quantity: getNumericAttr(node, 'QUANTITY') || 1,
        id_xml: getAttr(node, 'ID'),
        parts
      });
    } else {
      looseParts.push(parsePartNode(node));
    }
  });

  return {
    name: projectName,
    client_name: projectNode?.getAttribute('CLIENT') || undefined,
    environment: projectNode?.getAttribute('ENVIRONMENT') || undefined,
    modules,
    loose_parts: looseParts
  };
}
