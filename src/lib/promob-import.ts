export type ParsedPart = {
  kind: "peca" | "chapa" | "ferragem" | "acessorio";
  name: string;
  material?: string | null;
  thickness_mm?: number | null;
  width_mm?: number | null;
  length_mm?: number | null;
  quantity: number;
  unit?: string | null;
  edge_banding?: string | null;
};

export type ParsedModule = {
  name: string;
  environment?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  depth_mm?: number | null;
  quantity: number;
  parts: ParsedPart[];
};

export type ImportResult = {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  modules: ParsedModule[];
  looseParts: ParsedPart[];
  warnings: string[];
};

const num = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const attr = (el: Element, names: string[]): string | null => {
  for (const name of names) {
    for (const a of Array.from(el.attributes)) {
      if (a.name.toLowerCase() === name.toLowerCase() && a.value.trim() !== "") return a.value;
    }
  }
  return null;
};

/** Lê XML exportado do Promob (estruturas variam por versão, por isso a busca é tolerante). */
export function parsePromobXml(fileName: string, sizeBytes: number, xmlText: string): ImportResult {
  const warnings: string[] = [];
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    return {
      fileName,
      fileType: "xml",
      sizeBytes,
      modules: [],
      looseParts: [],
      warnings: ["Não foi possível interpretar o XML: arquivo inválido ou corrompido."],
    };
  }

  const moduleNodes = Array.from(
    doc.querySelectorAll("ITEM[COMPONENTS], MODULE, Module, module, Item, ITEM"),
  );

  const modules: ParsedModule[] = [];
  const looseParts: ParsedPart[] = [];
  const seen = new Set<Element>();

  for (const node of moduleNodes) {
    if (seen.has(node)) continue;
    const name =
      attr(node, ["DESCRIPTION", "description", "name", "NAME", "REFERENCE"]) ?? "Módulo sem descrição";
    const width = num(attr(node, ["WIDTH", "width", "largura", "L"]));
    const height = num(attr(node, ["HEIGHT", "height", "altura", "A"]));
    const depth = num(attr(node, ["DEPTH", "depth", "profundidade", "P"]));
    const quantity = num(attr(node, ["QUANTITY", "quantity", "qtd", "QTD"])) ?? 1;
    const environment = attr(node, ["ENVIRONMENT", "environment", "ambiente", "GROUP"]);

    const partNodes = Array.from(node.querySelectorAll("PIECE, Piece, piece, PART, Part, COMPONENT"));
    const parts: ParsedPart[] = partNodes.map((p) => {
      partsMark(p, seen);
      return {
        kind: classifyKind(attr(p, ["TYPE", "type", "CATEGORY"]) ?? ""),
        name: attr(p, ["DESCRIPTION", "description", "name", "NAME", "REFERENCE"]) ?? "Peça",
        material: attr(p, ["MATERIAL", "material", "COLOR", "cor"]),
        thickness_mm: num(attr(p, ["THICKNESS", "thickness", "espessura", "E"])),
        width_mm: num(attr(p, ["WIDTH", "width", "largura", "L"])),
        length_mm: num(attr(p, ["LENGTH", "length", "comprimento", "HEIGHT", "C"])),
        quantity: num(attr(p, ["QUANTITY", "quantity", "qtd", "QTD"])) ?? 1,
        unit: "un",
        edge_banding: attr(p, ["EDGE", "edge", "fita", "BORDER"]),
      };
    });

    seen.add(node);
    if (parts.length === 0 && !width && !height && !depth) continue;
    modules.push({ name, environment, width_mm: width, height_mm: height, depth_mm: depth, quantity, parts });
  }

  if (modules.length === 0) {
    warnings.push(
      "Nenhum módulo reconhecido automaticamente. Confira se o arquivo é uma exportação de lista/XML do Promob.",
    );
  }
  const missingDims = modules.filter((m) => !m.width_mm || !m.height_mm || !m.depth_mm).length;
  if (missingDims > 0) warnings.push(`${missingDims} módulo(s) sem dimensões completas — confirmar no projeto.`);
  const missingMaterial = modules
    .flatMap((m) => m.parts)
    .filter((p) => !p.material).length;
  if (missingMaterial > 0) warnings.push(`${missingMaterial} peça(s) sem material/cor definidos.`);

  return { fileName, fileType: "xml", sizeBytes, modules, looseParts, warnings };
}

function partsMark(el: Element, seen: Set<Element>) {
  seen.add(el);
}

function classifyKind(raw: string): ParsedPart["kind"] {
  const value = raw.toLowerCase();
  if (value.includes("ferrag") || value.includes("hardware") || value.includes("accessor")) return "ferragem";
  if (value.includes("chapa") || value.includes("sheet")) return "chapa";
  if (value.includes("acess")) return "acessorio";
  return "peca";
}

export async function parseProjectFile(file: File): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xml")) {
    return parsePromobXml(file.name, file.size, await file.text());
  }
  const type = lower.split(".").pop() ?? "desconhecido";
  return {
    fileName: file.name,
    fileType: type,
    sizeBytes: file.size,
    modules: [],
    looseParts: [],
    warnings: [
      `Arquivos .${type} são registrados como anexo. A leitura automática de itens está disponível para exportações XML do Promob.`,
    ],
  };
}
