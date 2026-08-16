# Plano de Consolidação Industrial 4.0 — Pasta do Cliente

O sistema apresenta falhas na importação e visibilidade de dados devido a:
1.  **Bloqueio por Imagem**: O arquivo `imagem` é tratado como obrigatório no frontend e no RPC, impedindo o fluxo sem ele.
2.  **Persistência Fantasma**: Sucesso é reportado antes da confirmação real no banco ou com falhas de RLS.
3.  **Invisibilidade do Admin**: Políticas RLS ou falta de propagação de `company_id` impedem a visão global.

## Ações Imediatas

### 1. Banco de Dados: RPC e RLS (Correção de Auditoria)
- **Atualizar RPC `import_client_project`**:
    - Remover `imagem_referencia` da lista de arquivos obrigatórios (`project_required_file_missing`).
    - Garantir que `project_id` e `company_id` sejam persistidos em todas as tabelas: `projects`, `project_files`, `modules`, `parts`, `assembly_groups`, `validation_checks`.
- **Refatorar Políticas RLS**:
    - Garantir que `admin` veja todos os projetos onde `company_id = public.current_company_id()`.
    - Validar permissões para `projetista`, `fabrica` e `montador` conforme a matriz RBAC.
    - Corrigir a função `public.current_company_id()` se ela estiver falhando para o admin.

### 2. Frontend: Fluxo de Importação (Fidelidade Industrial)
- **Ajustar `classifyFolder` e `intakeReady`**:
    - Tornar `classification.image` opcional.
    - Atualizar `requiredFiles` para refletir a nova regra (6 ou 7 arquivos).
- **Endurecimento da Persistência**:
    - Ocultar "Importado com Sucesso" até que uma query real pós-RPC confirme `parts.count > 0` (se XML tiver peças).
    - Exibir "Dashboard Industrial de Importação" com IDs reais e contagem física de registros.

### 3. Componentes: Checklist e Visualização
- **Ajustar `PilotValidationChecklist`**:
    - Remover validação automática ou exigência de imagem se ela não for obrigatória.
- **Auditoria de Admin**:
    - Corrigir queries em `Dashboard` e `Projects` para garantir que o filtro por `company_id` seja rigoroso e não dependa apenas do `created_by`.

## Verificação Industrial (Acceptance Test)
1.  **Importar Pasta "Closet"** (sem imagem).
2.  **Confirmar IDs e Contagens** na tela de sucesso.
3.  **Teste de Persistência (Reload)**: Sair, voltar e recarregar para garantir que os dados não são voláteis.
4.  **Teste de Acesso Admin**: O usuário Administrador deve visualizar o projeto e todos os seus módulos/peças imediatamente.

**REGRA DE OURO**: O sistema não inventa dados. Se o XML diz 10 peças, o banco deve ter 10 peças. Se o banco tem 0, a importação falhou.
