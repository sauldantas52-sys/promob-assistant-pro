# Plano de Teste Operacional: Liberação Parcial e Gates Industriais

Este plano descreve o teste real do fluxo de segurança 4.0, validando a integridade dos bloqueios industriais e o registro de auditoria para liberações parciais.

## Objetivos
1. Validar que o **Gate 1** permite liberação de Corte/Borda somente após preenchimento dos requisitos.
2. Confirmar o registro obrigatório de auditoria (usuário, data, motivo) em `production_logs` na liberação parcial.
3. Garantir que o **Gate 2** mantém o `machining_blocked = true` e impede o avanço para Usinagem sem documentação técnica.
4. Validar que o **Gate 3** bloqueia a Montagem até a conferência física total.

## Ações Técnicas

### 1. Preparação de Dados (Seeder)
- Atualizar `src/lib/seeder.functions.ts` para criar um projeto de demonstração com o status "pilot" e todos os checks de validação zerados.
- Garantir que o projeto comece com `machining_blocked: true`.

### 2. Script de Teste Automatizado (Playwright)
Criar `/tmp/browser/audit/test_industrial_gates.py` para executar os seguintes passos:
1. **Login como Administrador**.
2. **Acesso ao Projeto de Teste**.
3. **Teste Gate 1 (Corte e Borda)**:
   - Marcar XML, Lista, DXF e Material.
   - Verificar se o botão de "Liberação Parcial" aparece.
   - Tentar liberar sem justificativa (deve falhar/bloquear).
   - Inserir justificativa e confirmar.
   - Validar entrada no log de produção.
4. **Teste Gate 2 (Usinagem)**:
   - Tentar avançar o status para "Usinagem" na fila de produção (deve estar bloqueado).
   - Verificar na aba Engenharia que o bloqueio CNC continua ativo.
   - Marcar apenas 1 item do Gate 2 e revalidar o bloqueio.
5. **Teste Gate 3 (Montagem)**:
   - Tentar acessar a aba de montagem/caderno mobile (deve exibir aviso de bloqueio).

## Critérios de Aceite
- [ ] O sistema impede avanço de status sem os checks correspondentes.
- [ ] A liberação parcial exige justificativa > 10 caracteres.
- [ ] `production_logs` contém o JSON com metadados do Gate 1.
- [ ] O campo `machining_blocked` permanece `true` durante todo o teste do Gate 2 incompleto.
- [ ] Nenhuma etapa é liberada indevidamente por erro de lógica ou bypass visual.
