import {
  runAdapterContract,
  openAISuccessBody,
  anthropicSuccessBody,
  geminiSuccessBody,
  ollamaSuccessBody,
} from './contract'
import {
  openai,
  anthropic,
  gemini,
  grok,
  deepseek,
  kimi,
  mistral,
  cohere,
  together,
  groq,
  fireworks,
  openrouter,
  huggingface,
  ollama,
  lmstudio,
  vllm,
  llamacpp,
  cerebras,
  bail,
  azureOpenAI,
} from '../src/index'

const oai = openAISuccessBody
const anth = anthropicSuccessBody
const gem = geminiSuccessBody
const oll = ollamaSuccessBody

// Disable shared fetch retries so A9 500 stubs fail in one attempt.
const noRetry = { maxAttempts: 1, sleep: async () => {} }

// One contract block per adapter — all OpenAI-compatible adapters share the
// same fetch shape, so they share the same successBody factory.
runAdapterContract({ name: 'openai',     build: () => openai({ apiKey: 'k', model: 'gpt-4o-mini', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'anthropic',  build: () => anthropic({ apiKey: 'k', model: 'claude-sonnet-4-6', retry: noRetry }), successBody: anth })
runAdapterContract({ name: 'gemini',     build: () => gemini({ apiKey: 'k', model: 'gemini-2.5-flash', retry: noRetry }), successBody: gem })
runAdapterContract({ name: 'grok',       build: () => grok({ apiKey: 'k', model: 'grok-2', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'deepseek',   build: () => deepseek({ apiKey: 'k', model: 'deepseek-chat', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'kimi',       build: () => kimi({ apiKey: 'k', model: 'moonshot-v1-8k', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'mistral',    build: () => mistral({ apiKey: 'k', model: 'mistral-small-latest', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'cohere',     build: () => cohere({ apiKey: 'k', model: 'command-r-plus', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'together',   build: () => together({ apiKey: 'k', model: 'meta-llama/Llama-3-70b', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'groq',       build: () => groq({ apiKey: 'k', model: 'llama-3.3-70b-versatile', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'fireworks',  build: () => fireworks({ apiKey: 'k', model: 'accounts/fireworks/models/llama-v3-70b-instruct', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'openrouter', build: () => openrouter({ apiKey: 'k', model: 'meta-llama/llama-3-70b', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'huggingface',build: () => huggingface({ apiKey: 'k', model: 'meta-llama/Llama-3-70b', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'ollama',     build: () => ollama({ model: 'llama3.1', retry: noRetry }), successBody: oll })
runAdapterContract({ name: 'lmstudio',   build: () => lmstudio({ apiKey: 'lm-studio', model: 'local-model', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'vllm',       build: () => vllm({ apiKey: 'k', model: 'meta-llama/Llama-3-70b', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'llamacpp',   build: () => llamacpp({ apiKey: 'k', model: 'local', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'cerebras',   build: () => cerebras({ apiKey: 'k', retry: noRetry }), successBody: oai })
runAdapterContract({ name: 'bail/qwen',  build: () => bail({ apiKey: 'k', retry: noRetry }), successBody: oai })
runAdapterContract({
  name: 'azureOpenAI',
  build: () => azureOpenAI({
    apiKey: 'k',
    endpoint: 'https://my-resource.openai.azure.com',
    deployment: 'my-gpt4o',
    retry: noRetry,
  }),
  successBody: oai,
})

// Adapters that need their own contract surface (different fetch shape, SDK
// peer dep, or two-step protocol) live in dedicated test files:
//   - bedrock     → tests/bedrock.test.ts (uses an injected SDK client)
//   - replicate   → tests/replicate.test.ts (two-step prediction + SSE)
//   - vertex      → tests/vertex.test.ts (OAuth tokens)
//   - langchain / langgraph / vercelAI → wrap third-party runtimes
