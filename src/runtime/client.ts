import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPullResponse,
} from './types'

export interface EdgeAIClientOptions {
  baseURL: string
  apiKey?: string
  headers?: Record<string, string>
  fetch?: typeof globalThis.fetch
}

interface EdgeAIFetchOptions {
  method?: string
  body?: unknown
}

function joinUrl(baseURL: string, path: string) {
  const normalizedBase = baseURL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export class EdgeAI {
  private readonly baseURL: string
  private readonly apiKey?: string
  private readonly headers?: Record<string, string>
  private readonly fetchImpl: typeof globalThis.fetch

  readonly chat = {
    completions: {
      create: (payload: EdgeAIChatCompletionRequest) => this.request<EdgeAIChatCompletionResponse>('/chat/completions', {
        method: 'POST',
        body: payload,
      }),
    },
  }

  constructor(options: EdgeAIClientOptions) {
    this.baseURL = options.baseURL
    this.apiKey = options.apiKey
    this.headers = options.headers
    const resolvedFetch = options.fetch || globalThis.fetch
    this.fetchImpl = resolvedFetch.bind(globalThis)

    if (!this.fetchImpl) {
      throw new Error('Fetch is not available. Provide EdgeAI({ fetch }) in this runtime.')
    }
  }

  responses = {
    create: async (payload: EdgeAIChatCompletionRequest) => this.chat.completions.create(payload),
  }

  health() {
    return this.request<EdgeAIHealthResponse>('/health')
  }

  pull() {
    return this.request<EdgeAIPullResponse>('/pull', {
      method: 'POST',
    })
  }

  generate(payload: EdgeAIGenerateRequest) {
    return this.request<EdgeAIGenerateResponse>('/generate', {
      method: 'POST',
      body: payload,
    })
  }

  private async request<T>(path: string, options: EdgeAIFetchOptions = {}) {
    const response = await this.fetchImpl(joinUrl(this.baseURL, path), {
      method: options.method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        ...this.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`EdgeAI request failed with ${response.status}: ${errorText}`)
    }

    return await response.json() as T
  }
}
