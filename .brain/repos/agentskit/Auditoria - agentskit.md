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

### Share: interfaces, qualidade, ferramentas, sites, exemplos, guias

Método: leitura de cada nota, verificação de cada `arquivo:linha` e símbolo no HEAD (`9f8d8551`), conferência de scripts, dependências (`"@agentskit/*"` em `package.json`), variáveis de ambiente (leitura em `src`, não em README/fixtures), histórico (`git log`) e existência de testes. Não houve execução de `pnpm`, testes ou builds: `pnpm` não está instalado. `sed` e `cat` estavam bloqueados neste ambiente; a leitura foi feita com a ferramenta de leitura e `git grep`.

| Item | Resultado |
|---|---|
| Notas auditadas | 43: Interfaces (hub + 8 pacotes), Qualidade e observabilidade (hub + 4), Ferramentas de desenvolvimento (hub + 2), Sites e serviços (hub + 5), Exemplos (hub + 14, incluindo `embedded-raycast`), guias (5). |
| Referências `arquivo:linha` | 766 ocorrências nas 43 notas, no estado final. Todas apontam para arquivo existente e linha dentro do arquivo. Não contei as referências das notas originais. |
| Símbolos em linhas de tabela | 180 linhas com símbolo na primeira célula; todas com o símbolo a até 4 linhas da linha citada. |
| Wikilinks | 205; 204 resolvem para notas do repositório. 1 aponta para `[[Dúvidas abertas]]`, nota global fora deste worktree, não criada. |
| Referências erradas corrigidas | 33 (linha, símbolo ou caminho). Exemplos abaixo. |
| Afirmações corrigidas | 27 (lista abaixo). |
| Afirmações removidas por não verificáveis | 14 (lista abaixo). |
| Comandos de validação | Todos os `pnpm --filter …`, `pnpm check:*`, `pnpm docs:*`, `pnpm release:preflight`, `pnpm size` citados existem em `package.json` do repo ou no `package.json` do pacote. Nenhum foi executado. |

#### Referências erradas corrigidas (exemplos)

- `agentskit-react` · invariante em `packages/react/CONVENTIONS.md:1` → `:21` (`data-ak-*`, headless).
- `agentskit-react` · export `Message` em `src/index.ts:50` → `MessageType` (`Message as MessageType`).
- `agentskit-vue` · invariante `CONVENTIONS.md:1` → `:29` (chamar `useChat` dentro de `setup()`).
- `agentskit-solid` · invariante `CONVENTIONS.md:1` → `:28` (não desestruturar o proxy do store).
- `agentskit-cross-platform` · exemplo `tests/rules.test.ts:33` (string de regra, não import) → `tests/spawn.test.ts:17` (uso real de `spawnProcess`).
- `agentskit-ask-backend` · `createAskHandler` em `handler.ts:4` (comentário) → `handler.ts:183` (definição).
- `agentskit-visual-react` · `Harness` em `Harness.tsx:137` → `:150`.
- `agentskit-example-embedded-raycast` · `createRuntime` em `agentskit-ask.js:42` → `:48` (`:42` é `process.argv`).
- `agentskit-example-react` · caminho `apps/example-example-react/package.json` → `apps/example-react/package.json`; `App` em `:87` → `:89`.
- `agentskit-docs-next` · `INDEXNOW_KEY` atribuído a `docs-new.mjs` → `apps/docs-next/scripts/ping-indexnow.mjs:10` (e `.github/workflows/indexnow.yml:34`).

Contagem das 33 por categoria: 14 de `CONVENTIONS.md:1` trocado pela linha real (react, vue, svelte, solid, angular, react-native, ink, cross-platform, eval, eval-braintrust, observability, observability-langfuse, cli, templates); 6 de `index.ts:N` que apontava para `{` (bloco de reexport sem nome) substituído por símbolos e faixas reais; 13 das demais (as listadas acima, mais `apps/docs-next/package.json:2` e `apps/ask-backend/package.json:2` → `:4`, `scorers.ts` → `scorers/index.ts`, e o `ink` `Message` → `MessageType`).

