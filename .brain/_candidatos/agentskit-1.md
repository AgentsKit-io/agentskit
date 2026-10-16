# Candidatos globais — agentskit

## Conceitos

- **Runtime** → laço de execução configurável para agentes, com topologias, fluxos e opções duráveis. Aparece em [[agentskit-runtime]] e [[AgentsKit - Executar um agente]]. Evidência: `packages/runtime/src/index.ts:1`.
- **Contratos de composição** → interfaces estáveis de adapter, tool, memory, retriever, skill e runtime que permitem combinar pacotes. Aparece em [[agentskit-core]]. Evidência: `packages/core/src/index.ts:1`.
- **Handoff documental** → registro de entrada, raízes de edição e checks recomendado por pacote. Aparece nos grupos e notas individuais. Evidência: `.doc-bridge/index.json` (handoffs).

## Glossário

- Adapter: implementação que normaliza chamadas a provedores no contrato AgentsKit.
- Retriever: componente que recupera documentos para uma consulta.
- Handoff: orientação gerada pelo Doc Bridge para agentes que editam uma área.

## Arestas de dependência

- `bindings --> core : consomem ChatReturn/controller : packages/react/package.json:1`
- `runtime --> core : implementa contratos de runtime : packages/runtime/package.json:1`
- `adapters --> core : implementam AdapterFactory : packages/adapters/CONVENTIONS.md:5`

## Infra/deploy

- Monorepo usa pnpm workspaces e Turbo; comandos globais estão em `package.json:1`.
- Pacotes definem scripts build/test/lint nos próprios manifests, exemplo `packages/core/package.json:125`.

## Perguntas abertas

- A CLI Doc Bridge não pôde ser executada no ambiente porque `pnpm` não está instalado; a atualização do índice não foi verificada.
- Consumidores externos e níveis reais de adoção não são inferidos pelos manifests.

## Capacidades não usadas

- Nenhuma capacidade foi classificada como sem uso sem análise de chamadores e execução; avaliar individualmente antes de promover afirmações globais.
