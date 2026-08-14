import { parseDXF } from './src/lib/dxf-parser';

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
LINE
  8
BORDA
 10
0.0
 20
0.0
 11
500.0
 21
0.0
  0
ENDSEC
  0
EOF
`;

try {
    const geometry = parseDXF(mockDxf);
    console.log('DXF Test Success:', geometry.length, 'entities found');
    const circle = geometry.find(g => g.type === 'CIRCLE');
    if (circle && circle.center) {
        console.log('Circle found at:', circle.center.x, ',', circle.center.y);
    } else {
        throw new Error('Circle not found or invalid');
    }
} catch (err) {
    console.error('DXF Test Failed:', err);
    process.exit(1);
}