#### Afirmações corrigidas

| Nota | O que estava errado | O que é verdade | Evidência |
|---|---|---|---|
| Interfaces (hub) | Mermaid com laço `ink --> ink`; tabela de grupos com autorrelação e relações genéricas | Todos os 8 pacotes dependem só de `@agentskit/core` | `packages/*/package.json` (`workspace:*`) |
| `agentskit-solid` | `VITE_ANTHROPIC_API_KEY` apresentada como lida pelo pacote | Só aparece em README e fixture | `packages/solid/README.md:61` |
| `agentskit-react-native` | `EXPO_PUBLIC_ANTHROPIC_API_KEY` como lida pelo pacote | Só README e fixture | `packages/react-native/README.md:63` |
| `agentskit-cross-platform` | Variáveis `AK_TEST` e `HOMEBREW_PREFIX` como lidas | `AK_TEST` só em teste; `HOMEBREW_PREFIX` ausente | `tests/spawn.test.ts:43`; `src/env.ts` |
| `agentskit-react` | "Dados e efeitos": configuração por variável de ambiente | Nenhum `process.env` em `src`; `localStorage` só via `createLocalStorageMemory` | busca em `packages/react/src` |
| `agentskit-observability` | Dependências sem `@agentskit/net` e `cross-platform` | Dependem de `net` e `cross-platform` | `packages/observability/package.json:79-80`, `:118` |
| `agentskit-observability` | `ANTHROPIC_API_KEY` e `LANGSMITH_API_KEY` como lidas | Só README (exemplo) e comentário de documentação | `packages/observability/README.md:57`; `src/langsmith.ts:53` |
| `agentskit-eval` | `ANTHROPIC_API_KEY` como lida pelo pacote | Lidas: `GITHUB_ACTIONS`, `GITHUB_STEP_SUMMARY`, `UPDATE_SNAPSHOTS` | `src/ci/index.ts:53-91`; `src/snapshot/snapshot.ts:204` |
| `agentskit-eval-braintrust` | `GITHUB_PR_NUMBER` lida | Lidas: `BRAINTRUST_API_KEY`, `BRAINTRUST_BASE_URL` | `src/runner.ts:238-239` |
| `agentskit-observability-langfuse` | Variáveis incompletas; exemplo "não localizado" | Também `LANGFUSE_RELEASE` e `LANGFUSE_ENVIRONMENT`; exemplo em `README.md:43` | `src/langfuse.ts:37-38`; README |
| `agentskit-cli` | Dependência em `agentskit-templates`; hub com aresta `cli --> templates` | Onze dependências; nenhuma em `templates` | `packages/cli/package.json:52-62` |
| `agentskit-cli` | Lista de env com `MY_KEY`, `VITE_`, `HOME`, `USERPROFILE`, `PORT` como lidas | Leitura por tabela de provedores e integração; `VITE_` é texto gerado | `src/providers.ts:164`; `src/resolve.ts:77`; `src/init.ts:75` |
| `agentskit-ask-backend` | Lint ausente | Existe `lint` (`tsc --noEmit`) | `apps/ask-backend/package.json:10` |
| `agentskit-ask-backend` | Usado por "sites" | Só o widget do registry chama o endpoint | `apps/registry/components/ask-widget.tsx:138` |
| `agentskit-registry` | Widget persiste thread em `localStorage` | Não encontrado no widget | `apps/registry/components/ask-widget.tsx` (busca sem resultado) |
| `agentskit-landing` | Lê o snapshot na página | Importado por `lib/ecosystem-stats.ts:6` | `apps/landing/lib/ecosystem-stats.ts:6` |
| `agentskit-docs-next` | Analytics e `INDEXNOW_KEY` | PostHog em `lib/analytics-client.ts:33-34`; IndexNow em `scripts/ping-indexnow.mjs:10` | arquivos citados |
| `agentskit-example-ink` | "não grava arquivos" | Memória é `fileChatMemory` (arquivo local) | `apps/example-ink/src/index.tsx:4` |
| `agentskit-example-embedded-raycast` | Validação por `pnpm --filter @agentskit/example-embedded lint` | Host tem `package.json` próprio, fora do workspace (README diz que não usa `workspace:*`) | `apps/example-embedded/README.md:43` |
| `agentskit-example-multi-agent` | "composição de vários agentes" sem base | Importa a skill `planner` | `apps/example-multi-agent/src/App.tsx:3` |
| `agentskit-example-react` | Modo demo indicado pelo texto da tela | Escolha em código (chave OpenAI ou demo) | `apps/example-react/src/App.tsx:75-81` |
| `agentskit-example-runtime` | Lista de arquivos incompleta | `durable.ts`, `speculate.ts`, `topology.ts` | `apps/example-runtime/src/` |
| Exemplos (hub) | Sem a linha do Raycast; comandos `dev` genéricos | Linha adicionada; `dev` por exemplo (`vite`, `tsx src/index.ts`, `echo` no edge) | `apps/example-*/package.json` |
| Guias (adapter, exemplo, pacote, publicação, documentação) | `Notas relacionadas` genéricas; alias de link quebrado | Links reais; alias corrigido | `packages/adapters/package.json:2` etc. |

