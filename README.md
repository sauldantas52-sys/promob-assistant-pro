# Promob Assistant Pro

Crie um aplicativo web responsivo chamado “Monta AI — Promob Assistant Pro”.

O sistema será utilizado por lojas de móveis planejados, escritórios de projetos, fábricas e montadores. O objetivo é transformar arquivos de projeto do Promob em informações confiáveis para orçamento, produção, conferência, montagem e assistência técnica.

A interface deve ser moderna, limpa, bonita e profissional, com identidade visual verde-clara, branco, cinza suave e detalhes em verde escuro. Deve funcionar muito bem em computador, tablet e celular. Use botões grandes, cartões visuais, textos simples, navegação direta e poucos elementos por tela. Evite telas muito altas e excesso de rolagem.

Tecnologia desejada:

- React com TypeScript.
- Tailwind CSS.
- Supabase para autenticação, banco de dados, armazenamento de arquivos e atualizações em tempo real.
- PWA responsiva para uso em computador, tablet e celular.
- Arquitetura preparada para processamento posterior de XML, DXF, PDF e visualização 3D.
- Criar componentes reutilizáveis e código organizado por módulos.
- Não criar dados falsos permanentes. Usar dados de demonstração apenas em uma área claramente identificada.

Perfis de usuário:

1. Administrador
- Gerencia usuários, empresas, permissões e configurações.

2. Escritório
- Cria projetos.
- Importa arquivos.
- Consulta módulos, peças, medidas e materiais.
- Acompanha produção e chamados de montagem.

3. Fábrica
- Visualiza peças e ordens de produção.
- Confere medidas, materiais, fita de borda e ferragens.
- Atualiza o status da produção.

4. Montador
- Acessa o projeto por celular ou tablet.
- Seleciona o módulo e a peça.
- Visualiza instruções.
- Abre chamados com texto, áudio e fotos.
- Atualiza o andamento da montagem.

Estrutura principal do aplicativo:

1. Tela de login

Criar login com e-mail e senha, recuperação de senha e controle de acesso por empresa e perfil.

2. Dashboard inicial

Mostrar:

- Projetos recentes.
- Projetos em produção.
- Projetos aguardando conferência.
- Montagens em andamento.
- Chamados abertos.
- Alertas de dados não confirmados.
- Indicadores de peças, módulos e projetos.

O aplicativo deve iniciar sem abrir automaticamente o último projeto. O projeto anterior deve ficar disponível no Histórico.

3. Projetos

Criar uma tela com cartões clicáveis para cada projeto.

Cada cartão deve mostrar:

- Nome do projeto.
- Cliente.
- Data de criação.
- Status.
- Quantidade de módulos.
- Quantidade de peças.
- Indicador de arquivos importados.
- Alertas de inconsistências.

Ao clicar no projeto, abrir uma área de detalhes com abas:

- Visão geral.
- Módulos.
- Peças.
- Materiais.
- Cotas.
- Furação.
- Visualização 3D.
- Arquivos.
- Produção.
- Montagem.
- Chamados.
- Histórico de alterações.

4. Importação de arquivos

Criar uma área para importar e organizar:

- XML do Promob.
- DXF ASCII.
- PDF executivo.
- Imagens de referência.
- Arquivos auxiliares.

Criar uma “pasta inteligente” que reconheça o tipo do arquivo e relacione os arquivos ao projeto.

Exibir:

- Nome do arquivo.
- Tipo.
- Tamanho.
- Data de importação.
- Status de processamento.
- Erros ou avisos.
- Origem dos dados.

O XML deve ser tratado como fonte principal para:

- Identidade dos módulos.
- Hierarquia.
- Peças.
- Medidas.
- Material.
- Espessura.
- Quantidade.
- Fita de borda.

O PDF executivo deve ser usado para cotas críticas de furação que não estejam no XML.

O DXF deve ser usado para geometria e validação visual.

As imagens devem servir apenas para conferência humana, nunca como fonte única de medidas de fabricação.

5. Módulos

