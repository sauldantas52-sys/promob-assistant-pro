import { describe, expect, it } from "vitest";
import { parseDXF } from "./dxf-parser";

const dxf = `0
SECTION
2
ENTITIES
0
LINE
8
CORTE
10
0
20
0
11
100
21
0
0
LWPOLYLINE
8
CONTORNO
90
4
70
1
10
0
20
0
10
100
20
0
10
100
20
50
10
0
20
50
0
ENDSEC
0
EOF`;

describe("parseDXF", () => {
  it("preserva linhas e polilinhas para conferência geométrica", () => {
    const geometry = parseDXF(dxf);

    expect(geometry.some((entity) => entity.type === "LINE")).toBe(true);
    expect(geometry.some((entity) => entity.type === "LWPOLYLINE")).toBe(true);
    expect(geometry.find((entity) => entity.type === "LWPOLYLINE")?.vertices).toHaveLength(4);
  });
});
