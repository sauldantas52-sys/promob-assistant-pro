# Plano de Auditoria de Fidelidade Industrial 4.0

O objetivo é ajustar o parser `src/lib/promob-import.ts` para alinhar com o gabarito real do arquivo `CLOSET-18-07-2026.xml` e fornecer a evidência numérica solicitada via banco de dados e UI.

## Alterações no Parser (`src/lib/promob-import.ts`)

### 1. Ajuste de Tags de Chapa
- Ignorar `LARGURA_CHAPA` e `ALTURA_CHAPA` (contêm lixo "YYY"/"OOO").
- Utilizar `MAXWIDTH` (2750) e `MAXDEPTH` (1830) para dimensões de chapa se necessário.

### 2. Lógica de Peças Físicas e Repetição
- Garantir que `repetition` seja tratado como multiplicador de peças físicas.
- As 275 linhas de MDF devem resultar em 409 peças físicas.

### 3. Classificação e Contagem
- Revisar a classificação de `ITEM` para garantir que apenas itens válidos (MDF, Ferragem, Acessório) sejam contados, zerando "NÃO CLASSIFICADOS".
- Validar contagem de módulos (13) e itens raiz (45).

## Alterações na Interface de Auditoria (`src/routes/_authenticated.projects.test-import.tsx`)

- Adicionar a tabela de agrupamento por Cor e Espessura com o gabarito esperado:
  - Branco 15mm = 274 peças
  - Branco 18mm = 86 peças
  - Branco 6mm = 48 peças
  - Floraplac.Almeria 6mm = 1 peça
- Adicionar contagem de fitas (sem_fita = 62, total = 275).

## Evidência Numérica (Gabarito vs Resultado)

| Métrica | Gabarito |
| :--- | :--- |
| Elementos `<ITEM>` | 352 |
| Linhas MDF com THICKNESS | 275 |
| Peças físicas (com REPETITION) | 409 |
| Módulos reconhecidos | 13 |
| Linhas MDF nos módulos | 253 |
| Itens no nível raiz | 45 |
| NÃO CLASSIFICADOS | 0 |

## Detalhes Técnicos
- Refinamento da função `refOf` para evitar tags irrelevantes.
- Atualização da query SQL na página de debug/auditoria para refletir o agrupamento solicitado.
