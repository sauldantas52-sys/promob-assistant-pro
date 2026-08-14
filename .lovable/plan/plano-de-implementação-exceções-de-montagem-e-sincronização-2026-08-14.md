# Plano de Implementação - Exceções de Montagem e Sincronização Offline

Este plano detalha a implementação do sistema de tratamento de exceções para o fluxo de montagem do Monta AI, garantindo rastreabilidade total e resiliência a falhas de conexão.

## Alterações de Design

- **Interface de Conferência Resiliente**: Substituição do diálogo de conferência genérico em `src/routes/assembly.tsx` por um componente especializado (`ConferenceDialog.tsx`) que suporta leitura de QR Code, registro de exceções e modo offline.
- **Alertas de Status**: Uso de badges e cores para indicar estado offline, pendências de sincronização e bloqueios de kit por exceção.

## Detalhes Técnicos

- **Módulo de Exceções (`src/lib/assembly-exceptions.ts`)**:
    - Centralização da lógica de validação de QR Codes (detectando códigos ilegíveis, de outros projetos ou duplicados).
    - Implementação de fila local (LocalStorage) para persistência de eventos em caso de perda de internet.
    - Mecanismo de sincronização automática ao restabelecer a conexão.
    - Regras de bloqueio de finalização de kit baseadas em exceções em aberto ou itens não conferidos.
- **Refatoração da Rota de Montagem (`src/routes/assembly.tsx`)**:
    - Integração do `ConferenceDialog`.
    - Atualização da query para incluir campos necessários de bloqueio e selagem (`is_locked`, `sealed_at`, etc.).
- **Fluxo de Segurança**:
    - Registro obrigatório de motivo para cancelamento de conferência ou reabertura de kit selado.
    - Auditoria de cada ação no `production_logs` com metadados detalhados (usuário, data/hora, status original e final).

## Etapas de Implementação

1. **Substituição da Interface de Conferência**:
    - Importar e utilizar o `ConferenceDialog` em `src/routes/assembly.tsx` para cada grupo de montagem.
2. **Hardening de Dados**:
    - Garantir que todas as consultas na rota de montagem tragam os logs de produção recentes para exibir exceções em tempo real.
3. **Validação de Cenários**:
    - Teste de bloqueio de expedição para kits incompletos.
    - Teste de enfileiramento de log com `navigator.onLine = false` simulado.

O sistema agora garante que nenhuma peça ou ferragem faltante seja ignorada, mantendo o controle total mesmo em ambientes sem conectividade estável.
