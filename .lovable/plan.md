# Plano de Consolidação da Plataforma Monta AI 4.0

Este plano descreve a finalização da plataforma através da criação de uma camada de integração com os serviços oficiais (PROMOB_ASSISTANT_SRC), evitando duplicação de lógica e garantindo a integridade dos dados industriais.

## Módulos de Integração

### 1. Plano de Corte (CutPlanService & SheetLayoutService)
- **Integração:** Criar `src/lib/cut-plan/integration.ts` para processar resultados do Cut Pro.
- **Regras:** Separar métricas (peças, cortes, chapas, serra, aproveitamento).
- **Segurança:** Marcar como "Pendente de Validação Oficial" qualquer otimização local.

### 2. OCR e Notas (OcrService & ReceiptParser)
- **Integração:** Criar `src/lib/ocr/processor.ts` para processar PDFs/Fotos de fornecedores.
- **Fluxo:** Extração de metadados -> Conferência Humana -> Confirmação de Entrada/Estoque.

### 3. Gestão Comercial (QuoteEngine, CommercialProposalService, ContractGenerator)
- **Integração:** Expandir `src/lib/pricing/engine.functions.ts` e `src/lib/proposal/generator.ts`.
- **Regras:** Bloquear produção até aprovação comercial; gerar PDF profissional de proposta e contrato.

### 4. Gestão de Estoque e Crédito (StoreCreditService & BusinessEngine)
- **Integração:** Criar `src/lib/inventory/manager.ts`.
- **Regras:** Registro rigoroso de movimentação (saldo anterior/posterior); impedir duplicidade; permitir estornos.

### 5. Compras e Fornecedores (WhatsAppService & BusinessEngine)
- **Integração:** Criar `src/lib/suppliers/comparison.ts`.
- **Interface:** Comparação de preço/frete/prazo; histórico de comunicações.

## Detalhes Técnicos
- **Frontend:** Atualização de `src/routes/_authenticated.projects.$projectId.tsx` para incluir as novas abas operacionais.
- **Database:** Criação de tabelas para `inventory_logs`, `project_quotes` e `supplier_prices` via migração.
- **Segurança:** Manter `machining_blocked = true` e status "Não confirmado" para toda entrada externa não validada.

## Cronograma de Execução
1. Migração de Banco de Dados (Schema de Orçamento e Estoque).
2. Implementação dos Services de Integração (Mock wrappers para PROMOB_ASSISTANT_SRC).
3. Atualização da Interface do Projeto (Tabs: Comercial, Suprimentos, Logística).
4. Validação do Fluxo de Segurança (Lock de Produção).
