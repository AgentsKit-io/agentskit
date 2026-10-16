---
tipo: conceito
repo: agentskit
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: [CONVENTIONS.md, README.md]
tags: [verificacao, repo/agentskit, conceito, camada/framework]
---

# Auditoria - agentskit

> [!tldr] Em linguagem comum
> Este lote explica os três repositórios por leitura de código e documentação. As verificações comprovam cobertura dos workspaces e integridade das notas; não comprovam funcionamento, desempenho ou disponibilidade dos serviços.

← [[00 Hub - agentskit]]

## Contrato e orçamento

- Intenção autorizada: implementar documentação e criar commit local convencional, sem push ou PR.
- Escopo de escrita: somente repos/agentskit, repos/agentskit-chat e repos/agentskit-registry.
- Fontes: clones main locais, sem alterações; commits no cabeçalho. HEAD coincide com main local e todos os clones estavam limpos na inspeção final. Não houve fetch para afirmar igualdade com o main remoto neste instante.
- Método e orçamento: somente análise estática e verificações locais determinísticas; zero instalações, execuções dos projetos, chamadas a provedores, CI, fixtures ou ambientes novos.
- Fora do escopo: escrever notas globais, alterar fontes, verificar produção e documentar individualmente cada agente do catálogo como se fosse workspace.
- Entrega do worker: implementado e verificado estaticamente; revisão e consolidação do coordenador permanecem responsabilidade do coordenador.

## Validado

| Critério | Evidência e resultado |
|---|---|
| C1 — Cobrir todos os workspaces | pnpm-workspace.yaml e manifests: agentskit tem 27 pacotes e 18 apps; agentskit-chat tem 12 pacotes e 8 apps. Há uma nota por cada um dos 65 workspaces. |
| C2 — Cobrir módulos do Registry | Três notas separam catálogo/build, validação/evidência e descoberta. O repo não declara workspaces de app/pacote. O índice público contém 346 agentes e stats de 333 revisões independentes; isso é evidência do artefato, não execução das avaliações. |
| C3 — Explicar partes e fluxos | Três hubs e sete fluxos com tabelas e Mermaid. Comportamento cruzado com runner/controller, CLI addAgent, handler Ask, resolver determinístico, snapshots e scripts Registry. Referências por arquivo e linha permitem repetir a análise no commit declarado. |
| C4 — Estilo e rastreabilidade | Todas as notas têm frontmatter, commits, data, tldr em PT-BR e bloco técnico recolhido. Checks percorrem referências e conferem existência do arquivo e validade da linha; isso complementa a leitura semântica, sem substituí-la. |
| C5 — Integridade dos links | Todos os alvos escritos estão nestas pastas ou na lista explícita de hubs externos abaixo. Os insumos _para-globais são acessados por caminho, pois o nome é repetido por exigência do contrato. |
| C6 — Ausência de segredos | Varredura grep recursiva dos três diretórios: nenhum candidato a credencial. A busca textual ampla encontra substrings em nomes Ask; conferência por padrão de token classificou os 30 resultados como caminhos/nomes benignos. Nenhum valor de credencial foi copiado. |
| C7 — Limites e divergências | Hubs, fluxos e insumos registram o exemplo multiagente simulado, consolidação de subpaths, ausência de rollback nas escritas do CLI, distinção entre hash e assinatura e caminhos alternativos de deploy. |

## Contagens de entrega

| Repo | Pacotes/módulos | Apps | Fluxos | Hub | Insumo global | Relatório | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| agentskit | 27 | 19 | 3 | 1 | 1 | 1 | 52 |
| agentskit-chat | 12 | 8 | 2 | 1 | 1 | 0 | 24 |
| agentskit-registry | 3 | 0 | 2 | 1 | 1 | 0 | 7 |

O 19º app de agentskit é a embalagem Raycast aninhada em example-embedded, documentada à parte apesar de não ser workspace pnpm. Total: 83 notas, das quais 65 correspondem exatamente aos workspaces.

## Resultado da checagem final

- 83 notas; 65 workspaces reconciliados e um pacote auxiliar Raycast.
- 368 referências de arquivo/linha válidas e 1.013 links dentro do lote ou reservados a autores externos.
- Zero links fora da lista permitida, zero nomes duplicados de notas (exceto o _para-globais exigido por repo), zero candidatos a credenciais.
- O coordenador confirmou manter o prefixo agentskit-* para os pacotes do framework; a tabela do hub mapeia cada nota ao nome npm.

## Parcialmente validado

