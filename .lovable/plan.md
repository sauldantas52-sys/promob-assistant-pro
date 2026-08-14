# Consolidação Operacional Monta AI

Finalização dos módulos operacionais para o ciclo completo de fabricação e montagem de móveis planejados, seguindo o padrão Industrial Design System 4.0.

## Módulos Implementados/Revisados

### 1. Assistência Técnica
- **Local:** `src/routes/_authenticated.technical-assistance.tsx`
- **Funcionalidade:** Gestão de chamados (tickets) vinculados a projetos, módulos ou peças.
- **Fluxo:** Registro de ocorrência -> Avaliação -> Reposição/Reparo -> Encerramento.
- **Evidências:** Suporte a fotos e notas de campo.

### 2. Dashboard & Wallboard (Pipeline)
- **Dashboard:** Atualização de contadores para incluir "Assistência Técnica" e "Conferência".
- **Wallboard:** Reordenação das colunas para o fluxo industrial real: Corte -> Borda -> Usinagem -> Separação -> Conferência -> Expedição.
- **TV Mode:** Ajuste de visibilidade para monitoramento remoto na fábrica.

### 3. Produção & Pipeline
- **Bloqueios:** Manutenção do bloqueio de usinagem (`machining_blocked = true`) até validação da engenharia.
- **Status:** Extensão do ciclo de vida para `conferencia` e `expedicao`.

### 4. Montagem & Campo
- **Guia Digital:** Integração direta com a aba de Assistência Técnica a partir do caderno de montagem.
- **Evidências:** Slots para fotos "Antes" e "Depois" da instalação.

### 5. Expedição & Logística
- **Volumes:** Geração de volumes (`shipping_volumes`) vinculados aos grupos de montagem (G1, G2, G3).
- **Segurança:** Bloqueio de carregamento para volumes com pendências na conferência ou grupos bloqueados.

## Detalhes Técnicos

- **Status de Projeto:** Inserção de `conferencia` e `expedicao` no enum `ProjectStatus`.
- **RBAC:** Acesso de Auditor em modo Read-Only estendido para o novo módulo de Assistência.
- **UI:** Aplicação de cores semânticas (Verde: Sucesso, Azul: Em andamento, Roxo: Assistência, Indigo: Conferência).

## Invariantes Preservadas
- `company_id` em todas as consultas (RLS).
- Bloqueio de produção CNC (`machining_blocked`).
- Login via Supabase Auth e PIN de Operador.
