---
name: Correção do Carregamento de Módulos e Sidebar
description: Resolver falha na visibilidade de módulos reais e persistência de dados técnicos após a importação.
type: feature
---

# Diagnóstico Técnico
O problema de "módulos não carregando" e botões da sidebar sumindo é causado por um desalinhamento entre o estado de autenticação (role/companyId) e as políticas de RLS no banco de dados, agravado por uma falha de vínculo na persistência durante o Wizard de Importação.

1.  **Sidebar Vazia:** O `AppShell.tsx` filtra `navItems` baseando-se no `role`. Se o `useAuth` demorar a resolver ou se o `user_roles` não estiver mapeado corretamente, a sidebar fica vazia.
2.  **Módulos Invisíveis:** As consultas em `ProjectDetailPage` e `AssemblyBookTab` usam filtros rigorosos (`project_id`, `kind='peca'`). Se o parser XML não persistir o `is_industrial_module: true` ou se o `module_id` nas peças estiver nulo, os módulos não aparecem.
3.  **RLS Deadlock:** As políticas de `modules` e `parts` dependem de `has_role`, que pode falhar em ambientes de produção se não for `SECURITY DEFINER`.

# Plano de Ação

## 1. Infraestrutura e Segurança (Banco de Dados)
- Atualizar a função `has_role` para garantir que seja `SECURITY DEFINER` e use o `search_path` correto.
- Revisar as políticas de RLS para `modules` e `parts` para garantir que o papel `admin` e `projetista` tenham acesso total via `company_id`.

## 2. Ingestão e Persistência (`src/routes/_authenticated.projects.import.tsx`)
- Garantir que o `RPC import_client_project` receba e persista corretamente a flag `is_industrial_module` na tabela `modules`.
- Reforçar o vínculo `module_id` -> `parts` durante o loop de inserção.
- Adicionar logs de persistência para rastrear falhas silenciosas no Supabase.

## 3. Visibilidade da Interface (`src/components/AppShell.tsx` e `src/routes/_authenticated.projects.$projectId.tsx`)
- Remover o carregamento condicional agressivo da sidebar; mostrar um "Skeleton" ou estado de carregamento enquanto o perfil é resolvido.
- Em `ProjectDetailPage`, adicionar um `fallback` para a query de módulos: se `modules.data` for vazio mas o projeto existir, exibir um botão de "Reprocessar Pasta do Cliente".
- Corrigir a query em `AssemblyBookTab` para incluir peças sem `module_id` como "Itens Avulsos".

## 4. Estabilização do Wizard
- O botão "Criar e Produzir Agora" deve aguardar a confirmação de que os arquivos foram movidos do bucket temporário para o permanente antes de redirecionar.

# Validação
- Testar importação do XML `CLOSET-18-07-2026.xml` e verificar se os 13 módulos aparecem na sidebar.
- Simular login com papéis `fabrica` e `montador` para garantir que a sidebar se ajuste corretamente.
