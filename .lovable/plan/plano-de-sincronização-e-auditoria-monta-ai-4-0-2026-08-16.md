# Plano de Sincronização e Auditoria — Monta AI 4.0

O objetivo deste plano é finalizar a sincronização da infraestrutura de banco de dados e auditoria do projeto "Promob Assistant Pro" (ID 5e1598ce-5020-41f1-8d67-19d1bd2c2bf4), garantindo a conformidade com o **Industrial Design System 4.0** e os novos contratos comerciais.

## 1. Infraestrutura de Armazenamento
- Criar o bucket privado `commercial-documents` no Lovable Cloud.
- Este bucket armazenará propostas, contratos e evidências financeiras (PDF/Imagens).

## 2. Sincronização de Banco de Dados (Migrations)
Executar sequencialmente as migrations extraídas do commit `7d5e007`:
- **Migração 02**: Extensão dos fluxos operacionais para o papel de `projetista`.
- **Migração 03**: Implementação da função RPC `create_complete_client_project` (criação atômica de projeto + cliente + endereço + ambientes).
- **Migração 04**: Hardening de evidências industriais (trava de segurança `machining_blocked` vinculada a arquivos técnicos).
- **Migração 05**: Função RPC para importação de saldos legados (`import_legacy_store_credits`).
- **Migração 06**: Refinamento de segurança e validação de tenant (`company_id`) em todas as novas tabelas comerciais.

## 3. Validação e Auditoria Final
Confirmar a existência e o funcionamento dos seguintes componentes no banco:
- Tabela `public.suppliers` (infraestrutura de fornecedores).
- Tabela `public.store_credit_accounts` (gestão de créditos industriais).
- Função `public.import_legacy_store_credits(jsonb)` (migração de dados beta).

## Detalhes Técnicos
- As migrations garantem isolamento total por `company_id`.
- O gatilho `enforce_project_lock_changes` impedirá a liberação de usinagem sem a presença de evidências técnicas (XML/DXF).
- O papel de `projetista` terá permissões equivalentes ao `escritorio` no fluxo de importação e validação técnica.

---
**Aviso:** Nenhuma alteração no código TypeScript ou nas integrações de terceiros (WhatsApp) será realizada nesta etapa. Os dados existentes serão preservados sem reset de banco.
