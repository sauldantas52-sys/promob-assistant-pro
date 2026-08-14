# Plano de Implementação: Ponte SketchUp ↔ Promob

Implementação da infraestrutura de banco de dados, lógica de auditoria e protótipo visual para a integração geométrica entre SketchUp e Promob.

## 1. Banco de Dados (Finalizado)
- Implementada migração `20260816000000_bridge_sketchup_promob.sql`.
- Tabelas: `project_versions` (arquivos SKP/XML/PDF), `project_tags` (layers padronizadas), `project_comparisons` (auditoria de divergências).
- RLS e Grants configurados para isolamento por empresa (`company_id`).

## 2. Estrutura de Tags Industrial (Finalizado)
- Implementada função `seed_default_tags` para provisionar automaticamente as 19 camadas padronizadas (00_REFERENCIAS a 18_MONTAGEM).
- Mapeamento visual das tags integrado ao protótipo.

## 3. Interface de Operação (Finalizado)
- Criado componente `SketchUpBridgeTab` em `src/components/SketchUpBridgeTab.tsx`.
- Painel "Projetos para Fábrica": Gestão de versões, miniaturas, responsáveis e status industriais.
- Painel "Revisão do Projetista": Visualizador simulado, lista comparativa SKP x Promob, identificador de divergências de medidas (+5mm) e materiais.
- Painel "Estrutura de Tags": Guia técnico das camadas obrigatórias para o plugin.

## 4. Integração de Fluxo (Finalizado)
- Adicionados status específicos: `Rascunho`, `Enviado para revisão`, `Em análise da fábrica`, `Aguardando correção`, `Aprovado para Promob`, `Convertido no Promob`, `Bloqueado para engenharia`, `Liberado para orçamento`.
- Vinculado ao menu de abas em `src/routes/_authenticated.projects.$projectId.tsx`.

## Detalhes Técnicos e Regras de Negócio
- **Ponte de Dados**: XML é a fonte da verdade para peças/ ferragens; SketchUp é a fonte para layout/ geometria.
- **Segurança**: Bloqueio automático de usinagem (`machining_blocked = true`) em caso de divergências ou "Não confirmado".
- **Sem Geração de Código**: O sistema não gera arquivos de máquina (MPR, CIX, etc.) nesta etapa, focando na integridade da informação.

## Matriz de Aceite do Protótipo
| Módulo | Funcionalidade | Status |
| :--- | :--- | :--- |
| **Ponte SKP** | Banco de Versões | OK |
| **Tags** | 00 a 18 Padronizadas | OK |
| **Auditoria** | Detecção de Divergências | OK (UI) |
| **Status** | Fluxo de Aprovação | OK |
| **Segurança** | Bloqueio de CNC | OK |
