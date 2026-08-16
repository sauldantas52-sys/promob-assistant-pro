# Plano de Correção e Auditoria Industrial 4.0 - Pasta do Cliente

O objetivo deste plano é garantir que o sistema Monta AI deixe de ser apenas visual e passe a ser alimentado de forma persistente e tecnicamente rigorosa pela Pasta do Cliente, seguindo a regra absoluta de não inferir ou inventar dados.

## Auditoria e Mapeamento do Erro Atual
A investigação inicial aponta que:
- **Parser XML**: Está perdendo metadados críticos como `REPETITION` e `UNIQUEPARENTID`, além de não mapear corretamente o `TEXTDIMENSION` quando atributos `WIDTH/HEIGHT` falham.
- **RPC `import_client_project`**: A versão atual do banco pode estar dessincronizada com o payload enviado pelo frontend (especialmente no objeto `summary` e campos de metadados das peças).
- **Persistência**: O componente de importação não está validando a contagem de registros persistidos no banco antes de dar sucesso, permitindo "sucessos falsos" por estados locais.
- **Checklist**: O trigger de automação `auto_process_project_gates` precisa de evidências reais vinculadas para que o Dashboard reflita a verdade industrial.

## Etapas de Implementação

### 1. Reforço do Banco de Dados (Migrations)
- Atualizar `import_client_project` para persistir metadados técnicos completos das peças.
- Garantir que as `policies` permitam o fluxo de importação sem falhas de `permission denied`.
- Criar a tabela `project_import_audit` ou similar se necessário para o relatório final.

### 2. Correção do Parser Industrial (`src/lib/promob-import.ts`)
- Mapeamento total dos atributos exigidos: `REPETITION`, `UNIQUEPARENTID`, `UNIT`, etc.
- Implementação de lógica rigorosa para `Base 15` e `Lateral 18` conforme exemplo do usuário.
- Registro completo do arquivo `.promob` como anexo vinculado.

### 3. Ajuste do Fluxo de Importação (`src/routes/_authenticated.projects.import.tsx`)
- Adição da etapa de Auditoria Real pós-RPC.
- Verificação de `storage_status` e contagem de linhas inseridas via `select count(*)`.
- Exibição de erros reais vindos do PostgreSQL sem silenciamento.

### 4. Fidelidade DXF e 3D (`src/lib/dxf-parser.ts` e `Technical3DView.tsx`)
- Garantir que a geometria é 1:1 com o arquivo da Pasta do Cliente.
- Remoção de qualquer fallback visual estimativo.

## Teste Real de Aceite (CLOSET 18-07-2026)
- Validação da estrutura: CLOSET-18-07-2026.xml + PRODUÇÃO.promob + PRODUÇÃO.dxf + PDFs.
- Confirmação de que após sair e voltar do projeto, os dados continuam no banco.

## Detalhes Técnicos
- **RPC**: `public.import_client_project(uuid, jsonb, jsonb, jsonb, jsonb)`
- **RLS**: Validação por `company_id` e permissão `projects.import`.
- **Parser**: Extensão de `metadata` nas tabelas `modules` e `parts`.
