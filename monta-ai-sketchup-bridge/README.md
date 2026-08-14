# Monta AI Bridge para SketchUp (Beta v0.1.0)

## Visão Geral
Este plugin conecta o SketchUp ao ecossistema Monta AI, permitindo que projetos 3D sejam convertidos em dados industriais para fabricação e montagem. Esta é uma versão **BETA** para testes controlados.

## Funcionalidades
- Menu **Monta AI** no SketchUp.
- Criação automática de **Tags Industriais** (00 a 18).
- Auditoria de projeto com **Relatório de Validação**.
- Exportação de **Manifesto JSON** (Modo Local).
- Bloqueio de usinagem automático (`machining_blocked: true`).

## Requisitos
- SketchUp 2021 ou superior.
- Codificação UTF-8 ativa.
- Test::Unit para execução de testes automatizados.

## Testes
O plugin inclui uma suíte de testes em `tests/test_bridge.rb`. Para rodar no console do SketchUp:
```ruby
load 'monta-ai-sketchup-bridge/tests/test_bridge.rb'
```

## Licença
Propriedade da Monta AI. Uso restrito a parceiros autorizados.