- Links para outros agentes: os nomes abaixo são autorizados pelo escopo de consolidação; a existência e o conteúdo final dessas notas dependem dos autores correspondentes.
- O mapa de consumidores é declaração em manifests e metadados de catálogo. Imports por subpath e montagem de distribuição são explicados separadamente; não é levantamento de adoção produtiva de toda a organização.
- Infraestrutura: configurações e documentação verificadas estaticamente, sem consultar dashboards ou testar serviços.

## Não analisado

- Disponibilidade real, comportamento executado, custo, latência, segurança operacional, tráfego, dados produtivos e atualidade do deploy.
- Semântica individual de cada um dos 346 agentes e validade do processo privado de revisão independente.
- Configuração atual de visibilidade no GitHub e versões atualmente publicadas no npm.

## Bloqueado

- Nenhum bloqueio técnico nas verificações estáticas autorizadas. A documentação não transforma ausência de evidência produtiva em validação de produção.

## Não aplicável

- Build, testes de runtime, endpoints, bancos e browser/UI: nenhuma implementação ou tela dos projetos foi alterada; executá-los seria contrário ao contrato de análise estática.
- ADR novo: não houve decisão estrutural de software; foram documentadas responsabilidades já existentes.

## Dúvidas e próximos responsáveis

As perguntas foram consolidadas em [[Dúvidas abertas]]: host ativo entre Vercel/Workers, Redis e retenção efetivos, versões adotadas pelos hosts, entrega dos artefatos Registry, processo humano das avaliações e recuperação de falha parcial na cópia CLI. O coordenador deve revisar as notas, consolidar os insumos globais e resolver os links externos.

> [!info]- Detalhe técnico
> - CONVENTIONS.md define frontmatter, links, callouts e fontes por linha.
> - A checagem local reconcilia os manifests com os nomes de notas e percorre os links e referências dos três diretórios.
> - git diff --check é um check de whitespace; não substitui análise semântica do texto.

## Links externos reservados à consolidação

- [[00 Hub - agentskit-os]]
- [[00 Hub - agents-playbook]]
- [[00 Hub - doc-bridge]]
- [[00 Hub - harness]]
- [[00 Hub - code-review]]
- [[00 Hub - .github]]


## Atualização v2 deste lote

Este relatório anterior foi incorporado à auditoria do repositório. Para a atualização v2 do recorte hub + pacotes, foram reorganizadas 27 notas em seis grupos e criadas notas para 39 ADRs. O snapshot `.doc-bridge/index.json` foi lido, mas a CLI não pôde ser executada porque `pnpm` não está instalado. As referências devem ser conferidas no commit indicado em cada nota.

## Auditoria v2 — 2026-10-16

### Parte: hub, núcleo, provedores, memória

Recorte: `00 Hub - agentskit`, `fluxos/` (3), `decisões/` (índice e 39 ADRs), `grupos/Núcleo/` (grupo e 5 pacotes), `grupos/Provedores e ferramentas/` (grupo e 6 pacotes), `grupos/Memória e RAG/` (grupo e 2 pacotes). Total: 60 notas. Código auditado no commit `9f8d8551`. `pnpm` não está instalado, então nada foi executado; o shell do agente também bloqueia `sed`, `ls`, `find` e pipes, e a conferência foi feita por leitura de arquivo e `git grep`.

**Método.** (1) Cada símbolo da tabela "API e contratos" de todos os 13 pacotes foi conferido contra o `src/index.ts` lido por inteiro. (2) Dependências e consumidores foram conferidos nos `package.json` e por `git grep -l '"@agentskit/<pacote>": '` em `packages/` e `apps/`. (3) Scripts de validação (`test`, `lint`, `size`, `gen:integration`) foram conferidos nos manifests. (4) Variáveis de ambiente foram conferidas por `git grep` em `src/`. (5) Status e datas dos ADRs foram conferidos nos cabeçalhos das 39 fontes. Os exemplos foram conferidos nos README e fixtures.

**Referências `arquivo:linha`.** Os números de linha citados nas notas reescritas foram conferidos por leitura ou `git grep`. A contagem de referências únicas não foi fechada: `git grep -c` conta linhas que casam com `.ts:`, `.md:`, `.json:` e outros padrões, o que mistura referências com linhas de frontmatter e de "fontes". Os corpos em inglês dos ADRs não foram relidos linha a linha.

