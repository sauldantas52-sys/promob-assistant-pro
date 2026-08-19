# Plano de Implementação: Interface Moderna Monta AI (Kallan/Linear Style)

O objetivo deste plano é implementar a interface visual moderna e profissional solicitada, baseada no design proposto no arquivo `index.html` (do ZIP), adaptando-a para a arquitetura **TanStack Start** e **Supabase** do projeto atual, mantendo toda a lógica de negócio intacta.

## 1. Atualização do Design System (CSS)
- **Cores e Identidade**: Atualizar `src/styles.css` com a paleta específica:
  - Azul principal: `#1F5673` (aplicado ao Header e botões primários).
  - Fundo Industrial: `#F0F4F8`.
  - Cores das etapas do Kanban (aguardando, corte, fita_borda, etc.).
- **Componentes Base**: Estilizar os cards de projeto e modais para seguirem o padrão "Linear/Trello" (bordas suaves, sombras leves, tipografia técnica).

## 2. Refatoração do Dashboard (Kanban Principal)
- **Rota**: `src/routes/_authenticated.dashboard.tsx`.
- **Estrutura**:
  - Implementar o layout horizontal de colunas por etapa.
  - Criar o card de projeto com metadados visíveis (módulos, peças, chapas).
  - Integrar a Sidebar de filtros e contadores conforme o design proposto.
- **Funcionalidade**: Garantir que o "arrastar e soltar" ou a mudança de etapa via modal atualize o Supabase em tempo real.

## 3. Modal de Importação e Detalhes
- **Importação**: Atualizar a UI de `src/routes/_authenticated.projects.import.tsx` (ou componente equivalente) para o estilo drag & drop com feedback animado de progresso ("Lendo XML...", etc.).
- **Detalhes**: Refinar a visualização de `src/routes/_authenticated.projects.$projectId.tsx` para incluir o grid de estatísticas (2x2), botões de download de documentos industriais e histórico de movimentação.

## 4. Integração com API / Backend
- **Importante**: O usuário mencionou uma API `/api/*`, mas o projeto atual utiliza **Server Functions** e **Supabase**. Manteremos o uso do Supabase (que já funciona) apenas revestindo com a nova interface, garantindo que os botões de download e ações de CRUD apontem para os dados reais.

## Detalhes Técnicos
- Utilização de **Tailwind CSS** para replicar o design do `index.html` de forma responsiva (focada em desktop e tablet).
- Preservação de todos os `guards` de autenticação e permissões de roles (admin, fabrica, montador, etc.).
- O arquivo final será integrado ao fluxo do TanStack Router, não criando um `index.html` estático isolado, para manter a reatividade do sistema.
