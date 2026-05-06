<template>
  <div class="demos-page">
    <h2 class="page-title">
      Task Demos
    </h2>
    <p class="page-desc">
      Try each AI task powered by local WASM models. First request loads the model (cold start).
    </p>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Classify -->
      <div v-if="currentTab === 'classify'">
        <div class="demo-card">
          <h3>Sentiment Analysis</h3>
          <p class="card-desc">
            Classify text as positive or negative. Model: DistilBERT fine-tuned on SST-2.
          </p>
          <textarea
            v-model="classifyInput"
            placeholder="Enter text to analyze sentiment..."
            rows="3"
            class="input"
          />
          <button
            class="btn primary"
            :disabled="classifyLoading"
            @click="runClassify"
          >
            <svg
              v-if="classifyLoading"
              class="spinner"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><path d="M12 6v6l4 2" /></svg>
            {{ classifyLoading ? 'Analyzing...' : 'Analyze Sentiment' }}
          </button>
          <div
            v-if="classifyResult"
            class="result"
          >
            <div
              v-for="p in classifyResult.predictions"
              :key="p.label"
              class="result-row"
            >
              <span
                class="result-label"
                :class="{ positive: p.label === 'POSITIVE', negative: p.label === 'NEGATIVE' }"
              >{{ p.label }}</span>
              <div class="result-bar-bg">
                <div
                  class="result-bar"
                  :style="{ width: `${(p.score * 100).toFixed(0)}%` }"
                />
              </div>
              <span class="result-score">{{ (p.score * 100).toFixed(1) }}%</span>
            </div>
          </div>
          <div
            v-if="classifyError"
            class="error"
          >
            {{ classifyError }}
          </div>
        </div>
      </div>

      <!-- Embed -->
      <div v-if="currentTab === 'embed'">
        <div class="demo-card">
          <h3>Text Embedding</h3>
          <p class="card-desc">
            Generate 384-dimensional embeddings for semantic search. Model: all-MiniLM-L6-v2.
          </p>
          <textarea
            v-model="embedInput"
            placeholder="Enter text to embed...&#10;Or enter multiple lines for batch embedding"
            rows="4"
            class="input"
          />
          <button
            class="btn primary"
            :disabled="embedLoading"
            @click="runEmbed"
          >
            <svg
              v-if="embedLoading"
              class="spinner"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><path d="M12 6v6l4 2" /></svg>
            {{ embedLoading ? 'Computing...' : 'Generate Embedding' }}
          </button>
          <div
            v-if="embedResult"
            class="result"
          >
            <div class="result-meta">
              <span>Shape: [{{ embedResult.shape[0] }}, {{ embedResult.shape[1] }}]</span>
              <span>Model: {{ embedResult.model }}</span>
            </div>
            <div class="embed-preview">
              <details>
                <summary>Embedding vectors (first 8 dimensions)</summary>
                <pre
                  v-for="(emb, i) in embedResult.embeddings.slice(0, 3)"
                  :key="i"
                >[{{ emb.slice(0, 8).map(v => v.toFixed(4)).join(', ') }}, ...]</pre>
              </details>
            </div>
          </div>
          <div
            v-if="embedError"
            class="error"
          >
            {{ embedError }}
          </div>
        </div>
      </div>

      <!-- Summarize -->
      <div v-if="currentTab === 'summarize'">
        <div class="demo-card">
          <h3>Summarization</h3>
          <p class="card-desc">
            Summarize long text into a concise version. Model: DistilBART fine-tuned on CNN/DailyMail.
          </p>
          <textarea
            v-model="summarizeInput"
            placeholder="Paste text to summarize... (works best with paragraph-length content)"
            rows="5"
            class="input"
          />
          <button
            class="btn primary"
            :disabled="summarizeLoading"
            @click="runSummarize"
          >
            <svg
              v-if="summarizeLoading"
              class="spinner"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><path d="M12 6v6l4 2" /></svg>
            {{ summarizeLoading ? 'Summarizing...' : 'Summarize' }}
          </button>
          <div
            v-if="summarizeResult"
            class="result"
          >
            <div class="result-label-text">
              Summary:
            </div>
            <div class="result-text">
              {{ summarizeResult.summary }}
            </div>
            <div class="result-meta">
              <span>Latency: {{ summarizeResult.metrics.latencyMs }}ms</span>
              <span>Input: {{ summarizeResult.metrics.promptLength }} chars</span>
              <span>Output: {{ summarizeResult.metrics.completionLength }} chars</span>
            </div>
          </div>
          <div
            v-if="summarizeError"
            class="error"
          >
            {{ summarizeError }}
          </div>
        </div>
      </div>

      <!-- Translate -->
      <div v-if="currentTab === 'translate'">
        <div class="demo-card">
          <h3>Translation</h3>
          <p class="card-desc">
            Translate between English and Chinese. Model: Helsinki-NLP Opus-MT.
          </p>
          <div class="translate-controls">
            <select
              v-model="translateDirection"
              class="select"
            >
              <option value="en-zh">
                English → Chinese
              </option>
              <option value="zh-en">
                Chinese → English
              </option>
            </select>
          </div>
          <textarea
            v-model="translateInput"
            :placeholder="translateDirection === 'en-zh' ? 'Enter English text...' : '输入中文文本...'"
            rows="3"
            class="input"
          />
          <button
            class="btn primary"
            :disabled="translateLoading"
            @click="runTranslate"
          >
            <svg
              v-if="translateLoading"
              class="spinner"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><path d="M12 6v6l4 2" /></svg>
            {{ translateLoading ? 'Translating...' : 'Translate' }}
          </button>
          <div
            v-if="translateResult"
            class="result"
          >
            <div class="result-label-text">
              Translation:
            </div>
            <div class="result-text">
              {{ translateResult.translation }}
            </div>
            <div class="result-meta">
              <span>Latency: {{ translateResult.metrics.latencyMs }}ms</span>
            </div>
          </div>
          <div
            v-if="translateError"
            class="error"
          >
            {{ translateError }}
          </div>
        </div>
      </div>

      <!-- Fill Mask -->
      <div v-if="currentTab === 'fill-mask'">
        <div class="demo-card">
          <h3>Fill Mask</h3>
          <p class="card-desc">
            Predict missing tokens marked with <code>[MASK]</code>. Model: BERT base uncased.
          </p>
          <textarea
            v-model="fillMaskInput"
            placeholder="The [MASK] was shining brightly in the sky."
            rows="2"
            class="input"
          />
          <button
            class="btn primary"
            :disabled="fillMaskLoading"
            @click="runFillMask"
          >
            <svg
              v-if="fillMaskLoading"
              class="spinner"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><path d="M12 6v6l4 2" /></svg>
            {{ fillMaskLoading ? 'Predicting...' : 'Predict' }}
          </button>
          <div
            v-if="fillMaskResult"
            class="result"
          >
            <div class="result-label-text">
              Top predictions:
            </div>
            <div
              v-for="r in fillMaskResult.results"
              :key="r.tokenStr"
              class="result-row"
            >
              <span class="result-value">{{ r.tokenStr }}</span>
              <div class="result-bar-bg">
                <div
                  class="result-bar"
                  :style="{ width: `${(r.score * 100).toFixed(0)}%` }"
                />
              </div>
              <span class="result-score">{{ (r.score * 100).toFixed(1) }}%</span>
            </div>
          </div>
          <div
            v-if="fillMaskError"
            class="error"
          >
            {{ fillMaskError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const edgeAI = useEdgeAI()

const tabs = [
  { id: 'classify', label: 'Classify', icon: '🏷' },
  { id: 'embed', label: 'Embed', icon: '📊' },
  { id: 'summarize', label: 'Summarize', icon: '📝' },
  { id: 'translate', label: 'Translate', icon: '🌐' },
  { id: 'fill-mask', label: 'Fill Mask', icon: '🎯' },
]
const currentTab = ref('classify')

// Classify
const classifyInput = ref('I absolutely loved this product, it exceeded all my expectations!')
const classifyLoading = ref(false)
const classifyResult = ref<{ predictions: Array<{ label: string, score: number }> } | null>(null)
const classifyError = ref('')

async function runClassify() {
  classifyLoading.value = true
  classifyError.value = ''
  classifyResult.value = null
  try {
    classifyResult.value = await edgeAI.classify({ text: classifyInput.value })
  }
  catch (err) {
    classifyError.value = err instanceof Error ? err.message : String(err)
  }
  finally {
    classifyLoading.value = false
  }
}

// Embed
const embedInput = ref('nuxt-edge-ai makes local AI easy')
const embedLoading = ref(false)
const embedResult = ref<{ embeddings: number[][], shape: [number, number], model: string } | null>(null)
const embedError = ref('')

async function runEmbed() {
  embedLoading.value = true
  embedError.value = ''
  embedResult.value = null
  try {
    const texts = embedInput.value.split('\n').filter(t => t.trim())
    embedResult.value = await edgeAI.embed({ texts: texts.length > 1 ? texts : (texts[0] || embedInput.value) })
  }
  catch (err) {
    embedError.value = err instanceof Error ? err.message : String(err)
  }
  finally {
    embedLoading.value = false
  }
}

// Summarize
const summarizeInput = ref('Artificial intelligence has transformed how we interact with technology. From voice assistants to recommendation systems, AI models are increasingly embedded in everyday applications. However, most AI capabilities today rely on cloud-based APIs, which introduce latency, privacy concerns, and ongoing costs. Local-first AI offers an alternative: running models directly on user devices or on-premise servers. This approach eliminates network dependency, keeps data private, and reduces operational costs. While local models have traditionally been limited by hardware constraints, advances in model compression and WASM-based runtimes now make it practical to run capable models even in browsers and edge environments.')
const summarizeLoading = ref(false)
const summarizeResult = ref<{ summary: string, metrics: { latencyMs: number, promptLength: number, completionLength: number } } | null>(null)
const summarizeError = ref('')

async function runSummarize() {
  summarizeLoading.value = true
  summarizeError.value = ''
  summarizeResult.value = null
  try {
    summarizeResult.value = await edgeAI.summarize({ text: summarizeInput.value })
  }
  catch (err) {
    summarizeError.value = err instanceof Error ? err.message : String(err)
  }
  finally {
    summarizeLoading.value = false
  }
}

// Translate
const translateDirection = ref<'en-zh' | 'zh-en'>('en-zh')
const translateInput = ref('Hello, how are you doing today?')
const translateLoading = ref(false)
const translateResult = ref<{ translation: string, metrics: { latencyMs: number } } | null>(null)
const translateError = ref('')

async function runTranslate() {
  translateLoading.value = true
  translateError.value = ''
  translateResult.value = null
  try {
    const model = translateDirection.value === 'en-zh' ? 'Xenova/opus-mt-en-zh' : 'Xenova/opus-mt-zh-en'
    translateResult.value = await edgeAI.translate({ text: translateInput.value, model })
  }
  catch (err) {
    translateError.value = err instanceof Error ? err.message : String(err)
  }
  finally {
    translateLoading.value = false
  }
}

// Fill Mask
const fillMaskInput = ref('The [MASK] was shining brightly in the sky.')
const fillMaskLoading = ref(false)
const fillMaskResult = ref<{ results: Array<{ tokenStr: string, score: number }> } | null>(null)
const fillMaskError = ref('')

async function runFillMask() {
  fillMaskLoading.value = true
  fillMaskError.value = ''
  fillMaskResult.value = null
  try {
    fillMaskResult.value = await edgeAI.fillMask({ text: fillMaskInput.value })
  }
  catch (err) {
    fillMaskError.value = err instanceof Error ? err.message : String(err)
  }
  finally {
    fillMaskLoading.value = false
  }
}
</script>

<style scoped>
.demos-page { padding: 24px 0; }
.page-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 4px; }
.page-desc { color: var(--color-text-secondary); font-size: 0.875rem; margin-bottom: 24px; }

.tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 999px; font-size: 0.875rem; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.tab-btn:hover { border-color: var(--color-border-strong); color: var(--color-text); }
.tab-btn.active { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-alpha); }
.tab-icon { font-size: 1rem; }

