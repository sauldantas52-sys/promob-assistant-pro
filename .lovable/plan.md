# Plano de Reorganização e Refinamento do Monta AI

Reorganizar o fluxo de importação e revisar toda a interface do Monta AI para o padrão "Industrial Design System 4.0", garantindo clareza operacional e segurança técnica.

## 1. Fluxo de Importação Assistida
Criar um novo fluxo de importação em 4 etapas (Identificação, Arquivos, Conferência, Finalização) e integrá-lo ao Dashboard e à listagem de projetos.

- **Dashboard:** Adicionar botão principal "IMPORTAR PROJETO" no topo e um card direto "IMPORTAR XML, DXF OU PDF".
- **Nova Rota:** `src/routes/_authenticated.projects.import.tsx` com o formulário em etapas:
    - **Etapa 1 (Identificação):** Dados básicos (Nome, Cliente, Ambiente, Responsável, Notas).
    - **Etapa 2 (Arquivos):** Campos separados para XML (obrigatório), DXF (opcional), PDF (opcional) e Imagens. Validação imediata do XML.
    - **Etapa 3 (Conferência):** Resumo técnico dos dados extraídos (Módulos, Peças, Materiais) com badges de status (CONFIRMADO, ESTIMADO, BLOQUEADO).
    - **Etapa 4 (Criação):** Processamento final e redirecionamento para a aba de Engenharia do projeto criado.

## 2. Refinamento da Interface (Industrial 4.0)
Revisar a hierarquia visual e tipografia em todas as rotas principais.

- **Tipografia:** Ajustar tamanhos responsivos (Títulos Desktop: 48-56px, Seção: 28-36px).
- **Cores:** Padronizar azul industrial (ações), verde (concluído), âmbar (atenção) e vermelho (bloqueio). Fundo claro em telas operacionais e escuro no Wallboard.
- **AppShell/Menu:** Adicionar "Nova Importação" em Projetos.

## 3. Gates Industriais e Segurança
Reforçar os bloqueios técnicos conforme a especificação.

- **Gate 1 (Corte/Borda):** Exigir XML, Lista de Corte e Materiais. Registrar motivo de liberação parcial.
- **Gate 2 (Usinagem):** Bloqueio estrito de usinagem CNC sem PDF/DXF técnico. `machining_blocked = true` por padrão.
- **Barra de Etapas:** Implementar componente de progresso industrial (Importação -> Engenharia -> Gate 1 -> ... -> Expedição).

## Detalhes Técnicos
- Utilizar `createServerFn` para processamento pesado e logs de auditoria.
- Preservar RLS, RBAC e `company_id`.
- Atualizar `src/components/AppShell.tsx` para refletir as novas opções de menu.
- Modificar `src/routes/_authenticated.projects.index.tsx` para integrar o novo fluxo.
- Refinar `src/routes/_authenticated.dashboard.tsx` com os novos indicadores e ações rápidas.
- Ajustar `src/styles.css` para os novos padrões de tipografia responsiva.

---
Veredito: **Aprovado para Piloto Controlado.**
