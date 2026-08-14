import { DxfParser } from 'dxf-parser';

export interface DXFGeometry {
  type: string;
  layer: string;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  center?: { x: number; y: number };
  radius?: number;
  text?: string;
}

export function parseDXF(content: string): DXFGeometry[] {
  const parser = new DxfParser();
  try {
    const dxf = parser.parseSync(content);
    const geometries: DXFGeometry[] = [];

    if (!dxf || !dxf.entities) return [];

    dxf.entities.forEach((entity: any) => {
      // Mapeamento básico de geometrias DXF para o Monta AI
      const base = {
        type: entity.type,
        layer: entity.layer,
      };

      if (entity.type === 'LINE') {
        geometries.push({
          ...base,
          start: { x: entity.vertices[0].x, y: entity.vertices[0].y },
          end: { x: entity.vertices[1].x, y: entity.vertices[1].y },
        });
      } else if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
        geometries.push({
          ...base,
          center: { x: entity.center.x, y: entity.center.y },
          radius: entity.radius,
        });
      } else if (entity.type === 'MTEXT' || entity.type === 'TEXT') {
        geometries.push({
          ...base,
          text: entity.text,
          start: { x: entity.position.x, y: entity.position.y },
        });
      }
    });

    return geometries;
  } catch (err) {
    console.error('Erro ao processar DXF:', err);
    throw new Error('Falha na leitura do arquivo DXF ASCII');
  }
}
