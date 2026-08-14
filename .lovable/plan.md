# Plano de Ajuste de Validação de Senha - Monta AI

Este plano detalha a flexibilização temporária da validação de senha para o período de piloto, mantendo a rastreabilidade e preparando o sistema para produção.

## Alterações em Configuração

1.  **Centralização de Regras**:
    *   Criar `src/lib/auth-config.ts` para centralizar as constantes de validação (`MIN_PASSWORD_LENGTH`, `MAX_PASSWORD_LENGTH`, `PILOT_MODE`).
    *   Definir `MIN_PASSWORD_LENGTH = 4` (Piloto) e `RECOMMENDED_PASSWORD_LENGTH = 8` (Produção).

## Alterações no Frontend

1.  **Componente de Login (`src/routes/login.tsx`)**:
    *   Ajustar `handleSignUp` para validar entre 4 e 20 caracteres.
    *   Adicionar aviso visual (não bloqueante) se a senha for `< 8` caracteres.
2.  **Troca de Senha Obrigatória (`src/routes/_authenticated.force-password-change.tsx`)**:
    *   Atualizar lógica de validação no `handleSubmit`.
    *   Exibir alerta de "Senha Curta (Modo Piloto)" se entre 4 e 7 caracteres, mas permitir submissão.
    *   Garantir que o `Input` permaneça como `type="password"`.

## Auditoria e Logs

1.  **Logs de Auditoria**:
    *   Garantir que em `inviteUser` (Server Fn) e nas telas de alteração, a ação seja registrada em `production_logs`.
    *   Incluir no log se a senha utilizada estava abaixo do recomendado (8 chars) para análise de risco futura.

## Segurança

*   **Integridade**: Manter o uso de `supabase.auth.updateUser` e `supabase.auth.signUp`.
*   **Visibilidade**: As senhas nunca serão exibidas ou registradas nos logs (apenas o evento de alteração).

## Detalhes Técnicos

```typescript
// src/lib/auth-config.ts
export const AUTH_CONFIG = {
  PILOT_MODE: true,
  MIN_PASSWORD_LENGTH: 4,
  RECOMMENDED_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 20
};
```

## Próximos Passos

1. Criar `src/lib/auth-config.ts`.
2. Refatorar `src/routes/login.tsx` (Cadastro).
3. Refatorar `src/routes/_authenticated.force-password-change.tsx` (Troca Obrigatória).
4. Validar fluxo de log de auditoria.
