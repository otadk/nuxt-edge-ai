import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const vendorRoot = join(rootDir, 'src', 'runtime', 'server', 'vendor')
const hfRoot = join(rootDir, 'node_modules', '@huggingface', 'transformers')
const ortRoot = join(rootDir, 'node_modules', 'onnxruntime-web')

const files = {
  transformers: join(hfRoot, 'dist', 'transformers.web.js'),
  ortModule: join(ortRoot, 'dist', 'ort.wasm.min.mjs'),
  ortThreadedModule: join(ortRoot, 'dist', 'ort-wasm-simd-threaded.mjs'),
  ortWasm: join(ortRoot, 'dist', 'ort-wasm-simd-threaded.wasm'),
  hfLicense: join(hfRoot, 'LICENSE'),
  ortLicense: join(ortRoot, 'LICENSE'),
}

const destinations = {
  hfDir: join(vendorRoot, 'huggingface'),
  ortDir: join(vendorRoot, 'onnxruntime'),
  licenseDir: join(vendorRoot, 'licenses'),
  transformers: join(vendorRoot, 'huggingface', 'transformers.web.mjs'),
  ortModule: join(vendorRoot, 'onnxruntime', 'ort.wasm.min.mjs'),
  ortThreadedModule: join(vendorRoot, 'onnxruntime', 'ort-wasm-simd-threaded.mjs'),
  ortWasm: join(vendorRoot, 'onnxruntime', 'ort-wasm-simd-threaded.wasm'),
  ortCommonWrapper: join(vendorRoot, 'onnxruntime', 'onnxruntime-common.mjs'),
  ortWebWrapper: join(vendorRoot, 'onnxruntime', 'onnxruntime-web.mjs'),
  hfLicense: join(vendorRoot, 'licenses', 'huggingface-transformers.LICENSE'),
  ortLicense: join(vendorRoot, 'licenses', 'onnxruntime-web.LICENSE'),
}

const originalOrtImports = [
  'import * as __WEBPACK_EXTERNAL_MODULE_onnxruntime_common_82b39e9f__ from "onnxruntime-common";',
  'import * as __WEBPACK_EXTERNAL_MODULE_onnxruntime_web_74d14b94__ from "onnxruntime-web";',
].join('\n')

const vendoredOrtImports = [
  'import * as __WEBPACK_EXTERNAL_MODULE_onnxruntime_common_82b39e9f__ from "../onnxruntime/onnxruntime-common.mjs";',
  'import * as __WEBPACK_EXTERNAL_MODULE_onnxruntime_web_74d14b94__ from "../onnxruntime/onnxruntime-web.mjs";',
].join('\n')

