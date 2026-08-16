export type ParsedPart = {
  id_xml?: string | null;
  kind: "peca" | "chapa" | "ferragem" | "acessorio";
  name: string;
  material?: string | null;
  thickness_mm?: number | null;
  width_mm?: number | null;
  length_mm?: number | null;
  quantity: number;
  unit?: string | null;
  edge_banding?: string | null;
  data_source?: string;
  visibility_type?: "visivel" | "oculta" | "avulsa" | "ausente" | "nao_confirmada";
  cutting_edge_released?: boolean;
  machining_blocked?: boolean;
  metadata?: Record<string, any>;
};

export type ParsedModule = {
  id_xml?: string | null;
  name: string;
  environment?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  depth_mm?: number | null;
  quantity: number;
  parts: ParsedPart[];
  data_source?: string;
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
  if (value === null || value === undefined || value.trim() === "") return null;
  // Converte "1080,6" para "1080.6", remove caracteres não numéricos exceto ponto, sinal e decimais
  const sanitized = String(value).replace(",", ".").trim();
  const parsed = parseFloat(sanitized);
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

  const modules: ParsedModule[] = [];
  const looseParts: ParsedPart[] = [];
  const seen = new Set<Element>();

  // 1. Encontrar todos os ITEM na árvore
  const allItemNodes = Array.from(doc.querySelectorAll("ITEM, Item, item"));

  // 2. Identificar Módulos (itens que têm filhos ou são estruturais)
  // No Promob real, UNIQUEPARENTID="-2" ou "0" costuma indicar raiz.
  for (const node of allItemNodes) {
    if (seen.has(node)) continue;

    const parentId = attr(node, ["UNIQUEPARENTID"]);
    const hasChildren = node.querySelector("ITEMS > ITEM, COMPONENTS > ITEM, COMPONENT, PART");
    
    // Se for um item da raiz (-2) e tiver filhos, tratamos como Módulo
    if (parentId === "-2" && hasChildren) {
      const name = attr(node, ["DESCRIPTION", "name", "REFERENCE"]) ?? "Módulo";
      const idXml = attr(node, ["UNIQUEID", "ID"]);
      const width = num(attr(node, ["WIDTH", "L"]));
      const height = num(attr(node, ["HEIGHT", "A"]));
      const depth = num(attr(node, ["DEPTH", "P"]));
      const quantity = num(attr(node, ["QUANTITY", "qtd"])) ?? 1;
      const environment = attr(node, ["ENVIRONMENT", "ambiente", "GROUP"]);

      // Buscar peças dentro deste módulo
      const childNodes = Array.from(node.querySelectorAll("ITEM, COMPONENT, PART, PIECE"));
      const parts: ParsedPart[] = [];

      for (const child of childNodes) {
        if (child === node || seen.has(child)) continue;
        
        // Só adiciona se for folha (não tem ITEM dentro de si na tag ITEMS ou COMPONENTS) ou se for explicitamente um componente/peça
        const isLeaf = !child.querySelector("ITEMS > ITEM, COMPONENTS > ITEM");
        if (isLeaf || child.tagName.toUpperCase() === "COMPONENT" || child.tagName.toUpperCase() === "PART") {
          parts.push(parsePartNode(child));
          seen.add(child);
        }
      }

      modules.push({ id_xml: idXml ?? null, name, environment, width_mm: width, height_mm: height, depth_mm: depth, quantity, parts, data_source: "XML" });
      seen.add(node);
    }
  }

  // 3. Capturar itens que sobraram na raiz (Acessórios Avulsos / Itens sem módulo)
  for (const node of allItemNodes) {
    if (seen.has(node)) continue;
    const parentId = attr(node, ["UNIQUEPARENTID"]);
    
    // Itens na raiz que não foram processados como módulos
    if (parentId === "-2") {
      looseParts.push(parsePartNode(node));
      seen.add(node);
    }
  }

  if (modules.length === 0 && looseParts.length === 0) {
    warnings.push("Nenhum item ou módulo reconhecido. Verifique se o XML é uma exportação válida do Promob.");
  }

  const missingDims = modules.filter((m) => !m.width_mm && !m.height_mm && !m.depth_mm).length;
  // Não avisamos se for 0, mas se tiver algum valor parcial e faltar outro, pode ser útil
  
  return { fileName, fileType: "xml", sizeBytes, modules, looseParts, warnings };
}

