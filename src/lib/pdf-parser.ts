import * as pdfjsLib from 'pdfjs-dist';

// Configuração básica do worker do PDF.js (em ambiente browser)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface CriticalDimension {
  label: string;
  value: number;
  unit: string;
  confidence: number;
  page: number;
}

export async function parseExecutivePDF(file: File): Promise<CriticalDimension[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const dimensions: CriticalDimension[] = [];

  // Regex para capturar padrões comuns de cotas em desenhos técnicos (ex: 1200mm, 500,5 mm, etc)
  const dimensionRegex = /(\d+[,.]?\d*)\s*(mm|cm|m)/gi;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item: any) => item.str);
    const fullText = strings.join(' ');

    let match;
    while ((match = dimensionRegex.exec(fullText)) !== null) {
      const valueStr = match[1]?.replace(',', '.') || '0';
      const value = parseFloat(valueStr);
      const unit = (match[2] || 'mm').toLowerCase();

      if (!isNaN(value)) {
        dimensions.push({
          label: `Cota detectada na pág ${i}`,
          value,
          unit,
          confidence: 0.7, // Confiança baseada em heurística de texto
          page: i
        });
      }
    }
  }

  return dimensions;
}
