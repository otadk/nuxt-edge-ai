# Third-party Runtime

`nuxt-edge-ai` currently vendors runtime assets from:

- `@huggingface/transformers`
- `onnxruntime-web`

## Why

The module must remain self-contained at runtime for consumers.

That means the published package needs to carry the exact JS/WASM assets it depends on.

## Vendored files

- patched `huggingface/transformers.web.js`
- `onnxruntime/ort.wasm.min.js`
- `onnxruntime/ort-wasm-simd-threaded.js`
- `onnxruntime/ort-wasm-simd-threaded.wasm`
- `onnxruntime/onnxruntime-common.js`
- `onnxruntime/onnxruntime-web.js`

## Runtime patches

The vendoring step applies a few targeted patches so the runtime works inside Nitro:

- rewrites Transformers.js imports to point at vendored ONNX Runtime wrappers
- keeps `wasm` available as a supported device when ONNX Runtime is injected through `globalThis`
- rewrites ONNX Runtime module references from `.mjs` to `.js` for package and Nitro compatibility
- emits wrapper modules for `onnxruntime-common` and `onnxruntime-web`

## Source generation

Vendored assets are refreshed with:

```bash
pnpm vendor:runtime
```

## License notes

The vendoring script also copies available third-party license files into:

- `src/runtime/server/vendor/licenses/`

Current copied licenses include:

- `huggingface-transformers.LICENSE`
- `onnxruntime-web.LICENSE`

This directory should be reviewed before publish and expanded if additional vendored assets are added.
