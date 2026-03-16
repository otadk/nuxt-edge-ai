<template>
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">
          nuxt-edge-ai
        </p>
        <h1>Nuxt module for real local LLM inference, shipped as JS + WASM.</h1>
        <p class="lede">
          This playground uses the published module surface only: Nitro routes, composable calls, and a
          bundled Transformers.js + ONNX Runtime WASM backend. No Ollama, no native runtime install.
        </p>
      </div>

      <div class="hero-meta">
        <span>Route: {{ edgeAI.routeBase }}</span>
        <span>Runtime: {{ edgeAI.runtime }}</span>
        <span>Model: {{ edgeAI.defaultModel }}</span>
        <span>Ready: {{ health?.engine.ready ? 'yes' : 'no' }}</span>
      </div>
    </section>

    <section class="stage">
      <article class="panel control">
        <div class="panel-head">
          <p class="panel-title">
            Prompt
          </p>
          <label class="mini">
            Max new tokens
            <input
              v-model.number="maxNewTokens"
              class="token-input"
              type="number"
              min="8"
              max="256"
              step="8"
            >
          </label>
        </div>

        <textarea
          v-model="prompt"
          class="prompt"
          rows="9"
          placeholder="Describe a private AI product, ask for a Nuxt module architecture, or test model behavior."
        />

        <div class="actions">
          <button
            class="primary"
            :disabled="pending"
            @click="warmup"
          >
            {{ pending === 'pull' ? 'Pulling model...' : 'Pull / warm model' }}
          </button>
          <button
            class="accent"
            :disabled="pending"
            @click="run"
          >
            {{ pending === 'generate' ? 'Generating...' : 'Generate text' }}
          </button>
          <button
            class="secondary"
            :disabled="pending"
            @click="refreshHealth()"
          >
            Refresh health
          </button>
        </div>

        <p class="hint">
          First pull may download model weights into the local cache directory. After that, requests reuse the cached files.
        </p>

        <p
          v-if="errorMessage"
          class="error"
        >
          {{ errorMessage }}
        </p>
      </article>

      <article class="panel output">
        <p class="panel-title">
          Generated text
        </p>
        <p class="output-text">
          {{ response?.text || 'No generation yet.' }}
        </p>
        <div class="stats">
          <span>Latency: {{ response?.metrics.latencyMs ?? '-' }} ms</span>
          <span>Provider: {{ response?.provider ?? '-' }}</span>
          <span>Loaded now: {{ pullResult?.loadedNow ?? '-' }}</span>
        </div>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <p class="panel-title">
          Health
        </p>
        <pre>{{ health }}</pre>
      </article>

      <article class="panel">
        <p class="panel-title">
          Last pull
        </p>
        <pre>{{ pullResult ?? 'Model not pulled yet.' }}</pre>
      </article>

      <article class="panel">
        <p class="panel-title">
          Last response
        </p>
        <pre>{{ response ?? 'No response yet.' }}</pre>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
const edgeAI = useEdgeAI()

const prompt = ref('Write a concise pitch for a local-first Nuxt AI module that can be shown in interviews.')
const maxNewTokens = ref(80)
const pending = ref<false | 'pull' | 'generate'>(false)
const errorMessage = ref('')
const pullResult = ref<Awaited<ReturnType<typeof edgeAI.pull>> | null>(null)
const response = ref<Awaited<ReturnType<typeof edgeAI.generate>> | null>(null)
const { data: health, refresh: refreshHealth } = await useAsyncData('edge-ai-health', () => edgeAI.health())

async function warmup() {
  pending.value = 'pull'
  errorMessage.value = ''
  try {
    pullResult.value = await edgeAI.pull()
    await refreshHealth()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    pending.value = false
  }
}

async function run() {
  pending.value = 'generate'
  errorMessage.value = ''
  try {
    response.value = await edgeAI.generate({
      prompt: prompt.value,
      generation: {
        maxNewTokens: maxNewTokens.value,
      },
    })
    await refreshHealth()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    pending.value = false
  }
}
</script>

<style scoped>
:global(body) {
  margin: 0;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 142, 82, 0.18), transparent 30%),
    radial-gradient(circle at 90% 10%, rgba(46, 134, 193, 0.18), transparent 24%),
    linear-gradient(180deg, #f5f0e7 0%, #e7ecef 100%);
  color: #132331;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
}

.shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 20px 64px;
}

.hero,
.panel {
  border: 1px solid rgba(19, 35, 49, 0.14);
  box-shadow: 0 18px 40px rgba(19, 35, 49, 0.08);
}

.hero {
  display: grid;
  gap: 24px;
  padding: 28px;
  background: rgba(255, 248, 241, 0.84);
}

.eyebrow,
.panel-title {
  margin: 0;
  color: #945321;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1 {
  margin: 12px 0 0;
  font-family: "Space Grotesk", "Segoe UI", sans-serif;
  font-size: clamp(2.1rem, 5vw, 4.6rem);
  line-height: 0.94;
  max-width: 880px;
}

.lede {
  max-width: 760px;
  margin: 16px 0 0;
  line-height: 1.7;
  font-size: 1rem;
}

.hero-meta,
.stats,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-meta span,
.stats span {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(19, 35, 49, 0.12);
  font-size: 0.92rem;
}

.stage,
.grid {
  display: grid;
  gap: 20px;
  margin-top: 20px;
}

.stage {
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
}

.grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.panel {
  padding: 22px;
  background: rgba(255, 255, 255, 0.76);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.mini {
  display: grid;
  gap: 8px;
  font-size: 0.8rem;
  color: #4c6274;
}

.token-input,
.prompt {
  border: 1px solid rgba(19, 35, 49, 0.16);
  background: rgba(248, 250, 251, 0.9);
  color: inherit;
  font: inherit;
}

.token-input {
  width: 104px;
  padding: 10px 12px;
}

.prompt {
  width: 100%;
  min-height: 220px;
  margin-top: 14px;
  padding: 18px;
  resize: vertical;
  box-sizing: border-box;
}

button {
  border: 0;
  padding: 12px 16px;
  font: inherit;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

button:hover:enabled {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(19, 35, 49, 0.12);
}

button:disabled {
  opacity: 0.55;
  cursor: default;
}

.primary {
  background: #173a5b;
  color: #f8f2eb;
}

.accent {
  background: #cb5a27;
  color: #fff7f2;
}

.secondary {
  background: #dbe5ed;
  color: #132331;
}

.hint,
.error,
.output-text,
pre {
  margin: 14px 0 0;
}

.hint {
  color: #52687a;
  line-height: 1.6;
}

.error {
  color: #b42318;
}

.output-text {
  min-height: 180px;
  font-size: 1.02rem;
  line-height: 1.75;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.84rem;
  line-height: 1.65;
}

@media (max-width: 900px) {
  .stage {
    grid-template-columns: 1fr;
  }
}
</style>