**Corrigidas.**
- Flows: 17 referências de fonte com prefixo `agentskit/` (que não é caminho do repo) trocadas por caminhos relativos ao repo (ex.: `packages/runtime/src/runner.ts:96`).
- Hub: `package.json:1` → `package.json:6` (bloco `scripts`); `commits` atualizado de `9b31c771` para `9f8d8551`.
- Exports: tabelas de core, runtime, statechart, net, adapters, tools, integrations, mcp, sandbox, skills, memory e rag reescritas com as linhas verificadas. Várias linhas tinham símbolo `{` (sem nome), a coluna "Para que serve" repetia "API pública do pacote", e exportações inteiras não apareciam (ex.: `createDurableRunner`, `supervisor` e `compileFlow` em runtime; `pinecone` e `createHierarchicalMemory` em memory; `createRouter` e `mockAdapter` em adapters).
- Exemplos: 4 notas tinham frase ou string de teste no lugar de exemplo real (validation, net, rag e memory). Substituídos por código do README, do fixture ou do `src`, com linha.
- ADR: linha de status malformada (`Accepted; - Date: …`) corrigida em 39 notas; status `aceito` de ADR-0041 corrigido para `proposto` (frontmatter e corpo); placeholder `Status não encontrado` substituído em 0014, 0015, 0019, 0022 e 0041; data ausente adicionada em 0014, 0015 e 0022 (verificadas na fonte); ADR-0019 e 0041 marcados "data não consta na fonte".
- Dependências de grupo: auto-link em "Dependências de outros grupos" (Provedores) removido; o mermaid de Memória e RAG tinha aresta `memory → rag` sem base nos manifests, removida; o mermaid do hub mostrava `runtime → provedores/memória/qualidade` sem base, substituído por arestas verificadas.

**Afirmações corrigidas** (nota · o que estava errado · o que é verdade · evidência):

| Nota | O que estava errado | O que é verdade | Evidência |
|---|---|---|---|
| core | Export `{` e descrição genérica; "dependências internas: nenhuma" correta | 17 linhas agrupadas com símbolos reais; `createLocalStorageMemory` grava em `localStorage` | `src/index.ts:1-129`; `src/memory.ts:52-98` |
| core | "Armadilha" e invariantes genéricos | Invariantes do CONVENTIONS: zero dependências, <10 KB gzip, exports nomeados, ADR para tipo público | `packages/core/CONVENTIONS.md:7-11`, `:49-53`; `package.json:66` |
| runtime | `OPENAI_API_KEY` lida pelo runtime | Nenhuma variável de ambiente em `src` | `git grep process.env -- packages/runtime/src`: sem resultado |
| runtime | Consumidores "não consolidados" | 10 manifests: cli, mcp, docs-next e 7 manifests de exemplo (incluindo raycast) | `git grep -l '"@agentskit/runtime": '` |
| runtime | Sem efeito de arquivo | `createFileStepLog` grava JSONL em disco | `packages/runtime/src/durable.ts:243-305` |
| statechart | Sem consumidores | Nenhum manifest de pacote ou app declara o pacote | `git grep -l '"@agentskit/statechart": '`: vazio |
| validation | Exemplo era uma frase | Consumidor real: `tools` (subcaminho `./validation`) e `apps/ask-backend` | `packages/tools/tsup.config.ts:11`; `apps/ask-backend/src/server.ts:24,271` |
| net | Exemplo era uma frase; 2 tipos faltando | Import real do README; `AssertPublicUrlOptions` e `LookupFn` exportados | `packages/net/README.md:45-51`; `src/index.ts:13` |
| adapters | `CLI_SECRET`, `HOME` lidos | Não aparecem em `src`; o ambiente é repassado inteiro em `cli/process.ts` | `git grep CLI_SECRET`: vazio; `cli/process.ts:79-111` |
| adapters | Suíte `tests/adapter-contract.test.ts` citada | O arquivo não existe neste commit | `git ls-files packages/adapters/tests`: ausente |
| tools | `AK_SHELL_TEST_SECRET`, `OPENAI_API_KEY` lidos | Não aparecem em `src`; `SERPER_API_KEY` e `TAVILY_API_KEY` são lidos | `web-search.ts:240,243` |
| tools | Integrações "reexportam" o catálogo | Os serviços viraram shims `@deprecated` em `src/integrations/*.ts` | `slack.ts:10`, `gmail.ts:5`, `teams.ts:19` |
| integrations | `SLACK_BOT_TOKEN` lido diretamente | É só `envHint` e exemplo de JSDoc | `services/slack/auth.ts:7`; `integration-tools.ts:11` |
| mcp | Exports sem `fetchAgent`/`fetchAgentSkill` | Incluídos (`:120-127`); CLI deriva o nome da chave de `<PROVIDER>_API_KEY` | `src/index.ts:120-127`; `cli.ts:180` |
| sandbox | `E2B_API_KEY`, `ANTHROPIC_API_KEY` lidos | Não aparecem em `src`; só `PATH` (`container-runtimes.ts:62`) | `git grep`: resultado restrito a `PATH` |
| skills | `FOO_API_KEY` lido | Texto de exemplo dentro de uma string da skill `technical-writer` | `technical-writer.ts:54` |
| memory | Três variáveis listadas | Nenhuma lida em `src` | `git grep process.env` em `memory/src` e `rag/src`: vazio |
| memory | Exemplo de import em testes | Subcaminho real `./postgres` com `postgresChatMemory` | `packages/memory/src/postgres.ts:52` |
| rag | Exemplo vindo de teste de Metro | Exemplo do README; o README importa `@agentskit/adapters` e `@agentskit/memory`, que não são dependências do pacote | `packages/rag/README.md:54-68` |
| Memória e RAG (grupo) | Aresta `memory → rag` | Nenhum manifest liga os dois pacotes | `package.json` de ambos |
| Fluxo Ask | `OPENROUTER_API_KEY`, `REDIS_URL`, Upstash | Confirmados por nome no código; ativação continua não verificada | `server.ts:37-39`; `cache.ts:189-193`; `rate-limit.ts:75,112-113` |

