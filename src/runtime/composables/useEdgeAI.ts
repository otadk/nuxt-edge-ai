import { ref, computed } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#app'
import type { EdgeAI } from '../client'
import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIClassifyRequest,
  EdgeAIClassifyResponse,
  EdgeAIEmbedRequest,
  EdgeAIEmbedResponse,
  EdgeAIFillMaskRequest,
  EdgeAIFillMaskResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPublicRuntimeConfig,
  EdgeAIPullResponse,
  EdgeAIStreamCallbacks,
  EdgeAISummarizeRequest,
  EdgeAISummarizeResponse,
  EdgeAITranslateRequest,
  EdgeAITranslateResponse,
} from '../types'

export interface UseEdgeAIOptions {
  onStreamStart?: () => void
  onStreamToken?: (token: string) => void
  onStreamCompletion?: (text: string) => void
  onStreamError?: (error: Error) => void
  onStreamAbort?: (reason: string) => void
}

export interface StreamedMessage {
  id: string
  role: 'assistant'
  content: string
  isStreaming: boolean
  model?: string
  fellBackToRemote?: boolean
}

export function useEdgeAI(options: UseEdgeAIOptions = {}) {
  const config = useRuntimeConfig()
  const nuxtApp = useNuxtApp()
  const edgeAIService = nuxtApp.$edgeAI as unknown as {
    client: EdgeAI
    pull: () => Promise<EdgeAIPullResponse>
    generate: (payload: EdgeAIGenerateRequest) => Promise<EdgeAIGenerateResponse>
    chatCompletions: (payload: EdgeAIChatCompletionRequest) => Promise<EdgeAIChatCompletionResponse>
    health: () => Promise<EdgeAIHealthResponse>
  }
  const publicConfig = config.public.edgeAI as unknown as EdgeAIPublicRuntimeConfig
  const routeBase = publicConfig.routeBase
  const provider = publicConfig.provider
  const defaultModel = publicConfig.defaultModel
  const remoteModel = publicConfig.remoteModel
  const runtime = publicConfig.runtime
  const preset = publicConfig.preset
  const presets = publicConfig.presets
  const remoteFallback = publicConfig.remoteFallback

  // Streaming state
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const streamedContent = ref('')
  const streamedMessage = ref<StreamedMessage | null>(null)
  const abortController = ref<AbortController | null>(null)
  const streamError = ref<Error | null>(null)

  // Computed state for template usage
  const canAbort = computed(() => isStreaming.value && abortController.value !== null)

  /**
   * Stop the current streaming request
   */
  function stop(): void {
    if (abortController.value && !abortController.value.signal.aborted) {
      abortController.value.abort()
      isStreaming.value = false
      isLoading.value = false
      options.onStreamAbort?.('user cancelled')
    }
  }

  /**
   * Stream chat completions with real-time updates
   * Returns a reactive streamedMessage that updates as tokens arrive
   */
  async function streamChatCompletions(
    payload: EdgeAIChatCompletionRequest,
  ): Promise<StreamedMessage> {
    // Reset state
    isLoading.value = true
    isStreaming.value = true
    streamedContent.value = ''
    streamError.value = null
    abortController.value = new AbortController()

    const messageId = crypto.randomUUID()
    streamedMessage.value = {
      id: messageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      model: payload.model || defaultModel,
    }

    const callbacks: EdgeAIStreamCallbacks = {
      onStart: () => {
        options.onStreamStart?.()
      },
      onToken: (token) => {
        streamedContent.value += token
        if (streamedMessage.value) {
          streamedMessage.value.content = streamedContent.value
        }
        options.onStreamToken?.(token)
      },
      onCompletion: (text) => {
        isStreaming.value = false
        isLoading.value = false
        if (streamedMessage.value) {
          streamedMessage.value.isStreaming = false
          streamedMessage.value.content = text
        }
        options.onStreamCompletion?.(text)
      },
      onError: (error) => {
        isStreaming.value = false
        isLoading.value = false
        streamError.value = error
        if (streamedMessage.value) {
          streamedMessage.value.isStreaming = false
        }
        options.onStreamError?.(error)
      },
      onAbort: (reason) => {
        isStreaming.value = false
        isLoading.value = false
        if (streamedMessage.value) {
          streamedMessage.value.isStreaming = false
        }
        options.onStreamAbort?.(reason)
      },
    }

    try {
      const response = await fetch(
        routeBase.startsWith('http') ? `${routeBase}/chat/completions` : new URL(`${routeBase}/chat/completions`, window.location.origin).toString(),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'accept': 'text/event-stream',
            'x-vercel-ai-ui-message-stream': 'v1',
          },
          body: JSON.stringify({ ...payload, stream: true }),
          signal: abortController.value.signal,
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Stream request failed with ${response.status}: ${errorText}`)
      }

      if (!response.body) {
        throw new Error('Response body is empty')
      }

      // Parse SSE stream
      const reader = response.body.getReader()
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
            if (data === '[DONE]') {
              isStreaming.value = false
              isLoading.value = false
              if (streamedMessage.value) {
                streamedMessage.value.isStreaming = false
              }
              callbacks.onCompletion?.(streamedContent.value)
              return streamedMessage.value!
            }

            let part: { type: string, delta?: string, errorText?: string }
            try {
              part = JSON.parse(data) as { type: string, delta?: string, errorText?: string }
            }
            catch {
              continue
            }

            switch (part.type) {
              case 'text-delta': {
                const delta = part.delta || ''
                streamedContent.value += delta
                if (streamedMessage.value) {
                  streamedMessage.value.content = streamedContent.value
                }
                callbacks.onToken?.(delta)
                break
              }
              case 'finish': {
                isStreaming.value = false
                isLoading.value = false
                if (streamedMessage.value) {
                  streamedMessage.value.isStreaming = false
                }
                callbacks.onCompletion?.(streamedContent.value)
                return streamedMessage.value!
              }
              case 'error': {
                throw new Error(part.errorText || 'Stream error')
              }
            }
          }
        }
      }
      finally {
        reader.releaseLock()
      }

      isStreaming.value = false
      isLoading.value = false
      if (streamedMessage.value) {
        streamedMessage.value.isStreaming = false
      }

      return streamedMessage.value!
    }
    catch (error) {
      isStreaming.value = false
      isLoading.value = false
      if (streamedMessage.value) {
        streamedMessage.value.isStreaming = false
      }

      if ((error as Error).name === 'AbortError') {
        callbacks.onAbort?.('user cancelled')
        return streamedMessage.value!
      }

      streamError.value = error as Error
      callbacks.onError?.(error as Error)
      throw error
    }
  }

  /**
   * Async generator version for streaming (for use with for await...of)
   */
  async function* streamChatCompletionsGenerator(
    payload: EdgeAIChatCompletionRequest,
  ): AsyncGenerator<string, StreamedMessage, unknown> {
    isLoading.value = true
    isStreaming.value = true
    streamedContent.value = ''
    streamError.value = null
    abortController.value = new AbortController()

    const messageId = crypto.randomUUID()
    streamedMessage.value = {
      id: messageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      model: payload.model || defaultModel,
    }

    try {
      const fetchUrl = routeBase.startsWith('http')
        ? `${routeBase}/chat/completions`
        : new URL(`${routeBase}/chat/completions`, window.location.origin).toString()


      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'text/event-stream',
          'x-vercel-ai-ui-message-stream': 'v1',
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: abortController.value.signal,
      })


      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Stream request failed with ${response.status}: ${errorText}`)
      }

      if (!response.body) {
        throw new Error('Response body is empty')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (value) {
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data: ')) continue

              const data = trimmed.slice(6)
              if (data === '[DONE]') {
                isStreaming.value = false
                isLoading.value = false
                if (streamedMessage.value) {
                  streamedMessage.value.isStreaming = false
                }
                return streamedMessage.value!
              }

              let part: { type: string, delta?: string, errorText?: string, messageId?: string }
              try {
                part = JSON.parse(data) as { type: string, delta?: string, errorText?: string, messageId?: string }
              }
              catch {
                continue
              }

              switch (part.type) {
                case 'text-delta': {
                  const delta = part.delta || ''
                  streamedContent.value += delta
                  if (streamedMessage.value) {
                    streamedMessage.value.content = streamedContent.value
                  }
                  yield delta
                  break
                }
                case 'finish': {
                  if (streamedMessage.value) {
                    streamedMessage.value.isStreaming = false
                  }
                  isStreaming.value = false
                  isLoading.value = false
                  return streamedMessage.value!
                }
                case 'error': {
                  throw new Error(part.errorText || 'Stream error')
                }
                default: {
                  // start, text-start, text-end — pass through silently
                  break
                }
              }
            }
          }

          if (done) {
            break
          }
        }
      }
      finally {
        reader.releaseLock()
      }


      isStreaming.value = false
      isLoading.value = false
      if (streamedMessage.value) {
        streamedMessage.value.isStreaming = false
      }

      return streamedMessage.value!
    }
    catch (error) {
      isStreaming.value = false
      isLoading.value = false
      if (streamedMessage.value) {
        streamedMessage.value.isStreaming = false
      }
      throw error
    }
  }

  return {
    // Config
    routeBase,
    provider,
    defaultModel,
    remoteModel,
    runtime,
    preset,
    presets,
    remoteFallback,

    // Client
    client: edgeAIService.client,

    // Non-streaming methods
    pull() {
      return edgeAIService.pull()
    },
    generate(payload: EdgeAIGenerateRequest) {
      return edgeAIService.generate(payload)
    },
    chatCompletions(payload: EdgeAIChatCompletionRequest) {
      return edgeAIService.chatCompletions(payload)
    },
    health() {
      return edgeAIService.health()
    },

    // Task-specific methods
    classify(payload: EdgeAIClassifyRequest) {
      return edgeAIService.client.classify(payload)
    },
    embed(payload: EdgeAIEmbedRequest) {
      return edgeAIService.client.embed(payload)
    },
    summarize(payload: EdgeAISummarizeRequest) {
      return edgeAIService.client.summarize(payload)
    },
    translate(payload: EdgeAITranslateRequest) {
      return edgeAIService.client.translate(payload)
    },
    fillMask(payload: EdgeAIFillMaskRequest) {
      return edgeAIService.client.fillMask(payload)
    },

    // Streaming state (reactive refs)
    isLoading,
    isStreaming,
    streamedContent,
    streamedMessage: computed(() => streamedMessage.value),
    streamError,
    canAbort,

    // Streaming methods
    streamChatCompletions,
    streamChatCompletionsGenerator,
    stop,
  }
}

