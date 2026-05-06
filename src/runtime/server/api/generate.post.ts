import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import type {
  EdgeAIClassifyRequest,
  EdgeAIFillMaskRequest,
  EdgeAIGenerateRequest,
  EdgeAIServerRuntimeConfig,
  EdgeAISummarizeRequest,
  EdgeAITranslateRequest,
} from '../../types'
import {
  classifyEdgeAIText,
  embedEdgeAIText,
  fillMaskEdgeAIText,
  generateEdgeAIText,
  resolvePromptFromMessages,
  summarizeEdgeAIText,
  translateEdgeAIText,
} from '../utils/edge-ai-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody<EdgeAIGenerateRequest>(event)
  const config = useRuntimeConfig().edgeAI as unknown as EdgeAIServerRuntimeConfig

  // Route to task-specific handlers when task is explicitly set
  if (body?.task && body.task !== 'text-generation') {
    switch (body.task) {
      case 'text-classification': {
        const text = body.prompt?.trim()
        if (!text) {
          throw createError({ statusCode: 400, statusMessage: 'Text (prompt) is required for classification.' })
        }
        return classifyEdgeAIText(config, { text, model: body.model } satisfies EdgeAIClassifyRequest)
      }
      case 'feature-extraction': {
        const texts = body.prompt?.trim() || (body.messages && resolvePromptFromMessages(body.messages))
        if (!texts) {
          throw createError({ statusCode: 400, statusMessage: 'Text (prompt or messages) is required for embedding.' })
        }
        return embedEdgeAIText(config, { texts, model: body.model })
      }
      case 'summarization': {
        const text = body.prompt?.trim()
        if (!text) {
          throw createError({ statusCode: 400, statusMessage: 'Text (prompt) is required for summarization.' })
        }
        return summarizeEdgeAIText(config, { text, model: body.model, generation: body.generation } satisfies EdgeAISummarizeRequest)
      }
      case 'translation': {
        const text = body.prompt?.trim()
        if (!text) {
          throw createError({ statusCode: 400, statusMessage: 'Text (prompt) is required for translation.' })
        }
        return translateEdgeAIText(config, { text, model: body.model } satisfies EdgeAITranslateRequest)
      }
      case 'fill-mask': {
        const text = body.prompt?.trim()
        if (!text) {
          throw createError({ statusCode: 400, statusMessage: 'Text (prompt) with [MASK] is required for fill-mask.' })
        }
        return fillMaskEdgeAIText(config, { text, model: body.model } satisfies EdgeAIFillMaskRequest)
      }
    }
  }

  const prompt = body?.prompt?.trim()
  const hasMessages = Array.isArray(body?.messages) && body.messages.length > 0

  if (!prompt && !hasMessages) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Prompt or messages are required.',
    })
  }

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
