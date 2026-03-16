# Changelog

All notable changes to this project will be documented in this file.

## 0.1.2

- fixed vendored runtime resolution across dev, build, and published-package environments
- aligned vendored runtime outputs around `.js` assets for Nitro and package compatibility

## 0.1.1

- fixed published package runtime loading to tolerate vendored `.js` and `.mjs` module extensions

## 0.1.0

- initial Nuxt module release
- bundled Nitro endpoints, composable, and vendored Transformers.js + ONNX Runtime WASM runtime
