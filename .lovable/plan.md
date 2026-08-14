# Plano de Acesso Seguro e Gestão de Usuários - Monta AI

Este plano detalha a implementação do acesso inicial seguro, fluxo de onboarding de administrador e gestão de usuários baseada em perfis industriais, mantendo RLS e isolamento por empresa.

## Alterações de Banco de Dados (Supabase)

1.  **Novas Colunas em `profiles`**:
    *   `must_change_password` (boolean, default true): Obriga a troca de senha no primeiro login.
    *   `email_confirmed_at` (timestamp): Para rastreio interno adicional se necessário.
    *   `first_login_at` (timestamp): Registra quando o usuário acessou pela primeira vez.
2.  **Logs de Produção**:
    *   Garantir que `production_logs` aceite registros de "Acesso Inicial" e "Troca de Senha".
3.  **Políticas RLS**:
    *   Restringir acesso operacional se `profiles.must_change_password` for true.
    *   Permitir que apenas `admin` e `escritorio` (com permissão) convidem novos usuários.

## Backend (Server Functions & Auth)

1.  **Middleware de Autenticação**:
    *   Atualizar `AuthProvider` e o layout `_authenticated` para verificar `must_change_password`.
    *   Redirecionar para uma nova tela `/force-password-change` se necessário.
2.  **Gestão de Usuários (Admin)**:
    *   `inviteUser`: Função de servidor que usa `supabaseAdmin` para criar o usuário no Auth, atribuir `company_id`, definir o perfil e enviar convite.
    *   `resetUserPassword`: Função para disparar e-mail de recuperação para subordinados.
3.  **Segurança**:
    *   Nunca retornar hashes de senha ou senhas em texto plano.
    *   Validação de e-mail obrigatória via Supabase Auth.

## Frontend (UI/UX)

1.  **Tela de Primeiro Acesso**:
    *   Fluxo de troca de senha obrigatória com validação de força.
2.  **Painel de Usuários (Configurações)**:
    *   Lista de usuários da empresa.
    *   Formulário de convite com seleção de perfil (Escritório, Fábrica, Montador, Auditor).
    *   Status do convite (Pendente/Ativo).

## Detalhes Técnicos

```text
Entidade: profiles
  - must_change_password: boolean
  - first_login_at: timestamptz

Fluxo de Convite:
  1. Admin preenche E-mail + Nome + Perfil.
  2. Server Function cria user no Auth (sem senha ou senha temporária aleatória forte).
  3. Insere em profiles e user_roles.
  4. Supabase envia convite de confirmação.
```

## Próximos Passos

1. Criar migração SQL para colunas de segurança.
2. Implementar rota `/_authenticated/force-password-change`.
3. Criar painel de Gestão de Usuários em `/_authenticated/settings/users`.
4. Implementar Server Functions para convites seguros.