// Composable for simple streaming with automatic state management
export function useEdgeAIStream() {
  const edgeAI = useEdgeAI()

  const messages = ref<Array<{ id: string, role: 'user' | 'assistant', content: string, isStreaming?: boolean }>>([])
  const input = ref('')

  async function handleSubmit() {
    const text = input.value.trim()
    if (!text || edgeAI.isLoading.value) return

    // Add user message
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    })

    input.value = ''

    // Add assistant placeholder
    const assistantMessageId = crypto.randomUUID()
    messages.value.push({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    })

    // Stream response
    try {
      for await (const token of edgeAI.streamChatCompletionsGenerator({
        model: edgeAI.defaultModel,
        messages: messages.value
          .filter(m => !m.isStreaming)
          .map(m => ({ role: m.role, content: m.content })),
      })) {
        const assistantMessage = messages.value.find(m => m.id === assistantMessageId)
        if (assistantMessage) {
          assistantMessage.content += token
        }
      }

      const assistantMessage = messages.value.find(m => m.id === assistantMessageId)
      if (assistantMessage) {
        assistantMessage.isStreaming = false
      }
    }
    catch (error) {
      const assistantMessage = messages.value.find(m => m.id === assistantMessageId)
      if (assistantMessage) {
        assistantMessage.content = 'Error: ' + ((error as Error).message || 'Unknown error')
        assistantMessage.isStreaming = false
      }
    }
  }

  function clearMessages() {
    messages.value = []
  }

  return {
    messages,
    input,
    isLoading: edgeAI.isLoading,
    isStreaming: edgeAI.isStreaming,
    stop: edgeAI.stop,
    handleSubmit,
    clearMessages,
  }
}
