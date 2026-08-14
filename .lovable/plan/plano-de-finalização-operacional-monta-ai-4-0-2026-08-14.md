# Plano de Finalização Operacional — Monta AI 4.0

Este plano consolida o Monta AI como uma plataforma industrial de ponta a ponta (Arquitetura → Venda → Fábrica → Cliente), implementando os módulos pendentes de Orçamento, Plano de Corte Preliminar, Proposta Comercial e Estimativa Visual, mantendo o Promob como autoridade de fabricação.

## 1. Módulos Industriais e de Engenharia

### Módulo 2 e 3 — Inteligência de Entrada (PDF & Visual)
- **Estimativa Visual:** Nova aba `VisualEstimateTab.tsx` para upload de fotos/croquis com identificação assistida por IA (ou manual guiada) de tipos de móveis, portas, gavetas e materiais.
- **Análise de PDF:** Aprimoramento do `pdf-parser.ts` para capturar metadados de confiança (Confirmado, Provável, Não confirmado) e exibição de alertas de validação obrigatória.
- **Status de Confiança:** Implementação de badges de status para cada medida detectada, impedindo a fabricação de itens sem validação física/Promob.

### Módulo 4 e 5 — Preparação e Pré-Cálculo
- **Lista Técnica Preliminar:** Nova aba `BillOfMaterialsTab.tsx` consolidando módulos, peças, ferragens e acessórios com status de validação.
- **Plano de Corte Beta:** Motor em `src/lib/cut-plan/optimizer.ts` para estimativa de chapas, considerando kerf, fibra e aproveitamento. Visualização gráfica 2D para orçamento.

## 2. Motor Comercial e Contratual

### Módulo 6 — Motor de Orçamento
- **Configurador Industrial:** Interface em `src/routes/_authenticated.settings.pricing.tsx` para gerenciar custos de materiais (MDF 6/15/18/25), serviços (corte, borda, usinagem) e impostos.
- **Cálculo Automático:** Lógica centralizada para compor o preço final: `Material + Borda + Ferragens + Serviços + Margem`.

### Módulo 7 e 8 — Proposta e Contrato
- **Proposta Comercial:** Geração de PDF elegante com capa, resumo de ambientes, imagens de referência e condições de pagamento, ocultando custos internos.
- **Contrato:** Integração do modelo de contrato existente com preenchimento automático de dados do cliente e projeto.

## 3. Segurança e Regras de Negócio
- **Trava CNC:** Garantia de que `machining_blocked = true` seja mantido até a validação final.
- **Identidade Visual:** Aplicação rigorosa do "Industrial Design System 4.0" (Verde=Concluído, Azul=Andamento, Amarelo=Atenção, Vermelho=Bloqueio).

## Detalhes Técnicos

- **Banco de Dados:** Novas tabelas para `pricing_configs`, `project_estimates` e `proposal_templates`.
- **Servidor:** Funções `createServerFn` para processamento de imagem/PDF e cálculos de orçamento.
- **Frontend:** Uso de `jspdf` para propostas e `canvas` para o plano de corte preliminar.
- **Arquitetura:** Separação clara entre dados "Estimados" (Arquitetura/SketchUp) e dados "Reais" (Engenharia/Promob).

---
*Veredito: Pronto para implementação do ecossistema completo.*
