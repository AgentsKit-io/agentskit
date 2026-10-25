import { expectTypeOf } from 'vitest'
import { openaiCompatible, cloudflareAiGateway, workersAi } from '../src'
import type { DeepSeekConfig, OpenAIConfig, OpenRouterConfig } from '../src'
import type { OpenAICompatibleConfig } from '../src/openai-compatible'

expectTypeOf<OpenAIConfig['apiKey']>().toEqualTypeOf<string>()
expectTypeOf<OpenAICompatibleConfig['apiKey']>().toEqualTypeOf<string>()
expectTypeOf<OpenRouterConfig['apiKey']>().toEqualTypeOf<string>()
expectTypeOf<DeepSeekConfig['apiKey']>().toEqualTypeOf<string>()

openaiCompatible({ model: 'synthetic', headers: { 'X-Synthetic': 'present' }, path: '/custom' })
cloudflareAiGateway({ model: 'synthetic', accountId: 'synthetic', gatewayId: 'synthetic' })
workersAi({ model: 'synthetic', accountId: 'synthetic' })