Mostrar os módulos em cartões visuais clicáveis.

Cada módulo deve apresentar:

- Nome ou identificação.
- Largura.
- Altura.
- Profundidade.
- Tipo.
- Material.
- Quantidade.
- Status de conferência.
- Status de produção.
- Alertas.

Separar claramente:

- Móvel completo.
- Estrutura interna.

No modo “Estrutura interna”, ocultar portas e frentes para permitir a conferência da construção interna.

6. Peças

Criar uma tabela e uma visualização em cartões para as peças.

Campos:

- Nome da peça.
- Módulo.
- Tipo.
- Comprimento.
- Largura.
- Espessura.
- Quantidade.
- Material.
- Fita de borda.
- Sentido da fita.
- Furação.
- Origem da informação.
- Status de conferência.

Permitir filtrar por módulo, tipo, material, status e origem.

Não inventar medidas, furações, folgas, passos ou posições. Quando o dado não estiver disponível, exibir claramente:

“Não confirmado”.

Toda informação deve mostrar sua origem:

- XML.
- PDF.
- DXF.
- Cadastro de ferragem.
- Estimativa.

Estimativas devem ser visualmente diferentes dos dados confirmados.

7. Cotas e furação

Criar uma tela específica para cotas críticas.

Exibir:

- Cotas horizontais.
- Cotas verticais.
- Profundidades.
- Posições de furação.
- Folgas.
- Passos.
- Origem do valor.
- Grau de confiança.

Se o XML não tiver informações suficientes sobre furação de corrediça, dobradiça ou ferragem, o sistema deve bloquear a confirmação e exibir um alerta:

“Furação não confirmada. Consulte o PDF executivo ou o cadastro técnico da ferragem.”

Nunca deduzir automaticamente uma furação apenas com base em imagem ou aparência visual.

8. Visualização 3D

Criar uma área preparada para visualizar o projeto em 3D.

A visualização deve:

- Reconstruir os módulos com base nas peças existentes.
- Mostrar base e tampo como painéis horizontais.
- Mostrar laterais e divisórias como painéis verticais.
- Mostrar fundos na parte traseira.
- Mostrar sarrafos na posição correspondente.
- Mostrar portas e frentes na face frontal.
- Usar material e cor da própria peça.
- Permitir alternar entre “Móvel completo” e “Estrutura interna”.
- Permitir selecionar módulo e peça.
- Destacar a peça selecionada.
- Mostrar dados da peça selecionada.
- Permitir ocultar portas, fundos ou prateleiras.
- Permitir girar, aproximar e afastar a câmera.

Não criar peças que não estejam no XML, exceto quando claramente identificadas como “aproximação visual”.

Comparar a quantidade esperada de peças do XML com os objetos criados no 3D.

Diferenciar:

- Peça ausente.
- Peça oculta.
- Peça não confirmada.
- Peça criada apenas para ajuda visual.

Não mostrar um ambiente completo ou uma posição de ambiente quando a posição não estiver confirmada pelo DXF ou por dados confiáveis. Nesse caso, mostrar os módulos isolados.

9. Conferência de projeto

Criar uma tela de auditoria com:

- Peças esperadas.
- Peças encontradas.
- Peças ausentes.
- Peças duplicadas.
- Medidas incompletas.
- Furações não confirmadas.
- Materiais ausentes.
- Problemas no XML.
- Problemas no DXF.
- Diferenças entre XML, DXF e PDF.

Usar níveis:

- OK.
- Atenção.
- Bloqueado.
- Não confirmado.

10. Produção

Criar uma área de chão de fábrica com ordens de produção.

Cada ordem deve mostrar:

- Projeto.
- Cliente.
- Módulo.
- Peças.
- Prioridade.
- Responsável.
- Prazo.
- Status.

Status:

- Aguardando conferência.
- Liberado para produção.
- Em produção.
- Em corte.
- Em usinagem.
- Em montagem de fábrica.
- Pronto.
- Entregue.
- Cancelado.

