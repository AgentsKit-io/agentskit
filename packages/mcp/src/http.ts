import { ConfigError, ErrorCodes, type ArgsValidator, type ToolDefinition } from '@agentskit/core'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import {
  createProtocolServer,
  definitionFor,
  normalizeServerOptions,
  type McpAuthIdentity,
  type McpResourceDefinition,
  type McpServer,
  type McpServerEvent,
  type McpToolDefinition,
} from './server'

/** Verifies a bearer token and returns the caller identity, or denies with null. */
export type BearerVerifier = (
  token: string,
  request: Request,
) => McpAuthIdentity | null | undefined | Promise<McpAuthIdentity | null | undefined>

/** RFC 9728 protected-resource metadata served by the handler. */
export interface ProtectedResourceMetadata {
  resource: string
  authorization_servers: string[]
  scopes_supported?: string[]
  bearer_methods_supported: string[]
}

/** Security and server options for the Streamable HTTP handler. */
export interface StreamableHttpOptions {
  /** An existing server handle to expose. Its tools and resources are reused. */
  server?: McpServer
  /** Tools to expose when `server` is not provided. */
  tools?: McpToolDefinition[]
  resources?: McpResourceDefinition[]
  serverInfo?: { name: string; version: string }
  onEvent?: (event: McpServerEvent) => void
  authorizeToolCall?: (tool: ToolDefinition, args: Record<string, unknown>) => boolean | Promise<boolean>
  validateArgs?: ArgsValidator
  exposeErrors?: boolean
  /** Verify `Authorization: Bearer` tokens. Omit to run without authentication. */
  verifyBearer?: BearerVerifier
  /** RFC 8707 resource identifier (the protected MCP endpoint). Required with `verifyBearer`. */
  resource?: string
  /** Authorization servers advertised in the protected-resource metadata. */
  authorizationServers?: string[]
  scopesSupported?: string[]
  /**
   * Metadata path. Defaults to the RFC 9728 path-suffixed form derived from
   * `resource` (`/.well-known/oauth-protected-resource/<path>`).
   */
  metadataPath?: string
  /** Return JSON instead of an SSE stream. */
  enableJsonResponse?: boolean
}

/** Callable Web handler for MCP Streamable HTTP. */
export interface StreamableHttpHandler {
  (request: Request): Promise<Response>
  handleRequest: (request: Request) => Promise<Response>
  close: () => Promise<void>
}

const DEFAULT_METADATA_PATH = '/.well-known/oauth-protected-resource'

/**
 * Expose an MCP server over Streamable HTTP using Web `Request`/`Response`
 * objects. The handler is stateless and can run in Node.js, Cloudflare
 * Workers, Deno, and Bun.
 */
export function createStreamableHttpHandler(options: StreamableHttpOptions): StreamableHttpHandler {
  if (options.server === undefined && options.tools === undefined) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createStreamableHttpHandler requires a server or tools',
    })
  }

  if (options.verifyBearer && options.resource === undefined) {
    throw invalid('resource is required when verifyBearer is set')
  }
  if (options.metadataPath !== undefined && options.resource === undefined) {
    throw invalid('resource is required when metadataPath is set')
  }
  if (options.resource !== undefined && !isAbsoluteUrl(options.resource)) {
    throw invalid('resource must be an absolute URL')
  }

  const definition = options.server
    ? definitionFor(options.server)
    : normalizeServerOptions({ ...options, tools: options.tools ?? [] })

  const metadataPath = options.metadataPath ?? metadataPathFor(options.resource)
  const handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    if (
      metadataPath !== undefined &&
      options.resource !== undefined &&
      request.method === 'GET' &&
      url.pathname === pathnameOf(metadataPath)
    ) {
      return json(protectedResourceMetadata(options.resource, options))
    }

    let authInfo: AuthInfo | undefined
    if (options.verifyBearer) {
      const token = bearerToken(request)
      if (token === undefined) {
        return unauthorized(options, 'missing bearer token', 'invalid_request')
      }
      let identity: McpAuthIdentity | null | undefined
      try {
        identity = await options.verifyBearer(token, request)
      } catch {
        identity = undefined
      }
      if (!identity) {
        return unauthorized(options, 'invalid bearer token', 'invalid_token')
      }
      authInfo = {
        token,
        clientId: identity.subject,
        scopes: identity.scopes ?? [],
        extra: {
          subject: identity.subject,
          ...(identity.claims === undefined ? {} : { claims: identity.claims }),
        },
      }
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      ...(options.enableJsonResponse === undefined ? {} : { enableJsonResponse: options.enableJsonResponse }),
    })
    const protocol = createProtocolServer(definition)
    await protocol.connectSdk(transport)
    return transport.handleRequest(request, authInfo === undefined ? undefined : { authInfo })
  }

  const handler = handle as StreamableHttpHandler
  handler.handleRequest = handle
  handler.close = async () => undefined
  return handler
}

function protectedResourceMetadata(
  resource: string,
  options: StreamableHttpOptions,
): ProtectedResourceMetadata {
  return {
    resource,
    authorization_servers: options.authorizationServers ?? [],
    ...(options.scopesSupported === undefined ? {} : { scopes_supported: options.scopesSupported }),
    bearer_methods_supported: ['header'],
  }
}

function unauthorized(
  options: StreamableHttpOptions,
  description: string,
  error: 'invalid_request' | 'invalid_token',
): Response {
  const metadataUrl = metadataUrlFor(options)
  return json(
    { error, error_description: description },
    401,
    metadataUrl === undefined
      ? {}
      : { 'WWW-Authenticate': `Bearer resource_metadata="${metadataUrl}"` },
  )
}

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get('authorization')
  if (header === null) return undefined
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  const token = match?.[1]?.trim()
  return token === undefined || token.length === 0 ? undefined : token
}

function metadataPathFor(resource: string | undefined): string | undefined {
  if (resource === undefined) return undefined
  const path = new URL(resource).pathname.replace(/\/+$/, '')
  return path === '' ? DEFAULT_METADATA_PATH : `${DEFAULT_METADATA_PATH}${path}`
}

function pathnameOf(metadataPath: string): string {
  if (isAbsoluteUrl(metadataPath)) return new URL(metadataPath).pathname
  return metadataPath.startsWith('/') ? metadataPath : `/${metadataPath}`
}

function metadataUrlFor(options: StreamableHttpOptions): string | undefined {
  if (options.resource === undefined) return undefined
  const metadataPath = options.metadataPath ?? metadataPathFor(options.resource)
  if (metadataPath === undefined) return undefined
  if (isAbsoluteUrl(metadataPath)) return metadataPath
  const path = metadataPath.startsWith('/') ? metadataPath : `/${metadataPath}`
  return new URL(path, options.resource).toString()
}

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function invalid(message: string): ConfigError {
  return new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message })
}
