# Architecture

## Goals

- run a real model locally inside Nitro
- avoid Ollama and native runtime dependencies
- publish as a normal Nuxt module
- ship only JS/TS + WASM in the package

## Runtime shape

`nuxt-edge-ai` installs three Nitro routes:

- `GET /health`
- `POST /pull`
- `POST /generate`

The server runtime lazily loads:

- vendored `transformers.web.mjs`
- vendored `onnxruntime-web` WASM backend

## Why vendoring is used

Consumers should not need runtime npm dependencies such as `@huggingface/transformers` or `onnxruntime-web`.

So the module vendors:

- patched `transformers.web.js`
- `ort.wasm.min.mjs`
- `ort-wasm-simd-threaded.mjs`
- `ort-wasm-simd-threaded.wasm`

## Important patch

`transformers.web.js` is patched so that when an ONNX runtime is injected through `globalThis[Symbol.for('onnxruntime')]`, the runtime still exposes `wasm` as a supported device in Node.

Without that patch, `device: 'wasm'` fails in Node even though the web runtime is present.

## Local file support

The runtime installs a `file://` fetch shim so Node can load local WASM and optional local model files through the same code path.

## Model lifecycle

1. `pull()` initializes the pipeline and downloads files if needed.
2. The pipeline is cached in server memory.
3. `generate()` reuses the same pipeline for later calls.

## Why `mock` still exists

`mock` exists only for:

- test fixtures
- offline CI
- local module development without model downloads
