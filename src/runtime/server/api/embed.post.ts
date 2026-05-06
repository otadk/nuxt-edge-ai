import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIEmbedRequest, EdgeAIServerRuntimeConfig } from '../../types'
import { embedEdgeAIText } from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAIEmbedRequest>(event)

  if (!body?.texts || (Array.isArray(body.texts) ? body.texts.length === 0 : !body.texts.trim())) {
    throw createError({ statusCode: 400, statusMessage: 'Texts (string or string array) is required.' })
  }

  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig

  return embedEdgeAIText(config, {
    texts: body.texts,
    pooling: body.pooling,
    model: body.model,
  })
})
