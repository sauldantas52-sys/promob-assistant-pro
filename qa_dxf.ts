import DxfParser from 'dxf-parser';

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
  const mockDxf = `
  0
SECTION
  2
ENTITIES
  0
CIRCLE
  8
FURACAO
 10
100.0
 20
200.0
 40
5.0
  0
ENDSEC
  0
EOF
`;

  try {
    const dxf = parser.parseSync(mockDxf);
    if (!dxf) throw new Error("Parse result is null");
    console.log('DXF Test Success:', dxf.entities.length, 'entities found');
    const circle = dxf.entities.find((e: any) => e.type === 'CIRCLE');
    if (circle) {
        console.log('Circle found at:', circle.center.x, ',', circle.center.y);
    } else {
        throw new Error('Circle not found in entities');
    }
  } catch (err) {
    console.error('DXF Test Failed:', err);
    process.exit(1);
  }
}

parseDXF("");
