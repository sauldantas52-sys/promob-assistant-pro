import DxfParser, {
  type ICircleEntity,
  type IEntity,
  type ILineEntity,
  type ILwpolylineEntity,
  type IMtextEntity,
  type IPoint,
  type IPolylineEntity,
} from "dxf-parser";

interface PositionedTextEntity extends IEntity {
  text: string;
  position: IPoint;
}

export interface DXFGeometry {
  type: string;
  layer: string;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  center?: { x: number; y: number };
  vertices?: { x: number; y: number }[];
  radius?: number;
  text?: string;
}

export function parseDXF(content: string): DXFGeometry[] {
  const parser = new DxfParser();
  try {
    const dxf = parser.parseSync(content);
    const geometries: DXFGeometry[] = [];

    if (!dxf || !dxf.entities) return [];

    dxf.entities.forEach((entity) => {
      const base = {
        type: entity.type,
        layer: entity.layer,
      };

      if (entity.type === "LINE") {
        const line = entity as ILineEntity;
        geometries.push({
          ...base,
          start: { x: line.vertices[0]!.x, y: line.vertices[0]!.y },
          end: { x: line.vertices[1]!.x, y: line.vertices[1]!.y },
        });
      } else if (entity.type === "CIRCLE" || entity.type === "ARC") {
        const circle = entity as ICircleEntity;
        // Entidades explícitas de furação
        geometries.push({
          ...base,
          center: { x: circle.center.x, y: circle.center.y },
          radius: circle.radius,
        });
      } else if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
        const polyline = entity as ILwpolylineEntity | IPolylineEntity;
        // AVISO: Polilinhas são contornos, não furações, a menos que processadas por algoritmos de fechamento.
        // O Monta AI não converte contornos em furações automaticamente para evitar falsos positivos.
        // Mantemos no array para visualização apenas.
        geometries.push({
          ...base,
          vertices: (polyline.vertices ?? []).map((vertex) => ({ x: vertex.x, y: vertex.y })),
        });
      } else if (entity.type === "MTEXT" || entity.type === "TEXT") {
        const textEntity = entity as IMtextEntity | PositionedTextEntity;
        geometries.push({
          ...base,
          text: textEntity.text,
          start: { x: textEntity.position.x, y: textEntity.position.y },
        });
      }
    });

    return geometries;
  } catch (err) {
    console.error("Erro ao processar DXF:", err);
    throw new Error("Falha na leitura do arquivo DXF ASCII - Formato não suportado ou corrompido.");
  }
}
