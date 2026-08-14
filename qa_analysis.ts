import { parseDXF } from './src/lib/dxf-parser';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

async function runAnalysis() {
  console.log("=== INICIANDO ANÁLISE TÉCNICA (MONTA AI) ===");

  // 1. Ler XML
  const xmlContent = fs.readFileSync('/tmp/user-uploads/amanda_111.xml', 'utf-8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const xmlData = parser.parse(xmlContent);
  
  // A estrutura do XML do Promob pode variar. Vamos procurar por LISTING > ITEM
  const items = xmlData?.LISTING?.ITEM || [];
  const allItems = Array.isArray(items) ? items : [items];

  console.log(`\n1. XML - Itens Identificados: ${allItems.length}`);
  
  // 2. Analisar DXF
  const dxfContent = fs.readFileSync('/tmp/user-uploads/amanda_11.dxf', 'utf-8');
  const geometries = parseDXF(dxfContent);
  console.log(`\n2. DXF - Geometrias Detectadas: ${geometries.length}`);
  
  const layers = new Set(geometries.map(g => g.layer));
  console.log(`Layers no DXF: ${Array.from(layers).join(', ')}`);

  // 3. Validação de Medidas e Materiais (Amostra)
  console.log("\n3. Amostra de Medidas/Materiais (XML):");
  allItems.slice(0, 5).forEach((item: any, idx: number) => {
    console.log(`Item ${idx + 1}: ${item.DESCRIPTION} | Dimensões: ${item.WIDTH}x${item.HEIGHT}x${item.DEPTH} | Qtd: ${item.QUANTITY}`);
  });

  // 4. Correspondência e Furações
  console.log("\n4. Furações e Cotas Críticas:");
  const circles = geometries.filter(g => g.type === 'CIRCLE');
  console.log(`Círculos (possíveis furos) no DXF: ${circles.length}`);
  
  // 5. Relatório de Divergências
  console.log("\n5. Relatório de Divergências / Observações:");
  console.log("- PDF executivo ausente: Não é possível validar cotas de montagem finais.");
  console.log("- DXF contém muitas entidades de linha e texto. Necessário filtrar layers de usinagem.");
  
  console.log("\n=== FIM DA ANÁLISE TÉCNICA ===");
}

runAnalysis().catch(console.error);
