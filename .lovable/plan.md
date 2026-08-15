# Plano de Aprimoramento Visual e Funcional — Projetos e Importação Promob

Este plano detalha o redesenho da tela de Projetos e a implementação completa do fluxo de importação assistida de arquivos XML do Promob, seguindo os padrões do **Industrial Design System 4.0**.

## 1. Melhoria Visual (Industrial Design System 4.0)
- **Cabeçalho:** Aumento da hierarquia visual com títulos em 8rem (uppercase, black) e espaçamentos amplos (p-16).
- **Cards de Projeto:** Redesenho com bordas `rounded-[4rem]`, sombras suaves e indicadores de status pulsantes.
- **Paleta de Cores:** Verde (Concluído), Azul (Andamento/Novo), Amarelo (Atenção/Borda), Vermelho (Bloqueio/Corte/Usinagem).
- **Tipografia:** Uso rigoroso de SF Pro Display para títulos e Inter para dados técnicos, com tracking espaçado em metadados.

## 2. Fluxo de Importação Assistida (Wizard)
Implementação de um assistente de 4 etapas em `src/routes/_authenticated.projects.import.tsx`:
1.  **Identificação:** Coleta de Nome, Cliente e Ambiente.
2.  **Arquivos:** Upload obrigatório de XML Promob (com validação de formato) e opcionais (DXF, PDF).
3.  **Processamento:** Uso do `parsePromobXml` para extrair módulos e peças.
4.  **Revisão e Confirmação:** Exibição do resumo técnico antes da persistência no banco de dados.

## 3. Integração de Dados e Tratamento de Erros
- **Persistência:** Criação do projeto e inserção em massa de módulos e peças via Supabase.
- **Tratamento de Erros:** Feedback em tempo real via `sonner` para arquivos inválidos, falta de XML ou falha na API.
- **Gate Industrial:** Garantia de que todo projeto importado inicie com `machining_blocked = true` e status `novo`.

## Detalhes Técnicos
- **Componentes:** Atualização de `src/routes/_authenticated.projects.index.tsx` e finalização de `src/routes/_authenticated.projects.import.tsx`.
- **Lógica de Importação:** Expansão da lógica de salvamento para incluir a hierarquia Completa (Projeto -> Módulos -> Peças).
- **Segurança:** Validação de permissões RBAC (`import`) antes de exibir a interface de upload.

---
*Veredito Técnico: Sistema aprovado para avanço operacional com travas de segurança CNC preservadas.*
