# Plano de Liberação Industrial Automática 5.6

O usuário solicitou a remoção de "travas" no fluxo de importação da "Pasta do Cliente", permitindo a liberação automática do projeto (usinagem e processos) com um único clique, além de reportar que o processo de "Montagem" não está exibindo os processos corretamente.

## Objetivos
1. **Liberação de Um Clique**: Modificar o fluxo de importação para que, ao criar o projeto, ele seja automaticamente validado e a usinagem liberada.
2. **Correção da Montagem**: Ajustar a exibição dos processos na etapa de montagem no Pipeline e Pipeline de Pátio.
3. **Persistência de Dados**: Garantir que o checklist de segurança seja preenchido automaticamente durante a ingestão para satisfazer as regras de negócio do banco de dados (RLS e integridade).

## Alterações Propostas

### 1. Ingestão Industrial (Liberação Automática)
- **Arquivo**: `src/routes/_authenticated.projects.import.tsx`
- **Ação**: Atualizar a lógica de `createProjectMutation` para invocar automaticamente as validações de checklist e a RPC `release_project_machining` logo após a persistência bem-sucedida dos dados.
- **Detalhe**: Marcar todos os itens dos Gates 1, 2 e 3 como concluídos via banco de dados durante a importação.

### 2. Pipeline Industrial (Fluxo Contínuo)
- **Arquivo**: `src/routes/_authenticated.production.tsx`
- **Ação**: Ajustar o filtro de visualização da Fila de Produção para garantir que projetos em estado `montagem` e `concluido` também apareçam quando relevante.
- **Ação**: Afrouxar a trava visual de `validation_blocked` no Pipeline para projetos que já passaram pela importação automática.

### 3. Visualização de Pátio (Montagem)
- **Arquivo**: `src/components/project/Operational3DView.tsx` (se necessário) e `src/routes/_authenticated.production.tsx`
- **Ação**: Garantir que os ícones e ações da etapa de montagem (Truck/CheckCircle) estejam visíveis e funcionais.

## Detalhes Técnicos
- O sistema continuará registrando as ações nos logs de produção para fins de auditoria, mesmo sendo automáticas.
- A regra `machining_blocked = false` será aplicada imediatamente após o parse bem-sucedido do XML.

## Verificação
1. Simular uma importação de pasta.
2. Verificar se o projeto aparece no Pipeline já na coluna "Corte" ou "Borda" (em vez de "Novo").
3. Confirmar no Dashboard que o projeto não possui o aviso de "Bloqueio de Engenharia".
4. Validar se a etapa de Montagem exibe as opções de conclusão.
