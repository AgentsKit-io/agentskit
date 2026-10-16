# Convenções do vault (v2)

O vault é a fonte de conhecimento do ecossistema AgentsKit para **pessoas e agentes**. Profundidade vale mais que pressa: cada afirmação precisa de evidência (`arquivo:linha` num commit) ou vai para [[Dúvidas abertas]].

Padrão de estilo: [[Revisão de contratos - law-os]] e [[os-flow]].

## Navegação em níveis

```
00 Hub - Ecossistema AgentsKit
  └ Camada - <camada>            (5: Framework OSS, Plataforma, Produtos, Ferramentas, Infra)
      └ 00 Hub - <repo>
          └ 00 Grupo - <repo> - <Grupo>   (só nos repos grandes)
              └ <pacote>
```

- Toda nota tem **exatamente um** link de volta ao seu pai na primeira linha após o tldr: `← [[00 Grupo - agentskit-os - Execução de fluxos]]` (ou ao hub do repo, nos repos sem grupos).
- O hub do repo liga os grupos (ou os pacotes, sem grupos), os fluxos, os guias e o índice de decisões. Não liga pacote a pacote quando há grupos.
- Links laterais (dependência, conceito, ADR) ficam nas tabelas e no texto, não no link de volta.

## Pastas

```
00 Hub - Ecossistema AgentsKit.md, Glossário.md, Mapa de dependências.md, Infra e deploy.md,
Onde ficam os dados.md, Dúvidas abertas.md, Capacidades não usadas.md   (globais)
camadas/Camada - <camada>.md
conceitos/<Conceito>.md
guias/<Guia transversal>.md
repos/<repo>/00 Hub - <repo>.md
repos/<repo>/grupos/<Grupo>/00 Grupo - <repo> - <Grupo>.md   (agentskit-os, agentskit, law-os, agentskit-chat)
repos/<repo>/grupos/<Grupo>/<pacote>.md
repos/<repo>/pacotes/<pacote>.md | apps/<app>.md              (repos sem grupos)
repos/<repo>/fluxos/<Fluxo>/...
repos/<repo>/guias/<Guia>.md
repos/<repo>/decisões/00 Decisões - <repo>.md   (índice por tema)
repos/<repo>/decisões/<repo> ADR-NNNN - <título curto>.md
_templates/, scripts/, .obsidian/graph.json
```

## Nomes

- Únicos no vault inteiro (o Obsidian resolve `[[nome]]` pelo nome do arquivo). `scripts/check-links.mjs` falha em duplicados.
- Pacote: nome npm sem escopo (`os-flow`); os do framework público levam prefixo `agentskit-` (`agentskit-core`); em colisão, prefixe com o repo.
- Grupo: `00 Grupo - <repo> - <Grupo>`. ADR: `<repo> ADR-0043 - Formato canônico do fluxo`. Conceito: substantivo no singular (`Pack`, `Contrato de saída`).

## Frontmatter (validado por `scripts/check-frontmatter.mjs`)

```yaml
tipo: ecossistema | camada | repo | grupo | pacote | app | fluxo | etapa | conceito | adr | guia | global
repo: <repo>                  # omitido em globais/conceitos transversais
grupo: <Grupo>                # pacotes dos repos com grupos
camada: framework | plataforma | produto | ferramenta | infra
npm: "@escopo/nome"           # se publicado
visibilidade: publico | privado
status: aceito | proposto | substituído | rejeitado   # só adr
substitui: [ADR-NNNN] / substituido-por: [ADR-NNNN]   # só adr
verificado-em: AAAA-MM-DD
commits: { <repo>: <sha curto> }
metodo: "análise estática; nada foi executado"   # ou o que foi executado (ex.: doc-bridge index)
fontes: [caminhos relativos ao repo]
tags: [<tipo>, repo/<repo>, camada/<camada>, grupo/<slug-do-grupo>]
```

## Corpo da nota de pacote (nesta ordem)

1. `# <nome>` + `> [!tldr] Em linguagem comum` (para quem não programa) + link de volta.
2. **O que faz e por que existe** — responsabilidade, limites, o problema que resolve.
3. **API e contratos** — o que exporta (funções, classes, tipos, eventos, schemas, rotas, CLI), com assinatura resumida e **um exemplo real** copiado do código, de um teste ou de um consumidor (com `arquivo:linha`). Tabela: símbolo · tipo · para que serve · onde.
4. **Quem usa e do que depende** — tabela com `[[links]]`: dependências internas, consumidores (dentro e fora do repo), dependências externas relevantes.
5. **Dados e efeitos** — o que lê e grava (tabelas, buckets, filas, arquivos), variáveis de ambiente (**só o nome** e o efeito), chamadas de rede, permissões e capabilities exigidas.
6. **Como mexer (para agentes)** — por onde começar a ler (arquivo de entrada), invariantes que não podem quebrar, testes que cobrem cada parte (caminhos), comando exato de validação do pacote, armadilhas comuns, quem revisa.
7. **Decisões e história** — ADRs que o afetam (`[[agentskit-os ADR-0009 - ...]]`), por que é assim, mudanças recentes relevantes (resumo do `git log` do pacote: data · commit · o quê).
8. `> [!info]- Detalhe técnico` recolhido com as referências `arquivo:linha`.
9. `> [!bug] Existe, mas ninguém usa` quando couber (e em [[Capacidades não usadas]]).

Notas de app seguem a mesma ordem. Hubs, grupos, fluxos, conceitos, ADRs e guias usam os templates em `_templates/`.

## Conceitos, ADRs e guias

- **Conceito**: explicado uma vez, em `conceitos/`; as notas linkam o conceito em vez de redefinir. Seções: o que é · exemplo · onde aparece (tabela de notas) · termos parecidos que não são a mesma coisa.
- **ADR**: uma nota por ADR de cada repo. Seções: status e datas · a decisão em linguagem comum · contexto · consequências · pacotes afetados (links) · substitui / substituído por · fonte (`docs/adr/NNNN-*.md`).
- **Guia**: tarefa recorrente tirada de AGENTS.md, CONTRIBUTING, runbooks, scripts e workflows. Seções: quando usar · pré-requisitos · passos com **comandos reais** · como validar · erros comuns · notas relacionadas.

## Evidência e verificação

- Toda afirmação técnica cita `arquivo:linha` no commit do frontmatter. Símbolos citados entre crases (`buildLiveHandlers`) precisam existir no arquivo citado. `scripts/verify-refs.mjs` confere ambos.
- doc-bridge: quando o repo tem `doc-bridge.config.json` ou `.doc-bridge/index.json`, use o índice como fonte objetiva de entidades, relações, pontos de edição e comandos de validação, e diga isso em `metodo`.
- O que não for confirmado vai para [[Dúvidas abertas]], nunca é inventado. Cada repo tem um relatório de auditoria em `repos/<repo>/Auditoria - <repo>.md`.

## Proibido

Valores de segredos, tokens, chaves, URLs privadas com credenciais ou dados de clientes. Cite o nome da variável, nunca o valor.

## Atualizar e conferir

- `node scripts/refresh-brain.mjs` lista notas defasadas (`--root`, `--fetch`, `--strict`).
- `node scripts/check-links.mjs` — zero links quebrados e zero nomes duplicados.
- `node scripts/check-frontmatter.mjs` — frontmatter conforme o schema acima.
- `node scripts/verify-refs.mjs --root ~/workspace/AgentsKit-io` — cada `arquivo:linha` e símbolo citado existe no commit.
