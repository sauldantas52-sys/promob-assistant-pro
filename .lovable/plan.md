---
name: Módulos do Projeto e Caderno de Montagem
description: Correção do carregamento de módulos e peças no fluxo industrial, garantindo visibilidade e persistência após importação.
type: feature
---

# Módulos e Peças não carregando

O usuário reportou que os módulos não estão carregando, e as auditorias técnicas via Playwright confirmaram que a sidebar e as abas de módulos/peças estão vazias ou inacessíveis em projetos reais, sugerindo uma falha na persistência, RLS ou na lógica de visibilidade por perfil.

## Diagnóstico
1. **RLS e Permissões:** O sistema de permissões em `src/lib/permissions.ts` e o guard de autenticação em `src/routes/_authenticated.tsx` podem estar filtrando dados ou bloqueando a renderização da sidebar se o papel do usuário não estiver perfeitamente alinhado com as rotas.
2. **Persistência na Importação:** Embora o `parsePromobXML` funcione no frontend, a persistência via `project_import_sessions` ou `import_client_project` pode estar falhando silenciosamente ou não vinculando as peças aos `module_id` corretamente.
3. **Visibilidade da Sidebar:** O `AppShell.tsx` filtra itens por `role`. Se o `useAuth` não resolver o `role` corretamente a tempo, a navegação lateral desaparece.
4. **Filtro de Peças:** A query de peças em `ProjectDetailPage` usa `eq("kind", "peca")`. Se o parser marcar as peças com outro `kind` ou se o `module_id` estiver nulo, elas podem sumir das abas específicas.

## Plano de Ação

### 1. Auditoria e Correção de RLS
- Verificar se a tabela `modules` e `parts` possuem políticas de RLS que permitem `SELECT` para todos os papéis industriais (`admin`, `projetista`, `escritorio`, `fabrica`, `montador`, `auditor`).
- Garantir que `has_role` não está causando recursão infinita ou falhando para papéis recém-criados.

### 2. Reforço na Ingestão de Dados (`src/lib/promob-import.ts`)
- Garantir que cada peça (`PromobPart`) receba obrigatoriamente um `unique_id` e que a relação com o `parent_id` seja preservada.
- Validar se a marcação `is_industrial_module: true` está sendo persistida para que a query de módulos os encontre.

### 3. Ajuste na UI de Navegação (`src/components/AppShell.tsx`)
- Adicionar logs de depuração para o `role` e `visibleNavItems`.
- Garantir que a sidebar não desapareça enquanto os dados de perfil estão sendo carregados (loading state).

### 4. Correção da Página de Detalhes (`src/routes/_authenticated.projects.$projectId.tsx`)
- Revisar as queries de `modules` e `parts` para garantir que não estão sendo filtradas agressivamente.
- Adicionar estados de "Empty" mais claros para diagnosticar se o problema é "Sem dados" ou "Erro de carregamento".

## Próximos Passos
1. Executar migration para revisar RLS.
2. Atualizar logic de importação para garantir vínculo `module_id` -> `parts`.
3. Validar visibilidade da sidebar para todos os papéis.
