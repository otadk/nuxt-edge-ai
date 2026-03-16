import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { EdgeAIServerRuntimeConfig } from '../../types'
import { getEdgeAIHealth } from '../utils/edge-ai-engine'

export default defineEventHandler(async () => {
  return getEdgeAIHealth(useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig)
})