.demo-card { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.demo-card h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 4px; }
.card-desc { color: var(--color-text-secondary); font-size: 0.8125rem; margin-bottom: 16px; }
.card-desc code { background: var(--color-surface); padding: 1px 6px; border-radius: 4px; font-size: 0.8125rem; }

.input { width: 100%; padding: 14px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text); font-family: inherit; font-size: 0.9375rem; line-height: 1.5; resize: vertical; outline: none; transition: border-color var(--transition-fast); margin-bottom: 12px; }
.input:focus { border-color: var(--color-accent); }
.input::placeholder { color: var(--color-text-muted); }

.translate-controls { margin-bottom: 12px; }
.select { padding: 8px 12px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text); font-size: 0.875rem; outline: none; }
.select:focus { border-color: var(--color-accent); }

.btn.primary { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--color-accent); color: var(--color-bg); border: none; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
.btn.primary:hover:not(:disabled) { background: var(--color-accent-hover); }
.btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner { width: 18px; height: 18px; animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.result { margin-top: 16px; padding: 16px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.result-label-text { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
.result-text { color: var(--color-text); line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.result-meta { display: flex; gap: 16px; margin-top: 8px; font-size: 0.75rem; color: var(--color-text-muted); }

.result-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.result-label { font-weight: 600; font-size: 0.875rem; min-width: 80px; }
.result-label.positive { color: #22c55e; }
.result-label.negative { color: #ef4444; }
.result-value { font-weight: 600; font-size: 0.9375rem; min-width: 80px; color: var(--color-accent); }
.result-bar-bg { flex: 1; height: 8px; background: var(--color-surface); border-radius: 4px; overflow: hidden; }
.result-bar { height: 100%; background: var(--color-accent); border-radius: 4px; transition: width 0.5s ease; }
.result-score { font-size: 0.8125rem; color: var(--color-text-secondary); min-width: 52px; text-align: right; }

.embed-preview { margin-top: 12px; }
.embed-preview details summary { font-size: 0.8125rem; color: var(--color-text-muted); cursor: pointer; }
.embed-preview pre { margin-top: 8px; padding: 8px 12px; background: var(--color-surface); border-radius: var(--radius-sm); font-family: 'SF Mono', Monaco, monospace; font-size: 0.75rem; color: var(--color-text-secondary); overflow-x: auto; }

.error { margin-top: 12px; padding: 12px; background: var(--color-error-bg); border: 1px solid rgba(255, 107, 107, 0.2); border-radius: var(--radius-md); color: var(--color-error); font-size: 0.8125rem; }
</style>
