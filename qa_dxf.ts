import { parseDXF } from './src/lib/dxf-parser.js';
import fs from 'fs';

// Mock de um arquivo DXF ASCII simplificado
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
    console.log('Circle found at:', geometry.find(g => g.type === 'CIRCLE')?.center);
} catch (err) {
    console.error('DXF Test Failed:', err);
    process.exit(1);
}
