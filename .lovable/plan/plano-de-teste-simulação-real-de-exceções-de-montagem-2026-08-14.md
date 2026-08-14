# Plano de Teste - Simulação Real de Exceções de Montagem

Este plano descreve a execução de testes automatizados via Playwright para validar o sistema de exceções de montagem, garantindo que os bloqueios, registros e comportamentos offline funcionem conforme as regras de negócio.

## Escopo dos Testes

Os testes serão realizados simulando interações na rota `/assembly`, utilizando o componente `ConferenceDialog` para as seguintes exceções:

1.  **QR Code Ilegível**: Tentar ler um código malformado.
    -   *Esperado*: Alerta de erro, registro no log, bloqueio do kit não acionado (apenas erro de leitura).
2.  **Peça de Outro Módulo**: Tentar ler um QR de uma peça que pertence ao projeto, mas não ao grupo atual.
    -   *Esperado*: Mensagem de erro "Peça de outro módulo", registro de exceção bloqueante, kit bloqueado.
3.  **Peça Duplicada**: Tentar ler o mesmo código duas vezes.
    -   *Esperado*: Mensagem informativa, sem registro de exceção no histórico (apenas ignorado).
4.  **Ferragem Faltante**: Tentar finalizar kit sem marcar todas as ferragens.
    -   *Esperado*: Botão de finalização bloqueado ou erro ao clicar, exibição do motivo no "Guarda".
5.  **Peça Danificada**: Registro manual de peça danificada.
    -   *Esperado*: Registro no log, alteração do status para "com_excecao", kit bloqueado.
6.  **Modo Offline e Sincronização**: Simular `navigator.onLine = false`, registrar exceção, retornar online e sincronizar.
    -   *Esperado*: Enfileiramento local, indicação visual de pendência, sincronização bem-sucedida com log de consolidado.
7.  **Reabertura de Kit**: Abrir um kit já selado.
    -   *Esperado*: Registro de motivo obrigatório, limpeza do selo, bloqueio para nova conferência.
8.  **Expedição Bloqueada**: Tentar finalizar projeto com item faltante.
    -   *Esperado*: Mensagem de erro detalhada listando os itens pendentes.

## Detalhes Técnicos

-   **Script de Teste**: `check_assembly_exceptions.py` usando Playwright.
-   **Ambiente**: Sandbox com Supabase autenticado.
-   **Validação de Banco**: Após cada teste, o script verificará a tabela `production_logs` para confirmar a criação dos registros com metadados corretos (usuário, data, motivo).

## Relatório Final

Ao final, apresentarei uma matriz de resultados com:
-   **Teste**
-   **Resultado Esperado vs Obtido**
-   **Status (Aprovado/Reprovado)**
-   **Evidência de Registro (ID do Log/Notas)**
-   **Estado do Bloqueio (Sim/Não)**

Não prosseguirei com a conclusão do módulo até que todos os estados de erro sejam validados com sucesso.
