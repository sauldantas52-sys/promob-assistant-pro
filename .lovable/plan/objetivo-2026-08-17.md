---
name: Industrial Parser Fidelity 4.0
description: Implementação do parser de alta fidelidade para Promob XML, focando no bloco <REFERENCES> e regras de classificação de MDF.
type: feature
---

## Objetivo
Corrigir o parser `src/lib/promob-import.ts` para ler dados técnicos (material, espessura, cor, fitas) diretamente do bloco `<REFERENCES>` do XML do Promob, aplicando regras de "Plano B" para desmontagem de referências e garantindo a hierarquia correta de módulos/peças.

## Regras de Implementação

### 1. Leitura de Referências (<REFERENCES>)
- Implementar `refOf(item: Element, key: string): string | null` que busca o atributo `REFERENCE` dentro do bloco `<REFERENCES>` para a chave fornecida.

### 2. Classificação de Peças MDF
- Um item é peça de MDF se:
  - `refOf(item, 'MATERIAL')` é 'MDF' ou 'MDP' **E** `refOf(item, 'THICKNESS')` existe.
  - Ou se o atributo `REFERENCE` do item (Plano B) indicar material e espessura válida.

### 3. Mapeamento de Campos
- **Material**: `refOf('MATERIAL')`
- **Espessura**: `refOf('THICKNESS')` (Nunca `HEIGHT`)
- **Cor**: `refOf('MODEL')` ou `refOf('MODEL_DESCRIPTION')`
- **Fornecedor**: `refOf('SUPPLIER')` ou `refOf('SUPPLIER_EXT')`
- **Fitas de Borda**: `FITA_BORDA_1` a `4`.
- **Nomes de Fita**: `MODEL_DESCRIPTION_FITA` e `MODEL_DESCRIPTION_FITA_FRO`.
- **Dimensões**: `WIDTH`, `HEIGHT`, `DEPTH` ordenados (Maior = comprimento, Segundo = largura). Espessura vem APENAS de `THICKNESS` ou Plano B.

### 4. Plano B (Desmontagem de Referência)
- Se `REFERENCES` falhar, desmontar a string `REFERENCE` (ex: "2.2015.6.Branco.MDF"):
  - Material: Segmento que contém 'MDF' ou 'MDP'.
  - Espessura: Último segmento numérico na lista [3, 4, 6, 9, 12, 15, 18, 20, 25, 30].
  - Cor: Segmento anterior ao material.
  - Marcar `metadata.origem = "referencia_desmontada"`.

### 5. Hierarquia e Identificadores
- **Módulos**: Subir a árvore a partir da peça até encontrar o primeiro pai `<ITEM>`. Se não houver, classificar como "Avulso".
- **Sequenciamento**: 
  - `module_sequence`: Ordem de aparecimento no XML (G1, G2...).
  - `piece_sequence`: Ordem dentro do módulo (P1, P2...).
- **Sub-IDs**: Tratar `UniqueIdCollection` (split por ';'). Se ausente, usar `UNIQUEID`.

### 6. Relatório de Importação
- Implementar contador exato para: Total de itens, Módulos, Peças MDF (módulo/avulsa), Ferragens, e Não Classificados.

## Critérios de Aceite
- Importação do arquivo `CLOSET 18 07 2026.xml` apresentando o relatório na tela.
- Verificação via SQL da persistência dos campos `id_xml`, `material`, `thickness_mm`, `color`, `edge_*` e `repetition/quantity_raw`.
- Verificação de qualidade (contagem de nulos).
