# Plano de Correção do Fluxo de Ingestão e Plano de Corte (Fidelity 5.7)

O usuário relatou que o sistema "não está alimentando" e que o plano de corte deve estar em uma "aba única do lado esquerdo" alimentada pela pasta.

## Objetivos
1. **Remover Trava de Ingestão**: Garantir que a seleção da pasta no ImportPage inicie a alimentação total do sistema sem checklists ou bloqueios.
2. **Interface Unificada de Produção**: Reorganizar a visualização do projeto para priorizar o Plano de Corte e Detalhes Técnicos em uma estrutura de navegação lateral (Sidebar Técnica).
3. **Persistência Garantida**: Validar que os dados do XML (Módulos e Peças) sejam distribuídos e fiquem visíveis imediatamente após a importação.

## Alterações Técnicas

### 1. Ingestão Industrial Automática (`src/routes/_authenticated.projects.import.tsx`)
- **Automação Total**: A mutação de criação de projeto deve forçar o status para `corte` e `machining_blocked = false` no momento do `insert`.
- **Simplificação de UI**: Remover seções de "Destino" e "Pré-visualização" — o sistema deve assumir fluxo industrial direto para a fábrica.
- **Redirecionamento**: Após o sucesso, redirecionar para a nova visualização técnica do projeto.

### 2. Nova Arquitetura de Detalhes do Projeto (`src/routes/_authenticated.projects.$projectId.tsx`)
- **Layout de Sidebar Técnica**: Substituir os Tabs horizontais superiores por um layout de `Sidebar` + `Content` dentro da página do projeto.
- **Estrutura de Menu**:
  - Plano de Corte Pro (Destaque)
  - Módulos e Peças
  - 3D Operacional
  - Etiquetas e QR
  - Documentos (PDFs da pasta)
- **Persistência de Estado**: Garantir que ao alternar abas os dados não "desapareçam" (re-validar caches do TanStack Query).

### 3. Motor de Plano de Corte (`src/lib/cut-plan/engine.ts`)
- **Refilo de 10mm**: Consolidar a regra de refilo de 10mm em todos os cálculos.
- **Vinculação de Peças**: Garantir que cada `PhysicalPiece` gerada pelo motor aponte corretamente para o `part_id` do banco.

### 4. Correção de RLS e Permissões
- Garantir que o `company_id` seja propagado corretamente em todas as inserções de `parts` e `modules` para evitar que o RLS oculte os dados recém-inseridos.

## Passos de Implementação
1. Modificar `import_client_project` RPC ou lógica de inserção para destravar o projeto por padrão.
2. Refatorar o componente `ProjectDetail` para usar navegação lateral.
3. Mover `PreliminaryCutPlanTab` para a posição de destaque (primeiro item).
4. Adicionar logs de auditoria visíveis no console durante a importação para que o usuário veja a "alimentação" acontecendo em tempo real.
