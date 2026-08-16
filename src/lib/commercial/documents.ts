export type ParsedCommercialDocument = {
  store: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  totalAmount: number | null;
};

export type DocumentTextResult = {
  text: string;
  confidence: number | null;
  method: "pdf_text" | "local_ocr";
};

function toIsoDate(value: string) {
  const match = value.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!match) return null;
  const [, day, month, rawYear] = match;
  if (!day || !month || !rawYear) return null;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function toAmount(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function parseCommercialDocument(text: string): ParsedCommercialDocument {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const storeMatch = joined.match(
    /(?:loja|fornecedor|emitente|raz[aã]o social)\s*[:-]?\s*([^\n]+)/i,
  );
  const numberMatch = joined.match(/(?:nota|n[úu]mero|n[º°o]|nf(?:-?e)?)\s*[:#-]?\s*([\w./-]+)/i);
  const dateMatch = joined.match(
    /(?:emiss[aã]o|data)\s*[:-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
  );
  const amountMatches = [
    ...joined.matchAll(/(?:total(?:\s+da\s+nota)?|valor\s+total)\s*[:R$\s]*([\d.]+,\d{2})/gi),
  ];
  const rawAmount = amountMatches.at(-1)?.[1] ?? null;

  return {
    store: storeMatch?.[1]?.trim() ?? lines[0] ?? null,
    documentNumber: numberMatch?.[1]?.trim() ?? null,
    documentDate: dateMatch?.[1] ? toIsoDate(dateMatch[1]) : null,
    totalAmount: rawAmount ? toAmount(rawAmount) : null,
  };
}

export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function extractDocumentText(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<DocumentTextResult> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    const pageCount = Math.min(document.numPages, 40);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      pages.push(`[Página ${pageNumber}]\n${text}`);
      onProgress?.(pageNumber / pageCount);
    }
    const text = pages.join("\n\n").trim();
    if (!text) {
      throw new Error(
        "O PDF não possui texto selecionável. Exporte as páginas como imagem para OCR.",
      );
    }
    return { text, confidence: null, method: "pdf_text" };
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Use PDF, PNG, JPG ou WEBP.");
  }
  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "por", {
    logger: (event) => {
      if (event.status === "recognizing text" && typeof event.progress === "number") {
        onProgress?.(event.progress);
      }
    },
  });
  const text = result.data.text.trim();
  if (!text) throw new Error("Nenhum texto foi reconhecido na imagem.");
  return {
    text,
    confidence: Math.max(0, Math.min(1, result.data.confidence / 100)),
    method: "local_ocr",
  };
}

export function safeStorageName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}