**Afirmações removidas por não verificáveis neste vault.** Seções "No law-os" (core, runtime, memory, rag, sandbox, skills, adapters, tools) que citavam notas `law-os - …`, `os-runtime`, `os-sandbox`, `Revisão de contratos - law-os` e o commit `371860a` de outro repositório. Essas notas não existem neste worktree; o conteúdo foi retirado ou virou Dúvida na nota (ver "Dúvidas" abaixo). Também removidos: os "Existe, mas ninguém usa" que não tinham evidência (o de adapters foi substituído por evidência), o texto genérico "configuração indireta por argumentos" e a "Armadilha: não ampliar a responsabilidade…" repetida em todas as notas, substituída por armadilhas do CONVENTIONS.

**Lacunas de cobertura.**
- Corpo dos 39 ADRs continua em inglês (copiado da fonte). Foi acrescentada a marca "O texto da decisão está em inglês na fonte"; a tradução fica para a próxima rodada.
- "Pacotes afetados" dos ADRs eram placeholder. Preenchidos com a lista derivada das notas de pacote, marcada como derivada. Não é a lista oficial do ADR; ADRs 0021, 0023, 0029, 0033, 0034, 0035 e 0044 não mapeiam a pacote npm.
- Consumidores de `@agentskit/integrations` não foram listados (busca não feita); marcado como "não listados".
- Histórico `git log` das notas de pacote foi mantido da versão anterior e não foi refeito.
- Links para notas globais que não existem neste worktree (`[[Camada - Framework OSS]]`, `[[00 Hub - Ecossistema AgentsKit]]`, `[[Dúvidas abertas]]`, `[[Capacidades não usadas]]`) continuam no hub e em outras notas fora deste recorte; não foram criados.
- `CONVENTIONS.md` diverge do código em dois pontos: `memory` (escopo lista 5 backends e o código exporta 20+; VM1–VM8 com só 5 escritos) e `tools/integrations` (dono declarado vs. código atual).

**Dúvidas abertas (marcadas nas notas).** Uso no law-os de core, runtime, memory, rag, sandbox e adapters; suíte `adapter-contract` ausente; dono da camada de integrações (`tools` vs `integrations`); escopo e número de invariantes de `memory`; exemplo do README do rag com dependências não declaradas.

**Confiança por nota.**

