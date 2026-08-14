import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import DxfParser from 'dxf-parser';

async function runAnalysis() {
  console.log("=== INICIANDO ANÁLISE TÉCNICA (MONTA AI) ===");

  // 1. Analisar XML
  const xmlContent = fs.readFileSync('/tmp/user-uploads/amanda_111.xml', 'utf-8');
  const parser = new XMLParser({ 
    ignoreAttributes: false, 
    attributeNamePrefix: "",
    allowBooleanAttributes: true
  });
  const xmlData = parser.parse(xmlContent);
  
  // O XML fornecido tem <LISTING> e dentro pode ter <AMBIENTS> ou direto <ITEM>
  // Vamos inspecionar as chaves de LISTING
  const listing = xmlData.LISTING;
  console.log("Estrutura do XML (Raiz):", Object.keys(listing).filter(k => k !== 'PROJECTGUID' && k !== 'ABOUTPROMOB'));

  // A busca por ITEM precisa ser recursiva ou específica
  function findItems(obj: any): any[] {
    let results: any[] = [];
    if (!obj) return results;
    
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

  const allItems = findItems(listing);
  console.log(`\n1. XML - Total de Itens Identificados: ${allItems.length}`);
  
  // 2. Analisar DXF
  const dxfContent = fs.readFileSync('/tmp/user-uploads/amanda_11.dxf', 'utf-8');
  const dxfParser = new DxfParser();
  try {
    const dxf = dxfParser.parseSync(dxfContent);
    const entities = dxf.entities || [];
    console.log(`\n2. DXF - Entidades Totais: ${entities.length}`);
    
    const stats: Record<string, number> = {};
    const layers = new Set<string>();
    entities.forEach((e: any) => {
      stats[e.type] = (stats[e.type] || 0) + 1;
      layers.add(e.layer);
    });
    
    console.log("Tipos de Entidades no DXF:", stats);
    console.log("Layers no DXF:", Array.from(layers));

    // 3. Validação de Amostra XML
    console.log("\n3. Amostra de Itens XML:");
    allItems.slice(0, 10).forEach((item: any, idx: number) => {
      const desc = item.DESCRIPTION || item.REFERENCE || "Sem descrição";
      const w = item.WIDTH || item.L || "?";
      const h = item.HEIGHT || item.A || "?";
      const d = item.DEPTH || item.P || "?";
      console.log(`[${idx+1}] ${desc} | ${w}x${h}x${d} | Qtd: ${item.QUANTITY || 1}`);
    });

    // 4. Correspondência e Furações (DXF)
    const circles = entities.filter((e: any) => e.type === 'CIRCLE');
    console.log(`\n4. Furações Detectadas no DXF (Círculos): ${circles.length}`);
    if (circles.length > 0) {
      console.log("Amostra de Furações (DXF):");
      circles.slice(0, 5).forEach((c: any, idx: number) => {
        console.log(`Furo ${idx+1}: Centro (${c.center.x.toFixed(2)}, ${c.center.y.toFixed(2)}) | Raio: ${c.radius.toFixed(2)} | Layer: ${c.layer}`);
      });
    }

    // 5. Relatório Final
    console.log("\n5. RELATÓRIO TÉCNICO DE CONFERÊNCIA:");
    console.log("- Módulos e Peças: Identificados no XML com dimensões nominais.");
    console.log("- DXF: Contém geometria detalhada e furações (Círculos).");
    console.log("- PDF: AUSENTE. Bloqueio de confirmação de cotas críticas ativado.");
    console.log("- Status: NÃO CONFIRMADO - PDF NÃO FORNECIDO para furações de montagem externa.");
    
  } catch (e) {
    console.error("Erro no DXF:", e);
  }

  console.log("\n=== FIM DA ANÁLISE TÉCNICA ===");
}

runAnalysis().catch(console.error);
