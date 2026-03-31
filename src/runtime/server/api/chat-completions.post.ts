import { createError, defineEventHandler, readBody, getRequestHeaders } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIChatCompletionRequest, EdgeAIServerRuntimeConfig } from '../../types'
import {
  createEdgeAIChatCompletion,
  createEdgeAIChatCompletionOpenAIStream,
  createEdgeAIChatCompletionStream,
} from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAIChatCompletionRequest>(event)

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Messages are required.',
    })
  }

  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig
  const headers = getRequestHeaders(event)
  const acceptHeader = headers.accept || ''
  const wantsEventStream = acceptHeader.includes('text/event-stream')
  const wantsUIMessageStream = headers['x-vercel-ai-ui-message-stream'] === 'v1'
  const wantsStreaming = body.stream === true || wantsEventStream

  if (wantsStreaming) {
    const streamResponse = !body.stream || wantsUIMessageStream
      ? createEdgeAIChatCompletionStream(config, body)
      : createEdgeAIChatCompletionOpenAIStream(config, body)

    for (const [key, value] of Object.entries(streamResponse.headers)) {
      event.node.res.setHeader(key, value)
    }

    const reader = streamResponse.stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        event.node.res.write(value)
      }
    }
    finally {
      reader.releaseLock()
      event.node.res.end()
    }

    return
  }

  return createEdgeAIChatCompletion(config, body)
})