| Nota | Confiança | Motivo |
|---|---|---|
| 00 Hub - agentskit | média | Contagens e manifests verificados; CLI não executada; links globais ausentes |
| fluxos: Executar um agente | alta | Linhas `runner.ts:96`, `:304`, `controller.ts:27` conferidas |
| fluxos: Pergunta com fontes | alta | Linhas do ask-backend, `railway.json` e nomes de variáveis conferidos |
| fluxos: Copiar agente do Registry | média | Linhas conferidas; "sem rollback" é leitura de comentário e código, não teste |
| decisões: índice | alta | Status e datas conferidos nos cabeçalhos das fontes |
| decisões: ADR-0001 a 0044 (status, data, pacotes) | média | Status e datas conferidos (alta); pacotes afetados derivados (média); corpo não relido |
| grupos/Núcleo: grupo | média | Estabilidade e dependências conferidas; links de grupo corrigidos |
| core | média | Exports, deps, consumidores e scripts conferidos; histórico não refeito |
| runtime | média | Exports, deps e env conferidos; invariantes RT1–RT14 não testados |
| statechart | alta | Exports, deps, sem consumidores e invariantes conferidos |
| validation | alta | Exports, deps, consumidores e cobertura conferidos |
| net | alta | Exports, deps, invariantes e exemplo conferidos |
| grupos/Provedores: grupo | média | Dependências entre pacotes conferidas; CLI não executada |
| adapters | média | Exports e env conferidos; suíte de contrato ausente |
| tools | média | Exports e subcaminhos conferidos; dono da camada em conflito |
| integrations | média | Exports e shims conferidos; consumidores não listados |
| mcp | alta | Exports, deps, sem consumidores e CLI conferidos |
| sandbox | média | Exports e env conferidos; comportamento E2B e limites não testados |
| skills | alta | Exports, deps e ausência de env conferidos |
| grupos/Memória e RAG: grupo | alta | Dependências conferidas; aresta falsa removida |
| memory | média | Exports e subcaminhos conferidos; invariantes CM/VM e backends não testados |
| rag | média | Exports e subcaminhos conferidos; comportamento de loaders e rerankers não testado |

**Verificação (evidência).** `sed` está bloqueado no shell do agente, então a evidência de antes/depois usa `git grep` no commit base (`9f8d8551`) e na árvore de trabalho.

1. Hub, referência de scripts. Antes: `9f8d8551:…00 Hub - agentskit.md:72: - package.json:1 — scripts do monorepo.` Depois: `…00 Hub - agentskit.md:74: - package.json:6 — bloco scripts do monorepo…`.
2. Runtime, variável de ambiente. Antes: `9f8d8551:…agentskit-runtime.md:77: Variáveis identificadas por acesso direto no código: OPENAI_API_KEY.` Depois: `…agentskit-runtime.md:71: - Variáveis de ambiente: nenhuma lida em packages/runtime/src …`.
3. Adapters, variável de ambiente. Antes: `9f8d8551:…agentskit-adapters.md:77: … ANTHROPIC_API_KEY, CLI_SECRET, HOME, OPENAI_API_KEY.` Depois: a palavra `CLI_SECRET` não aparece mais (`git grep` vazio) e a linha 74 descreve `cli/process.ts:79-111`.
4. Tools, variável de ambiente. Antes: `9f8d8551:…agentskit-tools.md:70: … AK_SHELL_TEST_SECRET, OPENAI_API_KEY, SERPER_API_KEY, SLACK_WEBHOOK_URL, TAVILY_API_KEY.` Depois: `AK_SHELL_TEST_SECRET` não aparece mais (`git grep` vazio).
5. Fluxo "Executar um agente", caminho de fonte. Antes: `9f8d8551:…AgentsKit - Executar um agente.md:48: - agentskit/packages/runtime/src/runner.ts:96`. Depois: `…:45: - packages/runtime/src/runner.ts:96 — createRuntime, com os limites do laço.`
6. Fluxo "Executar um agente", linha de término. Antes: `…:50: - agentskit/packages/runtime/src/runner.ts:304 — ausência de chamadas de ferramentas encerra o laço`. Depois: `…:46: - packages/runtime/src/runner.ts:304-305 — sem chamadas de ferramenta, o agente termina (break).`
7. ADR-0041, status. Antes: `9f8d8551:…ADR-0041…md:6: status: aceito`. Depois: `…ADR-0041…md:6: status: proposto`.
8. Net, exemplo. Antes: `9f8d8551:…agentskit-net.md:65: Exemplo real de import do pacote: … packages/net/README.md:26.` (frase sobre o motivo do pacote). Depois: exemplo `import { assertPublicUrl, fetchWithRetry, parseSSEResponse, readJson } from '@agentskit/net'` (`packages/net/README.md:45`).
9. Tools, exemplo. Antes: `9f8d8551:…agentskit-tools.md:58: … packages/tools/README.md:54` (ok). Depois: mesma referência, reconfirmada; o exemplo foi mantido porque estava correto.
10. Memória, grupo. Antes: mermaid `memory[agentskit-memory] --> rag` sem base nos manifests. Depois: diagrama sem aresta e texto "Nenhum dos dois declara dependência do outro" (`agentskit-memory`/`agentskit-rag`: `package.json` conferidos).

**Arquivos alterados.** Somente em `.brain/repos/agentskit/` (hub, `fluxos/`, `decisões/`, `grupos/Núcleo/`, `grupos/Provedores e ferramentas/`, `grupos/Memória e RAG/` e este relatório). Nenhum push.
