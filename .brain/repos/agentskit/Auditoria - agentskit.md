---
tipo: conceito
repo: agentskit
camada: docs
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: [CONVENTIONS.md, README.md]
tags: [verificacao, repo/agentskit]
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