const ortSymbolBranchPattern = /if \(ORT_SYMBOL in globalThis\) \{\s+\/\/ If the JS runtime exposes their own ONNX runtime, use it\s+ONNX = globalThis\[ORT_SYMBOL\];\s+\} else if \(_env_js__WEBPACK_IMPORTED_MODULE_0__\.apis\.IS_NODE_ENV\) \{/

const patchedOrtSymbolBranch = [
  'if (ORT_SYMBOL in globalThis) {',
  '    // If the JS runtime exposes their own ONNX runtime, use it',
  '    ONNX = globalThis[ORT_SYMBOL];',
  '    if (ONNX?.env?.wasm) {',
  '        supportedDevices.push(\'wasm\');',
  '        defaultDevices = [\'wasm\'];',
  '    } else {',
  '        supportedDevices.push(\'cpu\');',
  '        defaultDevices = [\'cpu\'];',
  '    }',
  '',
  '} else if (_env_js__WEBPACK_IMPORTED_MODULE_0__.apis.IS_NODE_ENV) {',
].join('\n')

const originalDeviceFallback = [
  '    if (supportedDevices.includes(device)) {',
  '        return [DEVICE_TO_EXECUTION_PROVIDER_MAPPING[device] ?? device];',
  '    }',
  '',
  '    throw new Error(`Unsupported device: "${device}". Should be one of: ${supportedDevices.join(\', \')}.`)',
].join('\n')

const patchedDeviceFallback = [
  '    if (device === \'wasm\' && ORT_SYMBOL in globalThis && globalThis[ORT_SYMBOL]?.env?.wasm) {',
  '        if (!supportedDevices.includes(\'wasm\')) {',
  '            supportedDevices.push(\'wasm\');',
  '        }',
  '        return [DEVICE_TO_EXECUTION_PROVIDER_MAPPING.wasm ?? \'wasm\'];',
  '    }',
  '',
  '    if (supportedDevices.includes(device)) {',
  '        return [DEVICE_TO_EXECUTION_PROVIDER_MAPPING[device] ?? device];',
  '    }',
  '',
  '    throw new Error(`Unsupported device: "${device}". Should be one of: ${supportedDevices.join(\', \')}.`)',
].join('\n')

const patchedInferenceSessionBinding = [
  'function getCurrentONNX() {',
  '    return ORT_SYMBOL in globalThis ? globalThis[ORT_SYMBOL] : ONNX;',
  '}',
  '',
  'function getInferenceSession() {',
  '    return getCurrentONNX()?.InferenceSession;',
  '}',
].join('\n')

const patchedCreateInferenceSession = [
  '    const inferenceSession = getInferenceSession();',
  '    if (!inferenceSession?.create) {',
  '        throw new Error(\'ONNX runtime is not initialized with InferenceSession.create\');',
  '    }',
  '',
  '    const sessionPromise = inferenceSession.create(buffer_or_path, session_options);',
].join('\n')

const patchedIsOnnxTensor = [
  '    const currentONNX = getCurrentONNX();',
  '    return Boolean(currentONNX?.Tensor) && x instanceof currentONNX.Tensor;',
].join('\n')

async function writeFileWithDirs(filePath, contents) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, contents)
}

async function copyIfExists(source, destination) {
  try {
    await stat(source)
    await copyFile(source, destination)
  }
  catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
  }
}

async function main() {
  await rm(vendorRoot, { recursive: true, force: true })

  await Promise.all([
    mkdir(destinations.hfDir, { recursive: true }),
    mkdir(destinations.ortDir, { recursive: true }),
    mkdir(destinations.licenseDir, { recursive: true }),
  ])

  const transformersSource = await readFile(files.transformers, 'utf8')

  if (!transformersSource.includes(originalOrtImports)) {
    throw new Error('Could not find onnxruntime imports in transformers.web.js')
  }

  if (!ortSymbolBranchPattern.test(transformersSource)) {
    throw new Error('Could not find ORT device branch in transformers.web.js')
  }

  const patchedTransformers = transformersSource
    .replace(originalOrtImports, vendoredOrtImports)
    .replace(ortSymbolBranchPattern, patchedOrtSymbolBranch)
    .replace(originalDeviceFallback, patchedDeviceFallback)
    .replace(/\/\/ @ts-ignore\r?\nconst InferenceSession = ONNX\.InferenceSession;/, patchedInferenceSessionBinding)
    .replace(/    const sessionPromise = InferenceSession\.create\(buffer_or_path, session_options\);/, patchedCreateInferenceSession)
    .replace(/    return x instanceof ONNX\.Tensor;/, patchedIsOnnxTensor)

  await Promise.all([
    writeFileWithDirs(destinations.transformers, patchedTransformers),
    copyFile(files.ortModule, destinations.ortModule),
    copyFile(files.ortThreadedModule, destinations.ortThreadedModule),
    copyFile(files.ortWasm, destinations.ortWasm),
    writeFileWithDirs(
      destinations.ortCommonWrapper,
      [
        'export * from \'./ort.wasm.min.mjs\'',
        'import * as ort from \'./ort.wasm.min.mjs\'',
        'export default ort',
        '',
      ].join('\n'),
    ),
    writeFileWithDirs(
      destinations.ortWebWrapper,
      [
        'export * from \'./ort.wasm.min.mjs\'',
        'import * as ort from \'./ort.wasm.min.mjs\'',
        'export default ort',
        '',
      ].join('\n'),
    ),
    copyIfExists(files.hfLicense, destinations.hfLicense),
    copyIfExists(files.ortLicense, destinations.ortLicense),
  ])

  console.log('Vendored Transformers.js and ONNX Runtime WASM runtime into src/runtime/server/vendor')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
