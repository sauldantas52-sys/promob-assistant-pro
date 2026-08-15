# Plano: Monta AI — Promob Assistant Pro (Consolidação Industrial)

O objetivo é consolidar a plataforma como a solução definitiva para o fluxo Promob, utilizando os dados reais do projeto "Amanda 111" para validar o fluxo de produção e auditoria.

## Análise do Projeto "Amanda 111"
O sistema identificou a seguinte estrutura no arquivo `amanda 111.xml`:
- **Hierarquia Industrial:** 1 Módulo Principal (Armário) com sub-itens (Laterais, Bases, Fundo).
- **Materiais:** Predomínio de MDF Branco 15mm e 6mm.
- **Ferragens:** Kit de 20 dobradiças (Acessórios Avulsos).
- **Segurança:** O sistema aplicou automaticamente `machining_blocked = true` em todas as peças estruturais.

## Ações Propostas

### 1. Reforço de Branding "Promob Assistant"
- Atualizar o Dashboard principal para destacar o status "Promob Assistant Pro Ativo".
- Incluir indicadores de "Saúde do XML" (alertas para medidas inconsistentes ou materiais não cadastrados).

### 2. Fluxo de Importação Wizard 4.0
- Integrar a detecção automática de ambientes do XML (ex: "Cozinhas - Ambiente 3D") para categorizar os módulos no banco de dados.
- Adicionar uma etapa de "Confirmação Técnica" onde o auditor visualiza o resumo de peças (Amanda 111: 5 peças estruturais, 20 ferragens) antes de liberar para o Wallboard.

### 3. Dossiê de Auditoria e QR Code
- Gerar o Dossiê Técnico de Auditoria para o projeto "Amanda 111", consolidando:
  - Mapa de Corte (referenciando o material MDF Branco).
  - Etiquetas Industriais com QR Code para cada peça (Base, Lateral, Fundo).
  - Log de Auditoria registrando o upload e o bloqueio preventivo de usinagem.

## Detalhes Técnicos
- **Segurança:** Manter o isolamento por `company_id` e a trava `machining_blocked`.
- **Integridade:** Validar decimais (ex: 1080,6mm) para evitar erros em máquinas CNC.
- **UI:** Aplicar o "Industrial Design System 4.0" em todas as novas visualizações de dados.
