# Plano de Implementação: Cut Pro Oficial vs Estimativa (Fidelity 4.3)

Este plano estabelece a infraestrutura para importar, persistir e comparar planos de corte oficiais do Cut Pro, mantendo a estimativa interna do Monta AI para auditoria.

## 1. Banco de Dados (Bypass de Segurança Industrial)
- Criar a RPC `save_official_cut_plan` que permite salvar um plano `cutpro_oficial` vinculado a um `project_id`.
- Garantir que apenas um plano seja marcado como `is_official = true` por projeto.
- Preservar o histórico de importações.

## 2. Interface de Upload (Fluxo de Importação)
- Adicionar uma sub-aba ou modal em `PreliminaryCutPlanTab` para upload de arquivos do Cut Pro.
- Implementar suporte inicial para CSV/TXT (formatos comuns de exportação do Cut Pro).
- Vincular o arquivo ao `project_files` com `file_type = 'cutpro_oficial'`.

## 3. Parser Industrial (Cut Pro)
- Implementar `CutProParser` em `src/lib/cut-plan/parsers.ts`.
- Extrair: Chapas, Cortes, Peças (vinculadas pelo `physicalId`/`idXml`), Aproveitamento.
- Regra de expansão: Não aplicar `REPETITION` se o arquivo já trouxer peças físicas.

## 4. Visualização e Comparação
- Atualizar `PreliminaryCutPlanTab.tsx` para permitir alternar entre "Estimativa Monta AI" e "Cut Pro Oficial".
- Criar o componente `CutPlanComparisonCard.tsx` para mostrar o Delta entre Estimado e Oficial:
    - Delta de Chapas
    - Delta de Aproveitamento
    - Delta de Peças (Conferência 1:1)

## 5. Precedência Operacional
- Quando um plano oficial existir e for válido, ele será o padrão para a aba de etiquetas e wallboard de produção.
- Manter o aviso visual: "CUT PRO OFICIAL" vs "ESTIMATIVA MONTA AI".

## Detalhes Técnicos
- **Tabelas**: `cut_plans` (is_official, source), `cut_sheets`.
- **Fidelidade**: Comparação por grupo (Material + Espessura).
- **Integridade**: Validação de 409 peças para o projeto Closet.
