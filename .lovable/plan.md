# Plano de Finalização Industrial Monta AI 4.0

Este plano detalha a implementação do fluxo de conferência física, geração de relatórios consolidados e notificações em tempo real para o piloto controlado na fábrica.

## 1. Fluxo de Checklist Físico (Ponte Operacional)
Expandir o `PilotValidationChecklist` para incluir campos obrigatórios de validação física e status por etapa, criando uma ponte entre o escritório e o chão de fábrica.

- **Status da Etapa:** Adicionar `status` (pendente, em_validacao, concluido) para cada Gate.
- **Campos Obrigatórios:** Adicionar campos para foto da peça/etiqueta, nome do operador responsável e observações técnicas.
- **Armários (Módulos):** Permitir a validação individual por módulo (G1, G2, G3) dentro do checklist.

## 2. Geração de PDF Consolidado (Auditoria Industrial)
Implementar a geração real de documentos PDF que consolidam os dados de engenharia, orçamento e conferência física.

- **Relatório de Auditoria:** Documento consolidado com metadados do projeto, XML/SKP importado, logs de gates e travas de segurança.
- **Checklist do Piloto:** Relatório das evidências físicas coletadas durante o teste na fábrica.
- **Integração:** Adicionar um botão "Baixar Dossiê Completo" que gera um único arquivo PDF com todas as informações.

## 3. Notificações em Tempo Real (Gestão 4.0)
Implementar um sistema de avisos para manter a equipe informada sobre o progresso e exceções.

- **Gates Concluídos:** Notificar o escritório quando a Fábrica validar o Gate 1 ou Gate 2.
- **Exceções:** Alerta imediato quando uma peça for rejeitada ou houver divergência de medida.
- **Mudança de Status:** Notificar quando o projeto avançar de status (ex: de Engenharia para Produção).

## Detalhes Técnicos

### Banco de Dados
- Criar tabela `physical_pilot_checks` para armazenar evidências (fotos, nomes de operadores).
- Criar tabela `notifications` para gerenciar os alertas em tempo real via Supabase Realtime.
- Adicionar campos `status` e `evidence_url` à tabela `validation_checks`.

### Frontend
- **Componente:** `src/components/PhysicalChecklistFlow.tsx` para o fluxo de fábrica.
- **Hook:** `useNotifications` para exibir toasts e alertas em tempo real.
- **Server Function:** Expandir `src/lib/audit-report.functions.ts` para gerar PDF real (usando templates HTML to PDF).

### Segurança
- Manter `machining_blocked = true` até que o checklist físico do Gate 2 seja 100% validado.
- Exigir perfil `fabrica` ou `admin` para validar evidências físicas.
