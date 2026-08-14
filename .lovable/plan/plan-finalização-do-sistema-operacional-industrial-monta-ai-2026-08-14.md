# Plan: Finalização do Sistema Operacional Industrial Monta AI

Este plano visa consolidar o Monta AI como um sistema operacional completo para a fabricação de móveis planejados, cobrindo o ciclo total de vida do projeto, desde a importação do Promob até a entrega final ao cliente.

## User Review Required

> [!IMPORTANT]
> A liberação de usinagem CNC e arquivos de máquina (MPR, CIX, etc.) permanece bloqueada por segurança (`machining_blocked = true`). O sistema foca no controle operacional, conferência e rastreabilidade 4.0.

## Proposed Changes

### 1. Dashboard & Wallboard Industrial
- **Dashboard**: Consolidar indicadores de produção, conferência e assistência técnica com gráficos de status industrial.
- **Wallboard**: Ajustar a tela de monitoramento em tempo real para TV, focando em colunas de processo (Corte, Borda, Usinagem, Separação, Conferência, Expedição).

### 2. Engenharia & Projetos
- **Importação Promob**: Garantir a preservação total de módulos, peças e ferragens, com agrupamento automático em G1, G2, G3 e AV.
- **Engenharia**: Melhorar a interface de comparação técnica (XML vs PDF vs DXF) e validação manual de peças.

### 3. Produção & Separação (Picking)
- **Kanban de Produção**: Refinar o fluxo de status (Corte -> Borda -> Usinagem -> Separação) com bloqueios de segurança entre etapas.
- **Separação (G1-G3)**: Implementar checklists obrigatórios por grupo físico, com registro de localização (corredor/caixa) e bloqueio de peças críticas.

### 4. Etiquetas & Conferência
- **Etiquetas 4.0**: Gerar etiquetas técnicas por peça e por volume (PDF) com QR Code e metadados industriais.
- **Conferência Mobile**: Interface otimizada para leitura de QR Code em ambiente de fábrica, com detecção de duplicidade e tratativa de danos/faltas.

### 5. Montagem & Expedição
- **Montagem Mobile**: Caderno de montagem digital com fotos, checklist de ferragens e sincronização offline.
- **Expedição**: Controle de carregamento com dados do veículo/motorista e confirmação de entrega via cliente.

### 6. Assistência Técnica
- Fluxo completo de abertura de chamados vinculados a projetos/módulos, com histórico e bloqueio de conclusão de projeto se houver pendência.

## Technical Details

- **Arquitetura**: Utilização de TanStack Start v1 para SSR e Server Functions.
- **Segurança**: RLS no Supabase em todas as tabelas, com RBAC (Admin, Escritório, Fábrica, Montador, Auditor).
- **Integração**: Conectar os módulos existentes via estados de `status` no banco de dados e logs em `production_logs`.
- **Interface**: Refinar componentes baseados em `shadcn/ui` para o "Industrial Design System 4.0" (cores semânticas, botões grandes para tablet).

## Contextual Constraints

- Não alterar o parser Promob central.
- Manter o bloqueio de CNC.
- Preservar a lógica de grupos G1/G2/G3/AV.
- Garantir responsividade total (Mobile, Tablet, Desktop, TV).