#### Afirmações removidas por não verificáveis

1. `agentskit-observability`: seção "No law-os" (commit `371860a` inexistente neste repo; caminhos `apps/law-os/*` não rastreados).
2. `agentskit-observability`: lista de variáveis de ambiente com `AK_POSTGRES_TEST_PORT` como de produção (mantida só como de teste).
3. `agentskit-cli`: "pacote é um binário" e a nota anterior sobre a dependência em `templates`.
4. `agentskit-ask-backend`: "usado por sites" (substituído pelo consumo real).
5. `agentskit-registry`: "lê catálogo remoto" e persistência de thread em `localStorage`.
6. `agentskit-docs-next`: "consumidores ... via llms.txt" e as datas dos commits do histórico (mantidos só os assuntos).
7. `agentskit-example-react`: "`dev` se existir script" (o script existe: `vite`).
8. `agentskit-example-edge`: frases de ADR relacionado sem base.
9. Ferramentas (hub): relação de grupo "Provedores" sem evidência.
10. Qualidade e Interfaces (hubs): relações genéricas "Consumidos opcionalmente".
11. `agentskit-eval`: ADR-0040 mantido só como relacionado pelo título (marcado como não verificado no corpo).
12. Notas de pacote: ADRs ligados apenas por busca textual sem vínculo em `fontes` foram retirados (ex.: ADR-0021, 0023, 0029, 0033, 0034, 0035 em `agentskit-ink`).
13. `agentskit-solid`: o subpath `./use-chat` (`packages/solid/package.json:36-39`) não aparecia; foi acrescentado (não é remoção, só registro da correção de conteúdo).
14. Componentes sem JSDoc (`vue`, `solid`, `angular`, `react-native`): as descrições de uma linha são pelo nome do componente. Não estão marcadas como inferidas no texto; a confiança dessas notas é média por isso.

#### Lacunas de cobertura

- Nenhum pacote ou app do meu recorte ficou sem nota. Pacotes de outros grupos (`adapters`, `core`, `mcp`, `memory`, `net`, `rag`, `runtime`, `sandbox`, `skills`, `statechart`, `tools`, `validation`) são de outros auditores.
- Sem README: `example-ink`, `example-multi-agent`, `example-react`. Descrição feita pelo entry file.
- Sem testes: 11 dos 14 exemplos. Só `discord-bot`, `slack-bot` e `teams-bot` têm `tests/adapter.test.ts`.
- ADR específico de exemplo ou app: não identificado.
- Responsáveis: `.github/CODEOWNERS` existe, mas não foi conferido por regra; as notas dizem "sem regra específica".
- Global: `[[Dúvidas abertas]]` referenciada em 3 notas; a nota global não está neste worktree.
- Dúvidas registradas nas notas: caminho do Langfuse (`@agentskit/observability/langfuse` no README e no `CONVENTIONS.md:12` versus `src/index.ts` sem export); se `@agentskit/eval/braintrust` reexporta `@agentskit/eval-braintrust`.
- Frontmatter deste arquivo: `tipo: conceito`; o brief pede `tipo: global`. Não alterei, por ser de outro share.

