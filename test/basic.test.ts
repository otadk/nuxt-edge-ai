import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, url } from '@nuxt/test-utils/e2e'
import { EdgeAI } from '../src/runtime/client'
import type {
  EdgeAIChatCompletionResponse,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPullResponse,
} from '../src/runtime/types'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Edge AI Basic Fixture')
  })

  it('serves the module health endpoint', async () => {
    const health = await $fetch<EdgeAIHealthResponse>('/api/edge-ai/health')
    expect(health.status).toBe('ok')
    expect(health.runtime).toBe('mock')
    expect(health.provider).toBe('mock')
    expect(health.engine.active).toBe('mock')
  })

  it('warms and runs inference through the module endpoints', async () => {
    const pull = await $fetch<EdgeAIPullResponse>('/api/edge-ai/pull', {
      method: 'POST',
    })

    expect(pull.status).toBe('ready')
    expect(pull.runtime).toBe('mock')
    expect(pull.provider).toBe('mock')

    const response = await $fetch<EdgeAIGenerateResponse>('/api/edge-ai/generate', {
      method: 'POST',
      body: {
        prompt: 'Create a hiring-friendly Nuxt AI module pitch.',
      },
    })

    expect(response.text).toContain('Prompt received')
    expect(response.runtime).toBe('mock')
    expect(response.provider).toBe('mock')
  })

  it('serves an OpenAI-compatible chat completions endpoint', async () => {
    const completion = await $fetch<EdgeAIChatCompletionResponse>('/api/edge-ai/chat/completions', {
      method: 'POST',
      body: {
        messages: [
          {
            role: 'user',
            content: 'Count the letters in strawberry.',
          },
        ],
      },
    })

    expect(completion.object).toBe('chat.completion')
    expect(completion.choices[0]?.message.role).toBe('assistant')
    expect(String(completion.choices[0]?.message.content)).toContain('Prompt received')
    expect(completion.provider).toBe('mock')
  })

  it('supports the EdgeAI client SDK shape', async () => {
    const client = new EdgeAI({
      baseURL: `${url('/api/edge-ai')}`,
      fetch: globalThis.fetch,
    })

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Write a short test response.',
        },
      ],
    })

    expect(completion.object).toBe('chat.completion')
    expect(String(completion.choices[0]?.message.content)).toContain('Prompt received')
  })
})
