# Changelog

All notable changes to this project will be documented in this file.

## 0.1.3

- added provider-driven runtime selection with `local`, `remote`, and `mock` modes behind one module API
- added preset registry support, preset summaries in runtime metadata, and partial model override merging
- added an OpenAI-compatible `POST /api/edge-ai/chat/completions` route and the exported `EdgeAI` client SDK
- added remote-provider execution and local-to-remote fallback for `pull()` and `generate()` flows, including forwarded `messages`, `reasoning`, and `remoteBody`
- expanded runtime types, response metadata, and tests to cover provider state, chat completions, and SDK usage
- removed obsolete Rust proof-of-concept artifacts and the old WASM check script in favor of the vendored JS/WASM runtime path

## 0.1.2

- fixed vendored runtime resolution across dev, build, and published-package environments
- aligned vendored runtime outputs around `.js` assets for Nitro and package compatibility

## 0.1.1

- fixed published package runtime loading to tolerate vendored `.js` and `.mjs` module extensions

## 0.1.0

- initial Nuxt module release
- bundled Nitro endpoints, composable, and vendored Transformers.js + ONNX Runtime WASM runtime