Permitir atualizar status, adicionar observações e anexar fotos.

11. Área do montador

Criar uma interface simplificada para celular e tablet.

O montador deve conseguir:

- Abrir o projeto por link ou código.
- Selecionar um módulo.
- Selecionar uma peça.
- Ver medidas e instruções.
- Ver fotos de referência.
- Adicionar foto do problema.
- Gravar áudio.
- Escrever ou ditar uma observação.
- Abrir um chamado.
- Consultar chamados anteriores.
- Atualizar o status da montagem.

A interface do montador deve ter botões grandes e fluxo muito simples.

12. Chamados de montagem

Criar chamados vinculados ao projeto, módulo e peça.

Campos:

- Título.
- Descrição.
- Projeto.
- Módulo.
- Peça.
- Responsável.
- Fotos.
- Áudio.
- Data.
- Histórico.
- Status.

Status:

- Aberto.
- Em análise.
- Em produção.
- Pronto.
- Entregue.
- Cancelado.

O escritório deve acompanhar os chamados em tempo real.

13. Histórico

Registrar:

- Importação de arquivos.
- Alterações em projetos.
- Alterações de medidas.
- Mudanças de status.
- Usuário responsável.
- Data e hora.
- Comentários.
- Arquivos anexados.

14. Banco de dados

Criar tabelas para:

- Empresas.
- Usuários.
- Perfis.
- Projetos.
- Clientes.
- Arquivos.
- Módulos.
- Peças.
- Materiais.
- Cotas.
- Furações.
- Ordens de produção.
- Montagens.
- Chamados.
- Comentários.
- Anexos.
- Histórico de alterações.

Usar relacionamentos corretos, controle de acesso por empresa e políticas de segurança no Supabase.

15. Regras importantes

- Não inventar informações de fabricação.
- Não usar imagens para calcular medidas.
- Não considerar estimativa como dado confirmado.
- Sempre mostrar a origem do dado.
- Separar visualmente informação confirmada e não confirmada.
- Preservar o histórico e os arquivos originais.
- Permitir reprocessar arquivos sem apagar o histórico anterior.
- Usar carregamento sob demanda para arquivos grandes, PDFs, DXFs e visualização 3D.
- Manter a interface leve e responsiva.
- Evitar carregar toda a geometria do projeto na abertura.
- Preparar a arquitetura para futuramente integrar processamento real de XML, DXF e PDF por backend ou serviço local.
- Não afirmar que uma medida está correta sem fonte confiável.

16. Dados iniciais de demonstração

Criar um projeto demonstrativo chamado “Projeto Piloto Monta AI” com:

- Um módulo superior de 1590 × 660 × 350 mm.
- Dois balcões de 800 × 670 × 565 mm.
- O módulo superior contendo base, tampo, laterais, fundo, divisória, duas portas e duas prateleiras.
- Cada balcão contendo base, duas laterais, fundo, prateleira, dois sarrafos e duas portas.

Identificar todos esses dados como “Demonstração”.

17. Ordem de desenvolvimento

Implemente em etapas:

Etapa 1:
- Layout geral.
- Login.
- Dashboard.
- Projetos.
- Navegação.
- Banco de dados inicial.

Etapa 2:
- Importação e organização de arquivos.
- Módulos.
- Peças.
- Materiais.
- Cotas.
- Alertas de dados não confirmados.

Etapa 3:
- Produção.
- Montagem.
- Chamados.
- Fotos.
- Áudio.
- Atualizações em tempo real.

Etapa 4:
- Visualização 3D.
- Integração real com XML, DXF e PDF.
- Auditoria avançada.
- Relatórios.

Antes de criar funcionalidades avançadas, construa primeiro uma versão navegável e funcional do MVP com dados persistidos no Supabase.

Entregue o aplicativo com aparência profissional, responsiva e pronta para evolução. Não criar apenas uma landing page: criar um sistema operacional completo para escritório, fábrica e montagem.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5e1598ce-5020-41f1-8d67-19d1bd2c2bf4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
