---
sidebar_position: 3
---

# Skills

`@agentskit/skills` fornece cinco valores **`SkillDefinition`** embutidos (system prompts + metadados). Skills carregam dicas de **`tools`** e **`delegates`** para o runtime saber quais ferramentas mesclar e quais subagentes preferir durante a delegação.

## Quando usar

- Você quer **personas com opinião** (pesquisador, coder, planejador, …) sem escrever system prompts longos na mão.
- Você compõe personas com **`composeSkills`** para tarefas em várias fases.

Skills customizadas são objetos simples — use [`@agentskit/templates`](../packages/templates) ou defina `SkillDefinition` no código.

## Instalação

```bash
npm install @agentskit/skills
```

Tipos de skill vêm de [`@agentskit/core`](../packages/core).

## Exportações públicas

| Exportação | Papel |
|--------|------|
| `researcher`, `coder`, `planner`, `critic`, `summarizer` | Objetos `SkillDefinition` embutidos |
| `composeSkills(...skills)` | Mescla prompts, dicas de ferramentas e delegates |
| `listSkills()` | `SkillMetadata[]` para UIs de descoberta |

## Usando uma skill

Passe uma skill a `runtime.run()` via a opção `skill`. O `systemPrompt` da skill substitui o system prompt padrão, e quaisquer ferramentas listadas em `skill.tools` são mescladas ao conjunto ativo de ferramentas.

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { researcher } from '@agentskit/skills'
import { webSearch } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  tools: [webSearch()],
})

const result = await runtime.run(
  'What are the trade-offs between Redis and Memcached?',
  { skill: researcher },
)
```

## Skills embutidas

### `researcher`

Pesquisador web metódico que encontra, cruza referências e resume informações de várias fontes.

- **dica de tools:** `['web_search']`
- **delegates:** _(nenhum)_

O pesquisador quebra perguntas em subconsultas, busca cada uma de forma independente, cruza fontes e termina com uma avaliação de confiança.

### `coder`

Engenheiro de software que escreve código limpo, testado e pronto para produção seguindo boas práticas.

- **dica de tools:** `['read_file', 'write_file', 'list_directory', 'shell']`
- **delegates:** _(nenhum)_

O coder entende os requisitos antes de escrever, trata casos extremos e explica decisões de design importantes. Nunca usa tipos `any` nem adiciona abstrações não solicitadas.

### `planner`

Planejador estratégico que quebra tarefas complexas em passos, identifica dependências e coordena agentes especialistas.

- **dica de tools:** _(nenhuma — delegates fazem o trabalho)_
- **delegates:** `['researcher', 'coder']`

O planejador decompõe metas nos menores passos independentemente completáveis e delega cada passo ao especialista correto. Replaneja quando um passo falha em vez de seguir cegamente.

### `critic`

Revisor construtivo que avalia o trabalho quanto a correção, completude e qualidade.

- **dica de tools:** `['read_file']`
- **delegates:** _(nenhum)_

O crítico categoriza problemas por severidade (crítico / importante / menor), oferece correções específicas com raciocínio e sempre reconhece o que funciona bem antes de listar problemas.

### `summarizer`

Resumidor conciso que extrai pontos-chave preservando nuance e estrutura.

- **dica de tools:** _(nenhuma)_
- **delegates:** _(nenhum)_

O resumidor escala o tamanho da saída ao do conteúdo: uma frase para conteúdo curto, marcadores estruturados para conteúdo longo. Nunca introduz informação que não está no original.

## `composeSkills`

Mescle duas ou mais skills em uma. A skill resultante concatena todos os system prompts (separados por cabeçalhos `--- name ---`), deduplica dicas de ferramentas e mescla listas de delegates.

```ts
import { composeSkills, researcher, coder } from '@agentskit/skills'

const fullStackAgent = composeSkills(researcher, coder)

const result = await runtime.run(
  'Research the best TypeScript ORM, then scaffold a basic schema',
  { skill: fullStackAgent },
)
```

O `name` da skill composta é `researcher+coder` e a `description` lista ambos os componentes.

```ts
// Throws — at least one skill is required
composeSkills()

// Single skill passthrough — returns the original unchanged
composeSkills(researcher) // === researcher
```

## `listSkills`

Enumere todas as skills embutidas e seus metadados — útil para UIs de agente ou validar configuração.

```ts
import { listSkills } from '@agentskit/skills'

const skills = listSkills()
// [
//   { name: 'researcher', description: '...', tools: ['web_search'], delegates: [] },
//   { name: 'coder',      description: '...', tools: ['read_file', 'write_file', 'list_directory', 'shell'], delegates: [] },
//   { name: 'planner',    description: '...', tools: [], delegates: ['researcher', 'coder'] },
//   { name: 'critic',     description: '...', tools: ['read_file'], delegates: [] },
//   { name: 'summarizer', description: '...', tools: [], delegates: [] },
// ]
```

Cada entrada é um objeto `SkillMetadata`:

```ts
interface SkillMetadata {
  name: string
  description: string
  tools: string[]       // Tool names this skill expects to have available
  delegates: string[]   // Sub-agent names this skill will delegate to
}
```

## Trazendo sua própria skill

Um `SkillDefinition` é um objeto simples — sem classe.

```ts
import type { SkillDefinition } from '@agentskit/core'

export const translator: SkillDefinition = {
  name: 'translator',
  description: 'Translates text between languages accurately and naturally.',
  systemPrompt: `You are a professional translator...`,
  tools: [],
  delegates: [],
}
```

## Solução de problemas

| Problema | Mitigação |
|-------|------------|
| O planejador nunca delega | Garanta que o runtime tenha ferramentas correspondentes e configuração de delegação de [Delegação](./delegation). |
| Ferramentas da skill não usadas | Registre o `ToolDefinition[]` real (por exemplo `webSearch()`) em `createRuntime`; dicas sozinhas não instalam ferramentas. |
| Prompt composto longo demais | Enxugue skills de origem ou divida em execuções separadas. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/skills`) · [Runtime](./runtime) · [Delegação](./delegation) · [Ferramentas](./tools) · [@agentskit/core](../packages/core)
