import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIChatCompletionStreamResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPullResponse,
  EdgeAIStreamCallbacks,
  EdgeAIStreamState,
  StreamPart,
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
  signal?: AbortSignal
}

function joinUrl(baseURL: string, path: string) {
  const normalizedBase = baseURL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

// SSE stream parser for AI SDK Data Stream Protocol
async function* parseSSEStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<StreamPart, void, unknown> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      // Process received data first
      if (value) {
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const part = JSON.parse(data) as StreamPart
            yield part
          }
          catch {
            // Ignore parse errors for malformed chunks
          }
        }
      }

      // Then check if stream is done
      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const lines = buffer.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(6)
            if (data === '[DONE]') return

            try {
              const part = JSON.parse(data) as StreamPart
              yield part
            }
            catch {
              // Ignore parse errors
            }
          }
        }
        break
      }
    }
  }
  finally {
    reader.releaseLock()
  }
}

function assertNeverMalformedStream(part: StreamPart): StreamPart {
  return part
}

// OpenAI-style SSE stream parser (for future use with OpenAI compatible streams)
async function* _parseOpenAIStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<EdgeAIChatCompletionStreamResponse, void, unknown> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const chunk = JSON.parse(data) as EdgeAIChatCompletionStreamResponse
          if (chunk.object === 'chat.completion.chunk') {
            yield chunk
          }
        }
        catch {
          // Ignore parse errors for malformed chunks
        }
      }
    }
  }
  finally {
    reader.releaseLock()
  }
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
      // Streaming version
      stream: (payload: EdgeAIChatCompletionRequest, callbacks?: EdgeAIStreamCallbacks) => {
        return this.streamChatCompletion(payload, callbacks)
      },
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

  // Streaming chat completion with callbacks
  private async streamChatCompletion(
    payload: EdgeAIChatCompletionRequest,
    callbacks?: EdgeAIStreamCallbacks,
  ): Promise<EdgeAIStreamState> {
    const abortController = new AbortController()
    let accumulatedText = ''
    let completed = false

    const state: EdgeAIStreamState = {
      isLoading: true,
      isStreaming: true,
      text: '',
      abortController,
    }

    try {
      callbacks?.onStart?.()

      const response = await this.fetchImpl(joinUrl(this.baseURL, '/chat/completions'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'text/event-stream',
          'x-vercel-ai-ui-message-stream': 'v1',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
          ...this.headers,
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`EdgeAI stream request failed with ${response.status}: ${errorText}`)
      }

      if (!response.body) {
        throw new Error('Response body is empty')
      }

      // Parse the SSE stream
      const stream = response.body as ReadableStream<Uint8Array>

      // Use async iteration to process the stream
      for await (const part of parseSSEStream(stream)) {
        if (abortController.signal.aborted) {
          break
        }

        switch (assertNeverMalformedStream(part).type) {
          case 'text-delta': {
            const delta = (part as { delta: string }).delta
            accumulatedText += delta
            state.text = accumulatedText
            callbacks?.onToken?.(delta)
            break
          }
          case 'finish': {
            state.isStreaming = false
            state.isLoading = false
            completed = true
            callbacks?.onCompletion?.(accumulatedText)
            break
          }
          case 'error': {
            const errorText = (part as { errorText: string }).errorText
            throw new Error(errorText)
          }
        }
      }

      state.isStreaming = false
      state.isLoading = false
      state.abortController = null

      if (!completed && !abortController.signal.aborted) {
        callbacks?.onCompletion?.(accumulatedText)
      }

      return state
    }
    catch (error) {
      state.isStreaming = false
      state.isLoading = false
      state.abortController = null

      if ((error as Error).name === 'AbortError') {
        callbacks?.onAbort?.('user cancelled')
        return state
      }

      callbacks?.onError?.(error as Error)
      throw error
    }
  }

  // Async generator version for streaming (for use with for await...of)
  async* streamChatCompletionGenerator(payload: EdgeAIChatCompletionRequest): AsyncGenerator<string, EdgeAIStreamState, unknown> {
    const abortController = new AbortController()
    let accumulatedText = ''

    const state: EdgeAIStreamState = {
      isLoading: true,
      isStreaming: true,
      text: '',
      abortController,
    }

    try {
      const response = await this.fetchImpl(joinUrl(this.baseURL, '/chat/completions'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'text/event-stream',
          'x-vercel-ai-ui-message-stream': 'v1',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
          ...this.headers,
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`EdgeAI stream request failed with ${response.status}: ${errorText}`)
      }

      if (!response.body) {
        throw new Error('Response body is empty')
      }

      const stream = response.body as ReadableStream<Uint8Array>

      for await (const part of parseSSEStream(stream)) {
        if (abortController.signal.aborted) {
          break
        }

        switch (part.type) {
          case 'text-delta': {
            const delta = (part as { delta: string }).delta
            accumulatedText += delta
            state.text = accumulatedText
            yield delta
            break
          }
          case 'finish':
            state.isStreaming = false
            state.isLoading = false
            break
          case 'error': {
            const errorText = (part as { errorText: string }).errorText
            throw new Error(errorText)
          }
        }
      }

      state.isStreaming = false
      state.isLoading = false
      state.abortController = null

      return state
    }
    catch (error) {
      state.isStreaming = false
      state.isLoading = false
      state.abortController = null
      throw error
    }
  }

  // Stop method to abort streaming
  stop(state: EdgeAIStreamState): void {
    if (state.abortController && !state.abortController.signal.aborted) {
      state.abortController.abort()
    }
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
      signal: options.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`EdgeAI request failed with ${response.status}: ${errorText}`)
    }

    return await response.json() as T
  }
}

// Helper function to parse stream data (exported for external use)
export function parseDataStream(text: string): StreamPart[] {
  const parts: StreamPart[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data: ')) continue

    const data = trimmed.slice(6)
    if (data === '[DONE]') continue

    try {
      const part = JSON.parse(data) as StreamPart
      parts.push(part)
    }
    catch {
      // Ignore parse errors
    }
  }

  return parts
}

// Helper to accumulate text from stream parts
export function accumulateTextFromParts(parts: StreamPart[]): string {
  return parts
    .filter((p): p is StreamPart & { delta: string } => p.type === 'text-delta')
    .map(p => (p as { delta: string }).delta)
    .join('')
}
