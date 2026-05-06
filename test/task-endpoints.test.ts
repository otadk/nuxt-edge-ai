import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, url } from '@nuxt/test-utils/e2e'
import type {
  EdgeAIClassifyResponse,
  EdgeAIEmbedResponse,
  EdgeAIFillMaskResponse,
  EdgeAISummarizeResponse,
  EdgeAITranslateResponse,
} from '../src/runtime/types'

describe('task endpoints (mock provider)', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('POST /api/edge-ai/classify returns correct shape', async () => {
    const result = await $fetch<EdgeAIClassifyResponse>('/api/edge-ai/classify', {
      method: 'POST',
      body: { text: 'I love this product!' },
    })
    expect(result.predictions).toBeInstanceOf(Array)
    expect(result.predictions.length).toBeGreaterThan(0)
    expect(result.predictions[0]).toHaveProperty('label')
    expect(result.predictions[0]).toHaveProperty('score')
    expect(result.runtime).toBeDefined()
    expect(result.provider).toBeDefined()
  })

  it('POST /api/edge-ai/embed returns correct shape', async () => {
    const result = await $fetch<EdgeAIEmbedResponse>('/api/edge-ai/embed', {
      method: 'POST',
      body: { texts: 'Hello world' },
    })
    expect(result.embeddings).toBeInstanceOf(Array)
    expect(result.shape).toBeInstanceOf(Array)
    expect(result.shape.length).toBe(2)
    expect(result.runtime).toBeDefined()
  })

  it('POST /api/edge-ai/summarize returns correct shape', async () => {
    const result = await $fetch<EdgeAISummarizeResponse>('/api/edge-ai/summarize', {
      method: 'POST',
      body: { text: 'A long text about technology and AI.' },
    })
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
    expect(result.metrics).toBeDefined()
  })

  it('POST /api/edge-ai/translate returns correct shape', async () => {
    const result = await $fetch<EdgeAITranslateResponse>('/api/edge-ai/translate', {
      method: 'POST',
      body: { text: 'Hello world' },
    })
    expect(typeof result.translation).toBe('string')
    expect(result.translation.length).toBeGreaterThan(0)
  })

  it('POST /api/edge-ai/fill-mask returns correct shape', async () => {
    const result = await $fetch<EdgeAIFillMaskResponse>('/api/edge-ai/fill-mask', {
      method: 'POST',
      body: { text: 'The [MASK] was shining.' },
    })
    expect(result.results).toBeInstanceOf(Array)
    expect(result.results.length).toBeGreaterThan(0)
    expect(result.results[0]).toHaveProperty('sequence')
    expect(result.results[0]).toHaveProperty('score')
    expect(result.results[0]).toHaveProperty('tokenStr')
  })

  it('POST /api/edge-ai/classify validates missing text', async () => {
    const response = await fetch(url('/api/edge-ai/classify'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
    expect(response.status).toBe(400)
  })
})
