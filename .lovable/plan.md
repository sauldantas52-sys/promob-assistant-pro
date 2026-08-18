# Plano de Implementação: Análise Técnica e Extração Industrial 6.6

Este plano detalha o estudo e extração de dados dos arquivos industriais enviados para alimentar de forma definitiva o ecossistema do **Monta AI**.

## 1. Auditoria de Geometria e Estrutura (XML + DXF)
- **Extração de Módulos (Gabarito 13 Módulos)**:
  - Analisar `CLOSET-18-07-2026.xml` para mapear os 13 módulos reais do projeto `CLOSET`.
  - Usar o UniqueId do Promob como âncora de integridade.
- **Extração de Peças (Gabarito 409 Itens)**:
  - Mapear cada uma das 409 peças físicas, capturando material, espessura e fitas de borda.
- **Usinagem e Furação (DXF)**:
  - Mapear as coordenadas do arquivo `PRODUÇÃO-CLOSET-SAPATEIRA-MOD-22-07-2026.dxf` para habilitar a visualização de furos no Ambiente 3D e etiquetas.

## 2. Validação Industrial (PDFs)
- **Conferência de Bitolas**: Comparar as dimensões extraídas do XML com as tabelas de `ListaCorte.pdf`.
- **Regra de Refilo e Kerf**: Aplicar 5mm de refilo em cada lado e 4mm de kerf conforme configurado, validando contra o `PreviewCorte.pdf`.
- **Lista de Compras**: Sincronizar as ferragens e acessórios identificados no XML com o `ListaCompra.pdf`.

## 3. Persistência e Visibilidade (Industrial Core)
- **Ingestão em Tempo Real**: Garantir que ao clicar em "Importar", os dados fluam imediatamente para o banco de dados via RPC industrial.
- **Sincronização Sidebar**: Garantir que as abas "Plano de Corte Pro", "Ambiente 3D" e "Caderno de Montagem" sejam liberadas e alimentadas com os dados técnicos.
- **Etiquetas de Produção**: Habilitar a geração de etiquetas industriais (Zebra/Remac) com os metadados reais extraídos.

## Detalhes Técnicos
- O parser em `src/lib/promob-import.ts` será o motor central, tratando discrepâncias entre `DESCRIPTION` e `REFERENCE`.
- As visualizações em `AssemblyBookTab.tsx` e `Operational3DView.tsx` utilizarão a estratégia de triple-link (`module_id`, `id_xml`, `metadata.id_xml`) para garantir zero perda de dados.
- Todo o fluxo seguirá o **Industrial Design System 4.0**.
