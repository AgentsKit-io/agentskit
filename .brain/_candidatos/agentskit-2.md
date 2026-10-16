# Material candidato para notas globais — agentskit v2

## conceitos

- Corpus de documentação consultável → Coleção de páginas preparadas para busca semântica e respostas ancoradas. O app docs publica conteúdo canônico e Ask agrega corpora por propriedade. Aparece em [[agentskit-docs-next]], [[agentskit-ask-backend]] e [[agentskit-registry]]. Evidência: `apps/ask-backend/src/server.ts:46`.
- Demo com adapter sintético → Composição que implementa a interface do adapter para demonstrar UI/runtime sem chamar provedor real. Distinguir da integração real evita atribuir capacidades inexistentes. Aparece em [[agentskit-example-react]], [[agentskit-example-runtime]], [[agentskit-example-multi-agent]]. Evidência: `apps/example-react/src/App.tsx:12`.
- Harness visual → Página determinística de cenários que torna estados de UI inspecionáveis por Playwright. Aparece em [[agentskit-visual-react]]. Evidência: `apps/visual-react/src/Harness.tsx:54`.
- Recuperação remota de corpus → Leitura HTTP de llms/index e segmentação de conteúdo para alimentar retriever. Aparece em [[agentskit-ask-backend]]. Evidência: `apps/ask-backend/src/ask/remote-corpus.ts:24`.

## glossário candidato

- app workspace privado: aplicação do monorepo (`private: true`) executável por scripts pnpm, sem publicação própria npm.
- corpus: fonte nomeada de documentos consultáveis pelo Ask.
- durable step log: arquivo de registros de etapas que permite reuso/retomada em demonstrações runtime.
- harness: ambiente que prepara casos sintéticos para inspeção visual repetível.

## dependency edges

- `agentskit-docs-next --> agentskit-ask-backend : envia perguntas do corpus docs : apps/ask-backend/src/server.ts:46`
- `agentskit-registry --> agentskit-ask-backend : endpoint Ask configurável : apps/registry/components/ask-widget.tsx:138`
- `agentskit-example-react --> agentskit-react : hook/components e integração de chat : apps/example-react/src/App.tsx:89`
- `agentskit-example-runtime --> agentskit-runtime : cria runtime demonstrativo : apps/example-runtime/src/index.ts:61`
- `agentskit-visual-react --> agentskit-react : harness importa contrato e componentes : apps/visual-react/src/Harness.tsx:2`
- `agentskit-ask-backend --> agentskit-rag : usa retriever/corpus : apps/ask-backend/src/server.ts:20`

## infra/deploy

- Docs, Registry e Landing têm scripts Next/Vinext declarados; script não demonstra host de produção ativo. Fontes: `apps/docs-next/package.json:25`, `apps/registry/package.json:13`, `apps/landing/package.json:11`.
- Ask Backend declara configuração Railway em `railway.json`; serviço persistente exige `OPENROUTER_API_KEY`. Fonte: `apps/ask-backend/src/server.ts:27`.
- Visual React usa Playwright local com porta 4178. Fonte: `apps/visual-react/playwright.config.ts:5`.
- Exemplos edge e bots dependem de hospedeiro HTTP/Wrangler ou endpoints externos quando executados com credenciais.

## perguntas abertas

- Qual é o destino ativo atual de produção para Docs, Landing e Registry? Configuração versionada não confirma deploy.
- A nota específica para RFC-0007 ainda precisa ser resolvida pelo integrador no índice de decisões.
- Quais consumidores externos usam os exemplos? Não há inventário confirmado nesta leitura.
- O environment de CI para filtros pnpm das apps é consistente com os nomes dos manifests atuais?

## capacidades sem uso confirmado

- Vários exemplos têm somente lint/build e nenhum teste próprio declarado; isso não prova ausência de uso por pessoas.
- `example-multi-agent` apresenta respostas simuladas, sem chamar orquestração runtime real.
- `example-dspy` compara variantes locais com uploader stub, sem serviço DSPy ativo.
- `example-edge` script `dev` apenas instrui usar Wrangler e termina; caminho funcional local deve seguir README/Wrangler.
