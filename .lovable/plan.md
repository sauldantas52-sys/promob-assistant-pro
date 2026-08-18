# Plano de Implementação: Estudo de Arquivos e Extração Industrial 6.5

O objetivo é realizar um estudo técnico aprofundado nos novos arquivos enviados (PDFs, XML, DXF, PROMOB) para extrair geometria, materiais, fitas de borda e furações, alimentando o Plano de Corte Pro, Caderno de Montagem e Ambiente 3D com precisão industrial.

## 1. Análise Técnica dos Arquivos
- **CLOSET-18-07-2026.xml**: Extração de `UNIQUEID` (UniqueId do Promob) para vincular módulos e peças. Mapeamento de `MATERIAL`, `THICKNESS`, `MODEL` e fitas `FITA_BORDA_1-4`.
- **PRODUÇÃO-CLOSET-SAPATEIRA-MOD-22-07-2026.dxf**: Extração de coordenadas de furação e usinagem.
- **ListaCorte.pdf / ListaCompra.pdf**: Validação cruzada de quantidades e bitolas para garantir que o sistema não "invente" dados.
- **Cliente-nao-informado...COTAS.pdf**: Referência visual para validação de dimensões externas dos módulos.

## 2. Refinamento do Processamento Industrial
- **Parser XML Industrial**: Atualizar `src/lib/promob-import.ts` para capturar metadados estritos de fita de borda (F1-F4) e associar `raw_name` real do Promob.
- **Sincronização de Peças**: Garantir que o `id_xml` seja a chave primária de vínculo entre o banco de dados e as visualizações (3D e Caderno).
- **Motor de Plano de Corte**: Validar as regras de refilo (5mm em cada lado) e kerf (4mm) contra as listas de corte PDF enviadas.

## 3. Melhorias na Interface e Visualização
- **Caderno de Montagem**: Exibição clara dos grupos G1-G5 e identificação de peças via QR Code (`physical_id`).
- **Ambiente 3D**: Renderização volumétrica fiel baseada nas dimensões `WIDTH`, `HEIGHT`, `DEPTH` do XML.
- **Painel de Produção**: Liberação automática de fluxos (Corte, Borda, Usinagem) ao detectar integridade total nos arquivos importados.

## Detalhes Técnicos
- Utilização de `DOMParser` para processamento escalável de grandes arquivos XML (>8000 linhas).
- Integração de metadados redundantes no Supabase (`modules` e `parts`) para evitar órfãos em reconciliações assíncronas.
- Manutenção do padrão **Industrial Design System 4.0** (Typography SF Pro, Dark/Light mode).
