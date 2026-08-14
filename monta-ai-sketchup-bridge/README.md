# Monta AI Bridge para SketchUp v0.1.0-beta

Plugin para preparação de ambientes arquitetônicos e exportação de dados para o Promob.

## Finalidade Principal
Preparar o ambiente (paredes, janelas, portas, módulos) para que o projetista inicie o desenho técnico no Promob.

## Tags Industriais (Padronizadas)
- **00_REFERENCIAS**: Origem e eixos.
- **01_AMBIENTES**: Agrupadores de cômodos.
- **02_PAREDES**: Geometria de alvenaria.
- **03_PORTAS_JANELAS**: Vãos e esquadrias.
- **04_MODULOS**: Volume de armários e componentes.
- **05_COTAS**: Dimensões visuais.
- **06_MATERIAIS**: Definição de cores e MDF.
- **07_PORTAS_FRENTES**: Peças de fechamento.
- **08_REVISAO**: Itens para conferência.
- **09_NAO_FABRICAVEL**: Itens decorativos.

## Segurança Industrial
- **machining_blocked = true**: Bloqueio total de usinagem e CNC.
- **Autoridade de Engenharia**: Promob.

## Como Usar
1. Clique em **Plugins > Monta AI > 1. Preparar Projeto**.
2. Organize seu modelo nas tags criadas.
3. Use o **2. Painel de Controle** para exportar o JSON.
4. Importe o arquivo JSON no sistema Monta AI para sincronização com Promob.

## Especificações Técnicas
- Unidade: Milímetros (mm).
- Escalas suportadas: 1:20, 1:25.
- Formatos: JSON (Manifesto), DXF (Referência), TXT (Relatório).
