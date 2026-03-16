import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import type { EdgeAIGenerateResponse, EdgeAIHealthResponse, EdgeAIPullResponse } from '../src/runtime/types'

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
    expect(health.engine.active).toBe('mock')
  })

  it('warms and runs inference through the module endpoints', async () => {
    const pull = await $fetch<EdgeAIPullResponse>('/api/edge-ai/pull', {
      method: 'POST',
    })

    expect(pull.status).toBe('ready')
    expect(pull.runtime).toBe('mock')

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
})
