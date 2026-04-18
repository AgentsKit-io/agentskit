---
sidebar_position: 1
title: Checklist de documentação de pacotes
description: Checklist para mantenedores manterem cada guia @agentskit/* alinhado ao código e ao TypeDoc.
---

# Checklist de documentação de pacotes

Use ao adicionar ou alterar um pacote ou sua API pública.

1. **Propósito** — Quando usar / quando não usar.
2. **Instalação** — linha `npm i`; observar peers (geralmente `@agentskit/core` via pacotes de recurso).
3. **Superfície pública** — Exportações principais alinhadas a `src/index.ts` (detalhes no TypeDoc).
4. **Configuração** — Tabelas de opções para as fábricas principais.
5. **Exemplos** — Caminho feliz + um exemplo voltado a produção ou a um caso extremo.
6. **Integração** — Links para pacotes adjacentes (mantenha a linha **Ver também** no fim de cada guia curta).
7. **Solução de problemas** — FAQ breve (erros, variáveis de ambiente, divergência de versão).

Quando as exportações mudarem, atualize o guia e garanta que `pnpm --filter @agentskit/docs build` ainda passe (`docs:api` regenera o TypeDoc).
