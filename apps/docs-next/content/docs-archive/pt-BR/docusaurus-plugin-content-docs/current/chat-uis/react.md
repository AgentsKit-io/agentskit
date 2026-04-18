---
sidebar_position: 1
---

# @agentskit/react

Interface de chat em React construída sobre [`@agentskit/core`](../packages/core). Oferece três hooks e sete componentes headless estilizados via variáveis CSS.

## Quando usar

- **Chat com streaming** no navegador com adaptadores LLM plugáveis e ferramentas, memória, RAG e skills opcionais.
- Você quer markup **headless** (`data-ak-*`) e seu próprio CSS ou design system.

**Considere** [`@agentskit/ink`](./ink) para apps de terminal e [`@agentskit/runtime`](../agents/runtime) para agentes headless sem React.

## Instalação

```bash
npm install @agentskit/react @agentskit/core
# optional: real AI providers
npm install @agentskit/adapters
```

## Hooks

### `useChat`

O hook principal. Cria e gerencia uma sessão de chat completa.

```tsx
import { useChat } from '@agentskit/react'

const chat = useChat({
  adapter: myAdapter,          // required — AdapterFactory
  systemPrompt: 'You are...', // optional
  memory: myMemory,           // optional — ChatMemory
  tools: [...],               // optional — ToolDefinition[]
})
```

#### Configuração de `useChat` (`ChatConfig`)

| Opção | Tipo | Descrição |
|--------|------|-------------|
| `adapter` | `AdapterFactory` | **Obrigatório.** Fábrica de provedor de `@agentskit/adapters` ou customizada. |
| `systemPrompt` | `string` | Anteposta como mensagem de sistema ao enviar. |
| `temperature` | `number` | Repassada ao adaptador quando suportado. |
| `maxTokens` | `number` | Limite superior do tamanho da conclusão quando suportado. |
| `tools` | `ToolDefinition[]` | Funções que o modelo pode chamar; resultados voltam como mensagens de ferramenta. |
| `skills` | `SkillDefinition[]` | Enriquecem o system prompt e injetam ferramentas da skill antes do envio. |
| `memory` | `ChatMemory` | Persiste e recarrega `Message[]` entre sessões ([Memória](../data-layer/memory)). |
| `retriever` | `Retriever` | Injeta contexto recuperado a cada turno ([RAG](../data-layer/rag)). |
| `initialMessages` | `Message[]` | Semente da transcrição antes da primeira mensagem do usuário. |
| `onMessage` | callback | Chamado com cada `Message` persistido conforme o controlador atualiza o histórico. |
| `onError` | callback | Erros de stream ou de ferramenta. |
| `onToolCall` | callback | Observa ou intercepta execução de ferramentas ([Ferramentas](../agents/tools)). |
| `observers` | `Observer[]` | Fluxo de eventos de baixo nível ([Observabilidade](../infrastructure/observability)). |

O hook também expõe métodos do controlador como **`approve` / `deny`** para ferramentas human-in-the-loop quando as definições subjacentes pedem confirmação.

Retorna um objeto `ChatReturn`:

| Propriedade | Tipo | Descrição |
|---|---|---|
| `messages` | `Message[]` | Histórico completo da conversa |
| `input` | `string` | Valor atual do campo de entrada |
| `status` | `'idle' \| 'streaming' \| 'error'` | Status da sessão |
| `error` | `Error \| null` | Último erro, se houver |
| `send(text)` | `(text: string) => void` | Envia uma mensagem |
| `stop()` | `() => void` | Aborta o stream atual |
| `retry()` | `() => void` | Repete a última requisição |
| `setInput(val)` | `(val: string) => void` | Atualiza o valor de entrada |
| `clear()` | `() => void` | Limpa a conversa |
| `approve(id)` / `deny(id, reason?)` | | Confirma ou rejeita chamadas de ferramenta pendentes quando aplicável. |

### `useStream`

Hook de nível mais baixo para consumir um único `StreamSource` diretamente.

```tsx
import { useStream } from '@agentskit/react'

const { text, status, error, stop } = useStream(source, {
  onChunk: (chunk) => console.log(chunk),
  onComplete: (full) => console.log('done', full),
  onError: (err) => console.error(err),
})
```

### `useReactive`

Contêiner de estado reativo que dispara re-renderizações em mutações de propriedades.

```tsx
import { useReactive } from '@agentskit/react'

const state = useReactive({ count: 0, label: 'hello' })
// Mutate directly — component re-renders automatically
state.count++
```

## Exemplo completo (adaptador de demo — sem chave de API)

