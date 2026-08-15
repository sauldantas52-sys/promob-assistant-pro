# Plano: Análise de XML Promob e Relatório Técnico

O objetivo é processar o arquivo `amanda 111.xml` para extrair os metadados industriais e apresentar uma visão técnica clara do projeto para o usuário.

## Análise do Arquivo `amanda 111.xml`
- **Projeto:** Amanda 111 (identificado via `user-uploads://amanda_111-2.xml`).
- **Data/Hora:** 13/08/2026 às 19:50:31.
- **Sistema:** Promob Plus Enterprise (Versão 5).
- **Ambientes:** 2 ambientes (Cozinhas - Ambiente 3D).
- **Conteúdo Identificado:**
  - Módulos de Dormitórios (Armários, Bases Lineares, Laterais).
  - Peças em MDF (Branco 15mm e 6mm).
  - Ferragens (Dobradiças Aço sem amortecedor).
  - Fitas de borda (0.4mm).

## Ações Propostas

### 1. Extração e Resumo de Engenharia
- Utilizar o parser industrial `parseProjectFile` para converter o XML em uma estrutura de dados operacional.
- Identificar a hierarquia: Projetos -> Ambientes -> Módulos -> Peças.

### 2. Geração de Relatório de Dossiê (Audit Report)
- Criar uma prévia do dossiê técnico que será gerado pelo sistema:
  - **Identificação:** Projeto Amanda 111.
  - **Trava de Segurança:** `machining_blocked = true` (Garantindo que nenhuma peça seja enviada para a CNC sem conferência).
  - **Lista de Materiais:** MDF Branco 15mm e 6mm.
  - **Componentes:** 1 Módulo "Armário" com bases e laterais.

### 3. Visualização de Metadados Industrial 4.0
- Apresentar ao usuário uma representação visual (via log do sistema ou interface de importação) do que o sistema "vê":
  - **Dimensões:** 700 x 2200 x 350 mm (Armário).
  - **Peças:** Base Linear, Lateral, Fundo.
  - **Ferragens:** Dobradiças UN 20x.

## Detalhes Técnicos
- O processamento respeitará as regras de negócio de `company_id` e RLS.
- O campo `machining_blocked` será mantido como `true` por padrão.
