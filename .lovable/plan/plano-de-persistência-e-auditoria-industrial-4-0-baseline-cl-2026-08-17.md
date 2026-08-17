# Plano de Persistência e Auditoria Industrial 4.0 - Baseline Closet

Este plano estabelece a persistência definitiva do projeto **CLOSET-18-07-2026** no banco de dados, eliminando dependências de estados voláteis e garantindo que o baseline industrial de 409 peças físicas seja a referência única de auditoria.

## Ações Imediatas

1. **Correção de Auditoria Forense**:
   - Modificar `src/routes/_authenticated.projects.test-import.tsx` para aceitar um `projectId` via query param, removendo o `limit(1)` que causa auditorias em projetos errados.
   - Atualizar a interface de auditoria para exibir o `name` e `client_name` reais vindos do banco, confirmando a identidade do projeto auditado.

2. **Reforço de Persistência Industrial**:
   - Ajustar o RPC `import_client_project` e a lógica de importação para garantir que a flag `is_test` seja respeitada e que os metadados do XML sejam preservados na coluna `metadata` de forma imutável.
   - Validar se o filtro de extensão em `webkitRelativePath` está permitindo a ingestão do arquivo `.promob` físico, conforme solicitado.

3. **Baseline Amanda vs Closet**:
   - Realizar uma nova importação controlada do arquivo `CLOSET-18-07-2026.xml` para garantir que o banco contenha os dados exatos (409 peças, 13 módulos) antes de prosseguir com os testes de fábrica.
   - O projeto "amanda 111" será mantido como registro histórico, mas o Closet será o alvo primário da auditoria.

## Detalhes Técnicos

- **Query de Auditoria**: Substituir `maybeSingle()` por uma consulta baseada em ID explícito para evitar fallbacks perigosos em ambiente de produção/piloto.
- **Mapeamento de Materiais**: Garantir que o parser `refOf` ignore `LARGURA_CHAPA` e use `MAXWIDTH` para fidelidade total ao gabarito da Seção 13.
- **Distribuição Industrial**: Verificar se o gatilho `auto_process_project_gates` está alimentando todas as áreas (Corte, Borda, Usinagem) corretamente após a persistência.

O objetivo final é que, ao recarregar a página ou deslogar, o usuário encontre o Closet exatamente como o XML o definiu.