```tsx
import { useChat, ChatContainer, Message, InputBar, ThinkingIndicator } from '@agentskit/react'
import type { AdapterFactory } from '@agentskit/react'
import '@agentskit/react/theme'

function createDemoAdapter(): AdapterFactory {
  return {
    createSource: ({ messages }) => {
      let cancelled = false
      return {
        stream: async function* () {
          const last = [...messages].reverse().find(m => m.role === 'user')
          const reply = `You said: "${last?.content ?? ''}". This is a demo response.`
          for (const chunk of reply.match(/.{1,20}/g) ?? []) {
            if (cancelled) return
            await new Promise(r => setTimeout(r, 40))
            yield { type: 'text' as const, content: chunk }
          }
          yield { type: 'done' as const }
        },
        abort: () => { cancelled = true },
      }
    },
  }
}

export default function App() {
  const chat = useChat({
    adapter: createDemoAdapter(),
    systemPrompt: 'You are a helpful assistant.',
  })

  return (
    <ChatContainer>
      {chat.messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <ThinkingIndicator visible={chat.status === 'streaming'} />
      <InputBar chat={chat} placeholder="Say something..." />
    </ChatContainer>
  )
}
```

## Trocar para um provedor real

Substitua o adaptador — nada mais muda:

```tsx
import { anthropic } from '@agentskit/adapters'

const chat = useChat({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})
```

```tsx
import { openai } from '@agentskit/adapters'

const chat = useChat({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }),
})
```

## Atributos `data-ak-*`

Cada componente emite atributos `data-ak-*` para você estilizar ou selecionar sem nomes de classe:

| Atributo | Elemento | Valores |
|---|---|---|
| `data-ak-chat-container` | wrapper `<div>` | — |
| `data-ak-message` | wrapper da mensagem | — |
| `data-ak-role` | wrapper da mensagem | `user`, `assistant`, `system`, `tool` |
| `data-ak-status` | wrapper da mensagem | `idle`, `streaming`, `done`, `error` |
| `data-ak-content` | corpo da mensagem | — |
| `data-ak-avatar` | slot do avatar | — |
| `data-ak-actions` | slot de ações | — |
| `data-ak-input-bar` | wrapper do formulário | — |
| `data-ak-input` | textarea | — |
| `data-ak-send` | botão enviar | — |
| `data-ak-thinking` | div de pensamento | — |
| `data-ak-markdown` | wrapper markdown | — |
| `data-ak-streaming` | wrapper markdown | `true` durante streaming |
| `data-ak-code-block` | wrapper de bloco de código | — |
| `data-ak-language` | wrapper de bloco de código | string de linguagem |
| `data-ak-copy` | botão copiar | — |
| `data-ak-tool-call` | wrapper de chamada de ferramenta | — |
| `data-ak-tool-status` | wrapper de chamada de ferramenta | `pending`, `running`, `done`, `error` |

Veja [Theming](./theming.md) para a referência completa de variáveis CSS.

## Composição

- Prefira **wrappers apresentacionais pequenos** em torno de `ChatContainer`, `Message` e `InputBar` em vez de bifurcar internos.
- Use **`data-ak-*`** para tokens de tema; para MUI/shadcn, veja [Chat MUI](../examples/mui-chat) e [Chat shadcn](../examples/shadcn-chat).
- **`ToolCallView`** e **`Markdown`** aceitam props padrão — combine com seu roteador para links profundos dentro do conteúdo do assistente.

## Notas de produção

- Mantenha **chaves de API no servidor** quando possível (route handlers, server actions); use [`vercelAI`](../data-layer/adapters) ou um BFF fino que devolva um stream.
- Alinhe **versões `@agentskit/*`** na mesma release minor para evitar deriva de tipos com `core`.

## Solução de problemas

| Sintoma | Provável causa |
|---------|----------------|
| Mensagens duplicadas no React Strict Mode | Esperado em dev; em produção deve bater com um único mount. Se não, garanta um único `useChat` por id de sessão. |
| Stream preso em `streaming` | O adaptador não emitiu `{ type: 'done' }` ou a rede travou; chame `stop()` e inspecione `abort` do adaptador. |
| Ferramentas nunca invocadas | `description` / `schema` fracos; o modelo pode ignorar. Aperte o schema e o system prompt. |
| Estilos faltando | Importe `@agentskit/react/theme` ou defina variáveis CSS em [Theming](./theming). |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/react`) · [Componentes](./components) · [Theming](./theming) · [Ink](./ink) · [@agentskit/core](../packages/core)
