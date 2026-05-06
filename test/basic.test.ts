import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, url } from '@nuxt/test-utils/e2e'
import { EdgeAI } from '../src/runtime/client'
import type {
  EdgeAIChatCompletionResponse,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPullResponse,
  StreamPart,
} from '../src/runtime/types'

async function collectSSEParts(response: Response) {
  const body = await response.text()
  const parts = body
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => line.slice(6))

  return {
    body,
    jsonParts: parts
      .filter(part => part !== '[DONE]')
      .map(part => JSON.parse(part) as StreamPart | Record<string, unknown>),
  }
}

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
        prompt: 'Create a concise Nuxt AI module pitch.',
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

  it('serves an AI SDK-compatible data stream when the request prefers SSE', async () => {
    const response = await fetch(url('/api/edge-ai/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'text/event-stream',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Stream a mock response.',
          },
        ],
      }),
    })

    expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1')

    const { body, jsonParts } = await collectSSEParts(response)
    expect(body).toContain('data: [DONE]')
    expect(jsonParts.some(part => 'type' in part && part.type === 'start')).toBe(true)
    expect(jsonParts.some(part => 'type' in part && part.type === 'text-start')).toBe(true)
    expect(jsonParts.some(part => 'type' in part && part.type === 'text-delta')).toBe(true)
    expect(jsonParts.some(part => 'type' in part && part.type === 'text-end')).toBe(true)
    expect(jsonParts.some(part => 'type' in part && part.type === 'finish')).toBe(true)
  })

  it('streams data via ReadableStream reader (browser-like chunked reads)', async () => {
    const response = await fetch(url('/api/edge-ai/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'text/event-stream',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Test reader-based streaming.' },
        ],
      }),
    })

    expect(response.ok).toBe(true)
    expect(response.body).toBeTruthy()

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const collectedDeltas: string[] = []
    let sawStart = false
    let sawFinish = false

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(6)
            if (data === '[DONE]') continue

            let part: { type?: string, delta?: string }
            try {
              part = JSON.parse(data)
            }
            catch { continue }

            if (part.type === 'start') sawStart = true
            if (part.type === 'text-delta') collectedDeltas.push(part.delta || '')
            if (part.type === 'finish') sawFinish = true
          }
        }
        if (done) break
      }
    }
    finally {
      reader.releaseLock()
    }

    expect(sawStart).toBe(true)
    expect(sawFinish).toBe(true)
    expect(collectedDeltas.length).toBeGreaterThan(0)
    expect(collectedDeltas.join('').length).toBeGreaterThan(0)
  })

  it('serves OpenAI-style SSE chunks when stream=true is requested directly', async () => {
    const response = await fetch(url('/api/edge-ai/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'text/event-stream',
      },
      body: JSON.stringify({
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'Return an OpenAI style stream.',
          },
        ],
      }),
    })

    expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBeNull()

    const { body, jsonParts } = await collectSSEParts(response)
    expect(body).toContain('data: [DONE]')
    expect(jsonParts.some(part => part && 'object' in part && part.object === 'chat.completion.chunk')).toBe(true)
  })
})
