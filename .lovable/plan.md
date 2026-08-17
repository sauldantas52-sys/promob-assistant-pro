---
title: "Correção de Fluxo e Saneamento Industrial 4.0"
description: "Auditoria, limpeza e correção do motor de ingestão industrial para garantir persistência 100% fiel e visibilidade operacional."
type: feature
---

# Plano de Consolidação e Saneamento Industrial

O sistema apresenta uma divergência entre o que é processado no frontend e o que é persistido no banco de dados, resultando em "vácuos operacionais" onde os dados parecem sumir após a importação. Este plano foca na correção da raiz técnica do motor de ingestão e na limpeza de dados inconsistentes.

## 1. Saneamento de Dados (Auditoria)
- **Limpeza de Testes Inconsistentes**: Identificar e remover projetos com `parts_count = 0` ou `item_count = 0` que poluem o dashboard.
- **Marcação Amanda 111**: Garantir que o projeto "Amanda 111" esteja marcado como `is_test = true` para isolamento.

## 2. Refatoração do Motor de Ingestão (`ingest_and_distribute_project`)
- **Unificação de Versões**: O banco de dados possui múltiplas versões da função `ingest_and_distribute_project`. Vamos consolidar em uma única versão robusta que:
    - Receba `_project_id`, `_modules` (JSONB) e `_loose_parts` (JSONB).
    - Aplique o `machining_blocked = true` por padrão (conforme regra de segurança).
    - Garanta que a `project_distribution` seja populada com `status = 'conferencia_pendente'` para forçar o fluxo de validação.
- **Correção de Tipagem**: Garantir o cast correto para `NUMERIC` e `INTEGER` evitando falhas silenciosas na persistência.

## 3. Visibilidade Industrial (Dashboard & Wallboard)
- **Dashboard Operacional**: Ajustar as queries para filtrar `is_test = false` por padrão, mantendo o foco na produção real.
- **Wallboard Industrial**: Garantir que o Wallboard reflita a matriz de distribuição real em vez de apenas o status geral do projeto.

## 4. Validação de Persistência no Importador
- **Wizard Industrial**: Adicionar uma etapa de "Confirmação de Escrita" no final do processo de importação que realiza um `SELECT count` real no banco antes de dar o "OK" ao usuário.

## Detalhes Técnicos
- Migration SQL para consolidar a função `ingest_and_distribute_project`.
- Ajuste no componente `ImportPage` para lidar com a nova assinatura da função.
- Refinamento das RLS para garantir que Admins vejam todos os dados de distribuição da empresa.
