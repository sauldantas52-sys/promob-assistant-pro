# Plano de Implementação: Módulo de Assistência Técnica

Este módulo permitirá a abertura de chamados, registro de problemas com fotos e o rastreamento de reposições de peças, integrando o montador à fábrica e ao escritório.

## Mudanças no Banco de Dados

1.  **Tabela `maintenance_requests`**:
    *   `id` (uuid, primary key)
    *   `project_id` (uuid, references projects)
    *   `module_id` (uuid, references modules, nullable)
    *   `part_id` (uuid, references parts, nullable)
    *   `company_id` (uuid, references companies)
    *   `created_by` (uuid, references auth.users)
    *   `description` (text)
    *   `type` (enum: 'defeito', 'dano_transporte', 'erro_projeto', 'erro_montagem', 'outros')
    *   `urgency` (enum: 'baixa', 'media', 'alta', 'critica')
    *   `status` (enum: 'aberto', 'em_analise', 'producao', 'enviado', 'concluido')
    *   `photos` (text array - URLs para o Storage)
    *   `created_at` (timestamptz)

2.  **Configuração do Storage**:
    *   Criar bucket `maintenance_photos` para armazenar as evidências.

## Novas Funcionalidades

### 1. Abertura de Chamado (Interface do Montador/Fábrica)
*   Formulário na tela de detalhes do projeto ou tela de montagem.
*   Seleção simplificada de qual módulo/peça está com problema (vinculado aos dados do Promob).
*   Upload de fotos em tempo real.

### 2. Gestão de Chamados (Painel do Escritório/Fábrica)
*   Fila de assistências pendentes.
*   Aprovação e envio automático para a "Ordem de Produção de Reposição".
*   Notificações de mudança de status.

### 3. Rastreamento de Peças de Reposição
*   Status específico para peças que estão sendo refeitas.
*   Data estimada de entrega da assistência.

## Detalhes Técnicos
*   **Segurança**: RLS para garantir que apenas membros da mesma `company_id` acessem os chamados.
*   **Interface**: Uso de componentes Shadcn (Sheet para abertura rápida, Badge para status e urgência).
*   **Fluxo**: Integração com a `src/routes/projects.$projectId.tsx` através de uma nova aba "Assistência".

## SEO e Metadados
*   Atualização do head da rota de projetos para incluir termos relacionados à assistência técnica e pós-venda.
