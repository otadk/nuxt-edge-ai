import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIChatCompletionRequest, EdgeAIServerRuntimeConfig } from '../../types'
import { createEdgeAIChatCompletion } from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAIChatCompletionRequest>(event)

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Messages are required.',
    })
  }

  if (body.stream) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Streaming is not supported yet.',
    })
  }

  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig
  return createEdgeAIChatCompletion(config, body)
})
