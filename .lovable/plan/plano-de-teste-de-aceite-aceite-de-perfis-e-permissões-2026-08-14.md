# Plano de Teste de Aceite (Aceite de Perfis e Permissões)

Este plano descreve a execução do teste de aceite funcional para validar o RBAC (Controle de Acesso Baseado em Função) e a integridade operacional do sistema Monta AI.

## Objetivos
1. Validar o acesso granular por perfil (Admin, Escritório, Fábrica, Montador, Auditor).
2. Confirmar a proteção de rotas e o redirecionamento automático.
3. Verificar a aplicação de RLS (Row Level Security) por `company_id`.
4. Validar o registro de logs de auditoria com o `user_id` correto.
5. Simular o uso em diferentes dispositivos (Celular para Montador, Tablet/TV para Fábrica).
6. Garantir que o Auditor tenha acesso exclusivo de leitura.
7. Assegurar que a Expedição não acesse funções administrativas.

## Matriz de Permissões Esperada

| Recurso | Admin | Escritório | Fábrica | Montador | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Dashboard | Geral | Geral | Operacional | Montagem | Leitura |
| Projetos (Ver) | Sim | Sim | Não | Não | Sim |
| Projetos (Editar/Importar) | Sim | Sim | Não | Não | Não |
| Produção/Fila | Sim | Ver | Sim | Não | Ver |
| Engenharia/CNC | Sim | Sim | Não | Não | Ver |
| Montagem/Conferência | Sim | Ver | Não | Sim | Ver |
| Expedição/Logística | Sim | Ver | Sim | Não | Ver |
| Logs de Auditoria | Sim | Não | Não | Não | Sim |

## Etapas de Execução

### 1. Preparação do Ambiente
- Criar script de automação Playwright para simular múltiplos usuários.
- Utilizar `lovable auth-session` para alternar entre contextos de teste.
- Garantir que cada usuário pertença a uma `company_id` específica para validar isolamento.

### 2. Testes de Acesso e Interface
- **Admin**: Validar acesso total e menu completo.
- **Escritório**: Confirmar importação de XML Promob e bloqueio de ações na fábrica.
- **Fábrica**: Validar visualização de TV (Wallboard) e registro de progresso em tablets.
- **Montador**: Simular viewport de celular (375x812) e conferência via QR Code.
- **Auditor**: Tentar realizar alterações em dados técnicos e confirmar o bloqueio (Read-Only).

### 3. Testes de Segurança e RLS
- Tentar acessar `projectId` de outra empresa via URL direta.
- Verificar se `production_logs` registra o `user_id` real do executor da ação.
- Validar redirecionamento de `/dashboard` para `/login` ao limpar a sessão.

### 4. Relatório Final
- Apresentar a matriz de conformidade preenchida com os resultados reais observados.

## Detalhes Técnicos
- **Ferramentas**: Playwright (Python), Supabase CLI (para verificação de RLS), TanStack Router (Guards).
- **Scripts**: `/tmp/browser/acceptance-test/rbac_validation.py`.
