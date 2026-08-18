# Plano: Migração para Importação Real de Empresa e Arquivos

Este plano substitui a importação de exemplo/pasta por um fluxo onde o usuário escolhe sua empresa (multitenancy) e importa arquivos reais para o projeto.

## Alterações de UI/UX
- **Tela de Importação**: Modificar `src/routes/_authenticated.projects.import.tsx` para garantir que o `companyId` venha do contexto de autenticação e remover qualquer dependência de dados mockados/exemplo.
- **Wizard de Ingestão**: Otimizar a detecção automática de arquivos na pasta selecionada, garantindo que o `project-files` bucket seja o destino real.

## Alterações Funcionais
- **Seleção de Empresa**: Garantir que o usuário só possa importar para a empresa à qual está vinculado no perfil (`profiles.company_id`).
- **Persistência Real**: Validar que a RPC `import_client_project` e o armazenamento no Storage funcionem com arquivos físicos carregados via `webkitRelativePath`.

## Passos Técnicos
1.  **Refatoração do Import**: Atualizar o componente `ImportPage` para validar a existência da empresa do usuário antes de permitir o upload.
2.  **Fluxo de Arquivos**: Garantir que o `handleFolderSelection` capture e sanitize corretamente todos os arquivos da estrutura de diretórios do usuário.
3.  **Segurança RLS**: Validar que as políticas do Storage e do Banco permitam a ingestão baseada no `company_id` do usuário logado.