#### Confiança por nota

| Nota | Confiança | Motivo |
|---|---|---|
| 00 Grupo - agentskit - Interfaces | alta | Manifests e mermaid conferidos |
| agentskit-react | alta | Reescrita completa; referências conferidas |
| agentskit-vue | média | Componentes descritos pelo nome; `ChatRoot` sem doc |
| agentskit-svelte | média | Componentes pelo JSDoc; semântica do store pelo CONVENTIONS |
| agentskit-solid | alta | Entry, subpath e invariantes conferidos |
| agentskit-angular | média | Serviço pelo CONVENTIONS; descrições dos componentes pelo nome |
| agentskit-react-native | média | Invariantes e entry conferidos; sem doc por símbolo |
| agentskit-ink | média | Superfície grande; descrições por símbolo parciais |
| agentskit-cross-platform | média | Superfície grande; algumas descrições pelo nome |
| 00 Grupo - agentskit - Qualidade e observabilidade | alta | Dependências conferidas |
| agentskit-eval | alta | Subpaths e env conferidos |
| agentskit-eval-braintrust | alta | Entry, env e invariante conferidos |
| agentskit-observability | média | 90 exports mapeados por faixa; descrições pelo nome; dúvida do Langfuse |
| agentskit-observability-langfuse | alta | Entry, env e invariantes conferidos |
| 00 Grupo - agentskit - Ferramentas de desenvolvimento | alta | Dependências conferidas |
| agentskit-cli | média | Muitos exports; env por mecanismo |
| agentskit-templates | alta | Entry, dependência e invariante conferidos |
| 00 Grupo - agentskit - Sites e serviços | alta | Papéis conferidos |
| agentskit-ask-backend | alta | Linhas, env e RFC conferidas |
| agentskit-docs-next | média | Scripts e env conferidos; consumidores não |
| agentskit-landing | alta | Entry, env e snapshot conferidos |
| agentskit-registry | média | Entry e endpoint conferidos; catálogo por funções |
| agentskit-visual-react | alta | Entry, scripts e snapshots conferidos |
| 00 Grupo - agentskit - Exemplos | alta | 14 notas e link do Raycast conferidos |
| agentskit-example-discord-bot | alta | Entry, env e teste conferidos |
| agentskit-example-dspy | média | Só `makeAgent` conferido |
| agentskit-example-edge | alta | Rotas e bindings conferidos |
| agentskit-example-embedded | alta | Hosts e env conferidos |
| agentskit-example-embedded-raycast | média | Validação do host dependente de inferência |
| agentskit-example-flow | alta | `compileFlow` e env conferidos |
| agentskit-example-ink | média | Sem README; memória conferida |
| agentskit-example-multi-agent | média | Sem README; `planner` conferido |
| agentskit-example-rag-chat | média | Ingestão e retriever conferidos; sem teste |
| agentskit-example-react | alta | Escolha OpenAI/demo e memória conferidas |
| agentskit-example-runtime | alta | Adapter simulado e `createRuntime` conferidos |
| agentskit-example-slack-bot | alta | Entry, env e teste conferidos |
| agentskit-example-teams-bot | alta | `TEAMS_DISABLE_AUTH` e entry conferidos |
| agentskit-example-webllm | média | README e `useChat` conferidos; sem teste |
| guias (5) | média | Comandos conferidos; orientação geral sem fonte específica |

Limite declarado: a verificação mecânica confirma existência, linha e símbolo; o sentido de cada descrição foi conferido à mão nas notas de confiança alta.