function parsePartNode(p: Element): ParsedPart {
  const rawType = attr(p, ["FAMILY", "GROUP", "TYPE", "CATEGORY"]) ?? "";
  const description = attr(p, ["DESCRIPTION", "name", "REFERENCE"]) ?? "Item";
  
  // Tenta pegar a medida do TEXTDIMENSION se os atributos individuais falharem ou para validar
  let width = num(attr(p, ["WIDTH", "L"]));
  let length = num(attr(p, ["LENGTH", "HEIGHT", "C"]));
  const thickness = num(attr(p, ["THICKNESS", "E"]));

  const idXml = attr(p, ["UNIQUEID", "ID"]);
  const isVisible = attr(p, ["VISIBLE"])?.toLowerCase() !== "false";
  const visibility: ParsedPart["visibility_type"] = isVisible ? "visivel" : "oculta";

  return {
    id_xml: idXml ?? null,
    kind: classifyKind(rawType, description),
    name: description,
    material: attr(p, ["MATERIAL", "COLOR", "REFERENCE"]),
    thickness_mm: thickness,
    width_mm: width,
    length_mm: length,
    quantity: num(attr(p, ["QUANTITY", "qtd"])) ?? 1,
    unit: attr(p, ["UNIT"])?.toLowerCase() ?? "un",
    edge_banding: attr(p, ["EDGE", "BORDER", "BORDA"]),
    data_source: "XML",
    visibility_type: visibility,
    cutting_edge_released: false,
    machining_blocked: true,
    metadata: {
      raw_group: rawType,
      environment: attr(p, ["ENVIRONMENT", "ambiente", "GROUP"]),
      edge_1: attr(p, ["EDGE1", "BORDA1"]),
      edge_2: attr(p, ["EDGE2", "BORDA2"]),
      edge_3: attr(p, ["EDGE3", "BORDA3"]),
      edge_4: attr(p, ["EDGE4", "BORDA4"]),
      drill_xml: attr(p, ["DRILL", "FUROS", "HOLES"]),
      tag_industrial: attr(p, ["TAG", "ETIQUETA", "BARCODE"]),
      material_id: attr(p, ["MATERIAL_ID"]),
      color_id: attr(p, ["COLOR_ID"]),
      finish_id: attr(p, ["FINISH_ID"]),
    }
  };
}

function classifyKind(rawGroup: string, name: string): ParsedPart["kind"] {
  const g = rawGroup.toLowerCase();
  const n = name.toLowerCase();
  
  // Peças Estruturais
  if (n.includes("lateral") || n.includes("base") || n.includes("fundo") || n.includes("divisória") || n.includes("prateleira") || n.includes("tampo") || n.includes("travessa")) return "peca";
  
  // Portas e Frentes
  if (n.includes("porta") || n.includes("frente")) return "peca";

  // Ferragens
  if (g.includes("ferrag") || n.includes("dobradiça") || n.includes("corrediça") || n.includes("parafuso") || n.includes("suporte") || n.includes("fixador")) return "ferragem";
  
  // Acessórios
  if (g.includes("acess") || n.includes("cabideiro") || n.includes("aramado") || n.includes("organizador") || n.includes("puxador")) return "acessorio";
  
  // Chapas / Painéis
  if (g.includes("chapa") || g.includes("painel") || n.includes("tamponamento") || n.includes("régua")) return "chapa";
  
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
