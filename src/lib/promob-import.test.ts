import { describe, it, expect } from 'vitest';
import { parsePromobXml } from './promob-import';

describe('parsePromobXml', () => {
  it('should parse a simple Promob XML', () => {
    const xml = `
      <PROJECT>
        <ITEMS>
          <ITEM UNIQUEID="M1" DESCRIPTION="Armário Cozinha" UNIQUEPARENTID="-2" WIDTH="1200" HEIGHT="700" DEPTH="600" QUANTITY="1" ENVIRONMENT="Cozinha">
            <ITEMS>
              <ITEM UNIQUEID="P1" DESCRIPTION="Lateral Direita" UNIQUEPARENTID="M1" WIDTH="600" LENGTH="700" THICKNESS="18" QUANTITY="1" MATERIAL="MDF Branco" EDGE="PVC 2mm" />
              <ITEM UNIQUEID="P2" DESCRIPTION="Base" UNIQUEPARENTID="M1" WIDTH="1164" LENGTH="600" THICKNESS="18" QUANTITY="1" MATERIAL="MDF Branco" EDGE="PVC 0.45mm" />
              <ITEM UNIQUEID="F1" DESCRIPTION="Dobradiça 35mm" UNIQUEPARENTID="M1" QUANTITY="4" FAMILY="Ferragem" />
            </ITEMS>
          </ITEM>
          <ITEM UNIQUEID="AV1" DESCRIPTION="Puxador Perfil" UNIQUEPARENTID="-2" QUANTITY="2" CATEGORY="Acessórios" />
        </ITEMS>
      </PROJECT>
    `;
    
    const result = parsePromobXml('test.xml', 1024, xml);
    
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].name).toBe('Armário Cozinha');
    expect(result.modules[0].parts).toHaveLength(3);
    
    const lateral = result.modules[0].parts.find(p => p.name === 'Lateral Direita');
    expect(lateral?.kind).toBe('peca');
    expect(lateral?.thickness_mm).toBe(18);
    expect(lateral?.width_mm).toBe(600);
    
    const dobradica = result.modules[0].parts.find(p => p.name === 'Dobradiça 35mm');
    expect(dobradica?.kind).toBe('ferragem');
    
    expect(result.looseParts).toHaveLength(1);
    expect(result.looseParts[0].kind).toBe('acessorio');
  });

  it('should handle decimal commas in measurements', () => {
    const xml = `
      <PROJECT>
        <ITEMS>
          <ITEM UNIQUEID="M1" DESCRIPTION="Módulo" UNIQUEPARENTID="-2" WIDTH="1200,5" HEIGHT="700" DEPTH="600" QUANTITY="1">
            <ITEMS>
              <ITEM UNIQUEID="P1" DESCRIPTION="Lateral" UNIQUEPARENTID="M1" WIDTH="600,25" LENGTH="700" THICKNESS="18,0" QUANTITY="1" />
            </ITEMS>
          </ITEM>
        </ITEMS>
      </PROJECT>
    `;
    
    const result = parsePromobXml('test.xml', 1024, xml);
    expect(result.modules[0].width_mm).toBe(1200.5);
    expect(result.modules[0].parts[0].width_mm).toBe(600.25);
    expect(result.modules[0].parts[0].thickness_mm).toBe(18);
  });
});
