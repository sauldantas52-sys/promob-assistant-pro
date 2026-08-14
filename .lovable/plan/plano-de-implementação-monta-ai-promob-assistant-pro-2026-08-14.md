# Plano de Implementação: Monta AI — Promob Assistant Pro

Sistema para lojas de móveis planejados, escritórios de projetos, fábricas e montadores para transformar arquivos do Promob em informações de produção e montagem.

## Design e Identidade Visual

- Paleta: Verde-claro, branco, cinza suave e detalhes em verde escuro.
- Estilo: Moderno, limpo, profissional, focado em dispositivos móveis e tablets (PWA).
- Componentes: Botões grandes, cartões visuais, navegação direta.

## Estrutura de Banco de Dados (Supabase)

### Tabelas Principais:
- `companies`: Dados da empresa/loja.
- `profiles`: Extensão de `auth.users` com perfil (admin, escritorio, fabrica, montador) e `company_id`.
- `user_roles`: Gerenciamento de permissões conforme instruído.
- `projects`: Cabeçalho do projeto (cliente, datas, status).
- `modules`: Módulos do projeto (extraídos do XML).
- `parts`: Peças de cada módulo (extraídos do XML/PDF/DXF).
- `files`: Arquivos anexados ao projeto (XML, PDF, DXF, Imagens).
- `production_orders`: Status de produção.
- `assembly_calls`: Chamados de montagem/assistência (fotos, áudio, texto).

## Funcionalidades por Módulo

1.  **Autenticação**: Login por e-mail e senha com controle de perfil e empresa.
2.  **Dashboard**: Visão geral de projetos, produção e chamados.
3.  **Gestão de Projetos**: Lista em cartões e detalhes em abas (Visão Geral, Peças, 3D, etc.).
4.  **Importação Inteligente**: Upload de XML, DXF, PDF. Reconhecimento automático de tipo de arquivo.
5.  **Visualização Técnica**: Tabela de peças com origem do dado (XML, PDF, DXF) e status de conferência.
6.  **Visualização 3D**: Preparação do componente para reconstruir o móvel com base nas peças.
7.  **Fluxo de Produção**: Status para o chão de fábrica (Corte, Usinagem, etc.).
8.  **Módulo do Montador**: Interface simplificada para celular, acesso a instruções e abertura de chamados.

## Detalhes Técnicos

- **Frontend**: TanStack Start (React 19 + Vite), Tailwind CSS v4.
- **Backend**: Lovable Cloud (Supabase).
- **PWA**: Configuração para instalação em dispositivos.
- **Segurança**: RLS em todas as tabelas, permissões baseadas em funções (`has_role`).

## Próximos Passos

1.  Criar migrações do banco de dados com RLS e GRANTs.
2.  Configurar o sistema de autenticação e perfis.
3.  Desenvolver o layout base (Shell) e Dashboard.
4.  Implementar a lógica de importação de arquivos e listagem de módulos/peças.
5.  Desenvolver as telas específicas para Fábrica e Montador.
