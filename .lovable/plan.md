# Plano de Implementação: Caderno de Montagem e Módulos Reais

Este plano visa consolidar o módulo de montagem e a exibição de módulos reais do projeto, garantindo que os dados extraídos do XML sejam visíveis e operacionais para a fábrica.

## Usuário e Negócio
- **Público:** Marceneiros e montadores de fábrica.
- **Objetivo:** Visualizar as instruções de montagem (caderno) e a lista de módulos reais do projeto para conferência e produção.

## Alterações Técnicas

### 1. Novo Componente: Caderno de Montagem (`AssemblyBookTab.tsx`)
- Criar um novo componente dedicado para a aba "Caderno de Montagem".
- Este componente exibirá uma visão geral do projeto dividida por módulos.
- Para cada módulo:
  - Mostrar nome, dimensões e quantidade.
  - Listar as peças MDF associadas com suas dimensões e acabamentos (fitas de borda).
  - Incluir um botão para visualizar o módulo no 3D (linkando com a aba 3D).
  - Permitir a marcação de conclusão da montagem do módulo (persistência na tabela `modules`).

### 2. Integração na Rota do Projeto (`_authenticated.projects.$projectId.tsx`)
- Adicionar a aba "Caderno de Montagem" no menu lateral (sidebar).
- Registrar o novo componente na área de conteúdo central.
- Garantir que a aba "Módulos e Peças Real" esteja alimentada corretamente pelos dados do banco.

### 3. Melhoria na Visualização 3D (`Operational3DView.tsx`)
- Adicionar um botão de "Gerar Caderno de Montagem" ou "Ver Detalhes de Montagem" diretamente na barra de ferramentas do 3D.
- Facilitar a transição entre a inspeção 3D e a lista de peças técnica.

### 4. Persistência de Dados
- Verificar se a coluna `is_completed` na tabela `modules` está sendo atualizada corretamente para refletir o progresso da montagem.

## Próximos Passos
1. Criar o arquivo `src/components/project/AssemblyBookTab.tsx`.
2. Modificar `src/routes/_authenticated.projects.$projectId.tsx` para incluir a nova aba.
3. Modificar `src/components/project/Operational3DView.tsx` para adicionar atalhos de navegação.
4. Validar o fluxo com o projeto "CLOSET" importado.

Este plano foca em tornar o sistema operacional para quem está na bancada de montagem.
