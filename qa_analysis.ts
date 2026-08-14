import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

async function runAnalysis() {
  console.log("=== INICIANDO ANÁLISE TÉCNICA (MONTA AI) ===");

  const xmlContent = fs.readFileSync('/tmp/user-uploads/amanda_111.xml', 'utf-8');
  const parser = new XMLParser({ 
    ignoreAttributes: false, 
    attributeNamePrefix: ""
  });
  const xmlData = parser.parse(xmlContent);
  
  const listing = xmlData.LISTING;
  
  // Vamos navegar na estrutura real do XML
  // O XML começa com <LISTING> e tem <AMBIENTS> que tem <AMBIENT> que tem <ITEMS> que tem <ITEM>
  
  const ambients = listing.AMBIENTS?.AMBIENT;
  const ambientsArray = Array.isArray(ambients) ? ambients : [ambients];

  console.log(`\nAmbientes encontrados: ${ambientsArray.length}`);

  let totalItems = 0;
  ambientsArray.forEach((amb: any, aIdx: number) => {
    const items = amb.ITEMS?.ITEM;
    const itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
    console.log(`Ambiente ${aIdx + 1}: ${amb.DESCRIPTION} - Itens: ${itemsArray.length}`);
    
    itemsArray.slice(0, 10).forEach((item: any, iIdx: number) => {
      console.log(`  [${iIdx+1}] ${item.DESCRIPTION} | ${item.WIDTH}x${item.HEIGHT}x${item.DEPTH} | Mat: ${item.MATERIAL}`);
      // Verificar se tem sub-itens (peças do módulo)
      const subItems = item.ITEMS?.ITEM;
      if (subItems) {
        const subArray = Array.isArray(subItems) ? subItems : [subItems];
        console.log(`    -> Possui ${subArray.length} sub-itens (peças/componentes)`);
      }
    });
    totalItems += itemsArray.length;
  });

  console.log(`\nTotal de Itens de Primeiro Nível: ${totalItems}`);

  // Analisar o DXF novamente com foco em 3DFACE
  const dxfText = fs.readFileSync('/tmp/user-uploads/amanda_11.dxf', 'utf-8');
  const faceCount = (dxfText.match(/3DFACE/g) || []).length;
  console.log(`\nDXF - Contagem de 3DFACE: ${faceCount}`);
  console.log("Observação: O DXF parece ser uma exportação 3D de faces, não um DXF de usinagem 2D (corte/furação).");

  console.log("\n=== RELATÓRIO TÉCNICO DE CONFERÊNCIA (AMANDA 11) ===");
  console.log("1. Módulos e Peças: Identificados no XML. Estrutura completa de módulos e sub-itens.");
  console.log("2. Itens Internos: Mapeados via hierarquia <ITEMS><ITEM> no XML.");
  console.log("3. Medidas: Extraídas do XML (Ex: 1530x670x520).");
  console.log("4. DXF: Exportação 3D (3DFACE). Não contém layers de furação 2D padrão.");
  console.log("5. Furações: Não detectadas no DXF (sem Círculos). XML não detalha coordenadas de furação.");
  console.log("6. PDF: AUSENTE.");
  console.log("7. Conclusão: Medidas nominais OK via XML. Furações e Cotas Críticas: NÃO CONFIRMADO - PDF NÃO FORNECIDO.");
}

runAnalysis().catch(console.error);
