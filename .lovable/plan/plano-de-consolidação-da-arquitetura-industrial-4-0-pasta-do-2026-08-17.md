# Plano de Consolidação da Arquitetura Industrial 4.0 — Pasta do Cliente

O sistema apresenta falha de persistência e bloqueio indevido no fluxo de alimentação. Este plano corrige a arquitetura para garantir que a alimentação do processo (Projetista) seja independente da liberação industrial (Fábrica), assegurando persistência real em banco de dados e visibilidade total para administradores.

## Mudanças no Banco de Dados (Supabase)

1. **Correção do RPC `import_client_project`**:
   - Tornar o arquivo `imagem_referencia` **opcional** no check de manifest.
   - Garantir que a falha de um arquivo opcional não interrompa a criação do projeto.
   - Adicionar log de auditoria explícito ao finalizar a transação.
2. **Correção de RLS (Políticas de Segurança)**:
   - Revisar políticas de `projects`, `modules`, `parts`, `project_files` para garantir que `admin` tenha acesso total (`USING (company_id = public.current_company_id())`).
   - Garantir que `projetista` possa inserir e visualizar todos os dados técnicos da empresa.
3. **Nova Tabela `visual_identifications`**:
   - Criar tabela para persistir a conferência visual do projetista sem alterar o XML oficial.

## Mudanças no Frontend (TanStack Start)

1. **Refatoração da Importação Industrial (`src/routes/_authenticated.projects.import.tsx`)**:
   - Implementar fluxo de "Criação Imediata": O `projectId` é gerado e o registro no banco (`projects` + `project_import_sessions`) ocorre **antes** do processamento pesado.
   - Tornar a imagem opcional na interface de validação da pasta.
   - Adicionar painel de "Auditoria de Persistência Industrial" que mostra contagens reais do banco de dados após a importação.
2. **Novo Módulo "Alimentação Visual do Projeto"**:
   - Criar `src/components/project/VisualIntakeModule.tsx`: Uma interface rica para o projetista vincular arquivos técnicos a módulos e peças.
   - Integrar visualização 3D DXF com metadados do XML.
3. **Painel "Projeto Alimentado"**:
   - Componente para exibir o status real de persistência (Project Files, Modules, Parts) consultando o banco de dados via `useQuery`, não estado local.
4. **Correção de Bloqueios**:
   - Garantir que `machining_blocked = true` afete apenas o status da usinagem, permitindo o preenchimento de checklists, anotações e identificações visuais.

## Detalhes Técnicos

- **Fluxo de Persistência**: `Browser (File Selection) -> Server (Create Project) -> Browser (Upload to Storage) -> Server (RPC Process XML & Files) -> Browser (Verify Counts)`.
- **Integridade**: A ausência de imagem gera um `Badge` de aviso "Referência Visual Pendente", mas não bloqueia o botão "Finalizar Importação".
- **Gêmeo Digital**: A aba `Gêmeo DXF` deve ser acessível para o projetista realizar a conferência visual cruzada com a lista de peças.

## Verificação

1. **Teste Físico "Closet"**: Realizar importação completa, fechar o navegador, abrir e verificar se módulos e peças persistem.
2. **Auditoria Admin**: Logar com conta admin e confirmar visibilidade dos projetos criados por projetistas.
3. **Check de Bloqueio**: Confirmar que projetos marcados como `machining_blocked` permitem edição de observações e conferência visual.
