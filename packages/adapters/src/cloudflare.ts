import type { AdapterFactory } from '@agentskit/core'
import { openaiCompatible, type OpenAICompatibleConfig } from './openai-compatible'

/** Cloudflare account and optional AI Gateway authentication. */
export interface CloudflareAiGatewayConfig extends OpenAICompatibleConfig {
  accountId: string
  gatewayId: string
  gatewayToken?: string
}

/** OpenAI-compatible AI Gateway endpoint; supports gateway-only authentication. */
export function cloudflareAiGateway(config: CloudflareAiGatewayConfig): AdapterFactory {
  const headers = new Headers(config.headers)
  if (config.gatewayToken) headers.set('cf-aig-authorization', `Bearer ${config.gatewayToken}`)
  return openaiCompatible({
    ...config,
    baseUrl: config.baseUrl ?? `https://gateway.ai.cloudflare.com/v1/${encodeURIComponent(config.accountId)}/${encodeURIComponent(config.gatewayId)}/compat`,
    path: config.path ?? '/chat/completions',
    headers,
  })
}

/** Workers AI REST configuration; no Cloudflare runtime binding is required. */
export interface WorkersAiConfig extends OpenAICompatibleConfig {
  accountId: string
}

/** Workers AI's OpenAI-compatible REST endpoint. */
export function workersAi(config: WorkersAiConfig): AdapterFactory {
  return openaiCompatible({
    ...config,
    baseUrl: config.baseUrl ?? `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai/v1`,
    path: config.path ?? '/chat/completions',
  })
}
