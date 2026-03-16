import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIServerRuntimeConfig } from '../../types'
import { pullEdgeAIModel } from '../utils/edge-ai-engine'

export default defineEventHandler(async () => {
  return pullEdgeAIModel(useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig)
})
