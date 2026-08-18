# Plano de Fidelidade 5.9: Renderização 3D de Peças Reais

Este plano implementa a renderização volumétrica das peças físicas reais dentro do Ambiente 3D Operacional, em vez de apenas caixas simplificadas para os módulos. Isso permite que o montador e o operador vejam a composição exata de cada módulo conforme definido no Plano de Corte e no XML do Promob.

## 1. Refatoração do Ambiente 3D
- Modificar `Operational3DView.tsx` para renderizar peças individuais (`PhysicalPiece3D`) dentro de cada módulo.
- Implementar posicionamento algorítmico básico para as peças dentro do envelope do módulo (empilhamento ilustrativo para visualização técnica).
- Manter o suporte a isolamento, raio-x e destaque, agora operando no nível de peça.

## 2. Persistência de Dados de Peças
- Garantir que o fluxo de importação em `src/routes/_authenticated.projects.import.tsx` persista corretamente os metadados das peças necessários para a reconstrução 3D (dimensões, material, cor).
- Verificar se a tabela `parts` no Supabase está recebendo todos os campos do `parsePromobXML`.

## 3. Experiência do Usuário (UX)
- Ao selecionar um módulo no 3D, permitir a inspeção visual de cada peça componente.
- Sincronizar o destaque entre a aba 3D e a aba "Plano de Corte Pro", permitindo que o usuário localize uma peça no plano de corte clicando nela no 3D.

## Detalhes Técnicos
- **Three.js/Fiber**: Utilização de instanced meshes ou grupos de meshes para as peças.
- **Coordenadas**: Como o XML nem sempre fornece coordenadas X,Y,Z absolutas para cada peça, usaremos o envelope do módulo (`width_mm`, `height_mm`, `depth_mm`) como contêiner e distribuiremos as peças internamente para visualização de "explosão" ou "estoque".
- **Fidelidade**: As cores das peças serão derivadas do material/modelo definido no XML.

