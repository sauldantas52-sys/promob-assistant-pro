# Plano Industrial: Integração de Arquivos e Dossiê de Auditoria

O objetivo é aprimorar a interface de importação para que o sistema reaja imediatamente ao upload do XML do Promob e consolidar o dossiê técnico de auditoria.

## Ações Propostas

### 1. Automação da Importação Assistida
- Modificar `src/routes/_authenticated.projects.import.tsx` para que a seleção do arquivo XML dispare automaticamente o avanço para a etapa de processamento.
- Implementar a detecção imediata de arquivos complementares (PDF/DXF) durante o upload do XML.

### 2. Dossiê de Auditoria Industrial 4.0
- Refinar a função `generateAuditReport` em `src/lib/audit-report.functions.ts` para incluir a consolidação de metadados industriais:
  - Lista de Peças (Extraída do XML).
  - Status dos Gates de Segurança (machining_blocked).
  - Evidências do Piloto Físico (physical_pilot_checks).
  - Logs de Auditoria (production_logs).

### 3. Refinamento Visual Operacional
- Padronizar os elementos de feedback (toasts e loaders) para o padrão Industrial Design System 4.0.
- Garantir que a trava `machining_blocked = true` seja visível e auditável no dossiê gerado.

## Detalhes Técnicos
- Utilizar `useMutation` para garantir a atomicidade da criação do projeto e inserção de módulos/peças.
- Manter o isolamento por `company_id` através do middleware de autenticação.
- Assegurar compatibilidade com o runtime do Cloudflare Worker (evitando bibliotecas Node-only para geração de PDF).
