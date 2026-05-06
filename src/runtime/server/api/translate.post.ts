import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIServerRuntimeConfig, EdgeAITranslateRequest } from '../../types'
import { translateEdgeAIText } from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAITranslateRequest>(event)

  if (!body?.text?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Text is required.' })
  }

  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig

  return translateEdgeAIText(config, {
    text: body.text.trim(),
    model: body.model,
  })
})
