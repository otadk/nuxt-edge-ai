import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIGenerateRequest, EdgeAIServerRuntimeConfig } from '../../types'
import { generateEdgeAIText } from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAIGenerateRequest>(event)
  const prompt = body?.prompt?.trim()

  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Prompt is required.',
    })
  }

  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig

  return generateEdgeAIText(config, {
    prompt,
    model: body.model,
    generation: body.generation,
  })
})
