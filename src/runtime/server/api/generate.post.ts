import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIGenerateRequest, EdgeAIServerRuntimeConfig } from '../../types'
import { generateEdgeAIText } from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAIGenerateRequest>(event)
  const prompt = body?.prompt?.trim()
  const hasMessages = Array.isArray(body?.messages) && body.messages.length > 0

  if (!prompt && !hasMessages) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Prompt or messages are required.',
    })
  }

  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig

  return generateEdgeAIText(config, {
    prompt,
    remote: body.remote,
    model: body.model,
    messages: body.messages,
    reasoning: body.reasoning,
    remoteBody: body.remoteBody,
    generation: body.generation,
  })
})
