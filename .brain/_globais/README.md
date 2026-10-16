# brain — segundo cérebro do ecossistema AgentsKit

Vault Obsidian em português para entender os 19 repositórios da AgentsKit-io: o que fazem, como se ligam, onde podem rodar e onde guardam dados. As notas descrevem os commits analisados; configuração versionada não comprova implantação em produção.

Abra o Obsidian → **Abrir pasta como vault existente** → selecione esta pasta. Comece por [[00 Hub - Ecossistema AgentsKit]]. Use os links internos e o grafo para navegar.

| Lugar | Conteúdo |
|---|---|
| Raiz | Hub, [[Glossário]], [[Mapa de dependências]], [[Infra e deploy]], [[Onde ficam os dados]], [[Dúvidas abertas]] e [[Capacidades não usadas]] |
| `repos/<repo>/` | Hub de cada repo, `pacotes/`, `apps/` e `fluxos/` com etapas; `.github` usa a pasta `github-org` |
| `_templates/` | Modelos de hub, pacote, fluxo e etapa |
| `scripts/` | Verificação de links e detecção de notas desatualizadas; Node sem dependências |
| `.claude/skills/refresh-brain/` e `AGENTS.md` | Instruções de atualização para agentes |

Leia [CONVENTIONS.md](CONVENTIONS.md) antes de escrever. Não copie valores de segredos nem dados de clientes.

Para conferir os links, a partir da raiz do vault:

```sh
node scripts/check-links.mjs
node --test scripts/vault.test.mjs
```

O checker lê todos os arquivos Markdown, resolve links pelo nome do arquivo e termina com erro se houver destino ausente ou basename duplicado. Links com alias e heading usam o mesmo destino; a existência do heading não é validada.

Para encontrar notas que precisam de releitura:

```sh
node scripts/refresh-brain.mjs
node scripts/refresh-brain.mjs --root /caminho/dos/clones
node scripts/refresh-brain.mjs --fetch --strict
```

O padrão é `~/workspace/AgentsKit-io`, comparando `commits` com o HEAD local, sem rede. `--fetch` busca `origin` de cada repo e compara com `origin/main`. O relatório Markdown agrupa notas por repo e mostra o histórico das `fontes` citadas até `origin/main`, quando disponível. Sem fontes alteradas, uma nota pode precisar apenas de reconfirmação, sempre após leitura. Sem `--strict`, stale e falhas são relatados com saída 0; com ele, qualquer stale ou falha produz saída 1.

Releia as fontes mudadas, atualize a nota, o SHA e `verificado-em`, execute os dois scripts e faça commit `docs(<repo>): atualiza notas`. Não atualize apenas a data ou o hash para esconder uma divergência. Dúvidas de operação continuam em [[Dúvidas abertas]].
