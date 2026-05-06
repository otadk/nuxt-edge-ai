import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIFillMaskRequest, EdgeAIServerRuntimeConfig } from '../../types'
import { fillMaskEdgeAIText } from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAIFillMaskRequest>(event)

  if (!body?.text?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Text with [MASK] token is required.' })
  }

  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig

  return fillMaskEdgeAIText(config, {
    text: body.text.trim(),
    model: body.model,
    topK: body.topK,
  })
})
