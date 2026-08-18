# Industrial Persistence & Navigation Audit - Fidelity 5.0

Implementação da camada de **Operação de Fábrica (Fidelity 5.0)**, garantindo rastreabilidade 1:1 através do `physicalId` e integração total do fluxo industrial (Corte > Fita > Usinagem > Separação > Montagem > Expedição).

## 1. Infraestrutura de Banco de Dados (Evolução 5.0)

A tabela `production_steps` será o coração da operação, vinculando estados de produção a peças físicas reais.

- **Migração Aplicada**:
  - Adição de `physical_id` (text) e `company_id` (uuid) à tabela `production_steps`.
  - Criação de índices industriais para busca instantânea via QR Code.
  - Implementação da RPC `initialize_production_tracking` para geração atômica de todas as etapas de uma peça no momento da importação.

## 2. Camada de Navegação Industrial (Router)

Criação da rota especializada para tablets de fábrica e abertura direta de peças.

- **Novas Rotas**:
  - `/_authenticated.assembly.piece.$physicalId`: Ficha técnica e operacional da peça individual.
  - Otimização da rota `/assembly` para visualização de módulos e progresso real.

## 3. Lógica de Negócio e Rastreabilidade

- **Geração de Etapas**: Ao finalizar a importação (ou via trigger), o sistema invocará `initialize_production_tracking` para as 409 peças físicas (exemplo do Closet), garantindo que cada peça tenha seu ciclo de vida rastreável.
- **Mapeamento de Bordas (F1-F4)**: Reutilização da lógica de etiquetas para exibição visual no tablet, garantindo fidelidade entre o que está na etiqueta e o que o operador vê na tela.
- **Scanner QR**: Integração de leitura via câmera com fallback para entrada manual, respeitando o `physicalId` como chave primária operacional.

## 4. UI/UX Industrial (Tablet)

- **Cards de Módulos**: Exibição de progresso baseada em peças físicas concluídas (ex: 18/24 peças).
- **Ficha da Peça**:
  - Botões grandes para troca de status (CORTE, FITA, USINAGEM, etc.).
  - Visualização do Plano de Corte (destacando a peça na chapa).
  - Informações técnicas (Furação, Bordas, Material).

## Detalhes Técnicos
- Utilização de `@tanstack/react-router` para navegação estruturada.
- Supabase RLS para isolamento por `company_id`.
- Persistência imediata de eventos no `production_logs` para auditoria 4.0.
