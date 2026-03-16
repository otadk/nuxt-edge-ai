import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const files = [
  'wasm/edge-ai-kernel/pkg/nuxt_edge_ai_kernel.js',
  'wasm/edge-ai-kernel/pkg/nuxt_edge_ai_kernel_bg.wasm',
]

const missing = files.filter(file => !existsSync(resolve(process.cwd(), file)))

if (missing.length > 0) {
  console.error('Missing WASM build output:')
  for (const file of missing) {
    console.error(`- ${file}`)
  }
  process.exit(1)
}

console.log('WASM package is present.')
