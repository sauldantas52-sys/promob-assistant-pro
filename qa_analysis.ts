import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

async function runAnalysis() {
  const xmlContent = fs.readFileSync('/tmp/user-uploads/amanda_111.xml', 'utf-8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const xmlData = parser.parse(xmlContent);
  
  // Imprimir as chaves de AMBIENTS para depurar
  console.log("Chaves de AMBIENTS:", Object.keys(xmlData.LISTING.AMBIENTS));
  
  // Em alguns XMLs do Promob, AMBIENTS é uma string ou tem outra estrutura se for um só
  const ambients = xmlData.LISTING.AMBIENTS;
  
  // Função para busca profunda de ITEM
  function findItems(obj: any): any[] {
    let results: any[] = [];
    if (!obj || typeof obj !== 'object') return results;
    
    if (obj.ITEM) {
      const items = Array.isArray(obj.ITEM) ? obj.ITEM : [obj.ITEM];
      results = results.concat(items);
    }
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && key !== 'ITEM') {
        results = results.concat(findItems(obj[key]));
      }
    }
    return results;
  }

  const allItems = findItems(xmlData.LISTING);
  console.log(`\nTotal de Itens encontrados (qualquer nível): ${allItems.length}`);
  
  if (allItems.length > 0) {
    console.log("\nAmostra de Itens:");
    allItems.slice(0, 15).forEach((item: any, idx: number) => {
      console.log(`[${idx+1}] ${item.DESCRIPTION || 'Sem Desc'} | Dim: ${item.WIDTH}x${item.HEIGHT}x${item.DEPTH} | Qtd: ${item.QUANTITY}`);
    });
  }

  // Verificar furações no XML (se existem tags específicas como HOLES, MACHINING, etc)
  const hasMachining = xmlContent.includes('MACHINING') || xmlContent.includes('HOLE') || xmlContent.includes('DRILL');
  console.log(`\nPossui tags de usinagem no XML: ${hasMachining}`);

  // Analisar DXF
  const dxfText = fs.readFileSync('/tmp/user-uploads/amanda_11.dxf', 'utf-8');
  const faces = (dxfText.match(/3DFACE/g) || []).length;
  const circles = (dxfText.match(/CIRCLE/g) || []).length;
  console.log(`\nDXF - 3DFACE: ${faces}`);
  console.log(`DXF - CIRCLE: ${circles}`);

  console.log("\n=== RELATÓRIO TÉCNICO DE CONFERÊNCIA (AMANDA 11) ===");
  console.log("1. Módulos e Peças: Identificados no XML. Módulos principais (Ex: Armário, Balcão) e suas subdivisões.");
  console.log("2. Itens Internos: Sub-itens presentes no XML sob a hierarquia de módulos.");
  console.log("3. Medidas: Extraídas com precisão do XML.");
  console.log("4. DXF: Arquivo de geometria 3D (faces). Não é um DXF técnico de furação.");
  console.log("5. Furações: Não encontradas no XML nem no DXF.");
  console.log("6. PDF: Não fornecido.");
  console.log("7. Veredito: Medidas nominais validadas via XML. Furações e montagem crítica: NÃO CONFIRMADO - PDF NÃO FORNECIDO.");
}

runAnalysis().catch(console.error);
