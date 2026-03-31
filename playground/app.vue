<template>
  <div class="app">
    <!-- Background effects -->
    <div class="bg-gradient" />
    <div class="bg-glow top" />
    <div class="bg-glow bottom" />

    <div class="container">
      <!-- Header -->
      <header class="header">
        <div class="brand">
          <div class="logo">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 2L4 9V23L16 30L28 23V9L16 2Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <path
                d="M16 16L22 12V20L16 24L10 20V12L16 16Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div class="brand-text">
            <h1>nuxt-edge-ai</h1>
            <span class="version">v0.1.4</span>
          </div>
        </div>

        <div class="header-actions">
          <!-- Status Badge -->
          <div
            class="status-badge"
            :class="{ ready: health?.engine.ready }"
          >
            <span class="status-dot" />
            <span class="status-text">{{ health?.engine.ready ? 'Ready' : 'Cold Start' }}</span>
          </div>

          <!-- Settings Dropdown -->
          <details
            ref="settingsRef"
            class="dropdown"
          >
            <summary class="dropdown-trigger">
              <svg
                class="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </summary>
            <div class="dropdown-panel settings-panel">
              <div class="panel-section">
                <h3>Inference Mode</h3>
                <div class="mode-selector">
                  <button
                    type="button"
                    class="mode-option"
                    :class="{ active: mode === 'local' }"
                    @click="setMode('local')"
                  >
                    <div class="mode-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="8"
                          rx="2"
                          ry="2"
                        />
                        <rect
                          x="2"
                          y="14"
                          width="20"
                          height="8"
                          rx="2"
                          ry="2"
                        />
                      </svg>
                    </div>
                    <div class="mode-info">
                      <span class="mode-name">Local</span>
                      <span class="mode-desc">WASM Runtime</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="mode-option"
                    :class="{ active: mode === 'remote' }"
                    @click="setMode('remote')"
                  >
                    <div class="mode-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                      </svg>
                    </div>
                    <div class="mode-info">
                      <span class="mode-name">Remote</span>
                      <span class="mode-desc">OpenAI API</span>
                    </div>
                  </button>
                </div>
              </div>

              <div class="panel-section">
                <label class="toggle-label">
                  <div class="toggle-text">
                    <span class="toggle-title">Stream Response</span>
                    <span class="toggle-desc">Typewriter effect</span>
                  </div>
                  <input
                    v-model="streamingEnabled"
                    type="checkbox"
                    class="toggle-input"
                  >
                </label>
                <label
                  v-if="mode === 'remote'"
                  class="toggle-label"
                >
                  <div class="toggle-text">
                    <span class="toggle-title">Reasoning</span>
                    <span class="toggle-desc">Show reasoning traces</span>
                  </div>
                  <input
                    v-model="reasoningEnabled"
                    type="checkbox"
                    class="toggle-input"
                  >
                </label>
              </div>

              <div class="panel-section info-grid">
                <div class="info-item">
                  <span class="info-label">Runtime</span>
                  <span class="info-value">{{ edgeAI.runtime }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Model</span>
                  <span class="info-value">{{ activeModel }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Fallback</span>
                  <span class="info-value">{{ edgeAI.remoteFallback ? 'On' : 'Off' }}</span>
                </div>
              </div>

              <div class="panel-actions">
                <button
                  class="action-btn"
                  :disabled="pending === 'pull'"
                  @click="warmup"
                >
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  {{ pending === 'pull' ? 'Warming...' : 'Warm Up' }}
                </button>
                <button
                  class="action-btn secondary"
                  @click="clearChat"
                >
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Clear
                </button>
              </div>
            </div>
          </details>
        </div>
      </header>

      <!-- Chat Area -->
      <main class="chat-container">
        <div
          v-if="!hasMessages"
          class="welcome"
        >
          <div class="welcome-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2>Local-first AI</h2>
          <p>Powered by Transformers.js + ONNX Runtime WASM</p>
          <div class="quick-starts">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt"
              class="quick-prompt"
              @click="useQuickPrompt(prompt)"
            >
              {{ prompt }}
            </button>
          </div>
        </div>

        <div
          v-else
          class="messages"
        >
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="[message.role, { streaming: message.isStreaming }]"
          >
            <div class="message-avatar">
              <div
                class="avatar"
                :class="message.role"
              >
                <svg
                  v-if="message.role === 'assistant'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                  />
                </svg>
              </div>
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-author">{{ message.role === 'user' ? 'You' : 'AI' }}</span>
                <span
                  v-if="message.model"
                  class="message-model"
                >{{ message.model }}</span>
                <span
                  v-if="message.fellBackToRemote"
                  class="badge fallback"
                >fallback</span>
                <span
                  v-if="message.isStreaming"
                  class="badge streaming"
                >streaming</span>
              </div>
              <div class="message-body">
                <p class="message-text">
                  {{ message.content }}
                </p>
                <span
                  v-if="message.isStreaming"
                  class="cursor"
                />
              </div>
              <div
                v-if="message.reasoningDetails"
                class="reasoning"
              >
                <details>
                  <summary>Reasoning</summary>
                  <pre>{{ message.reasoningDetails }}</pre>
                </details>
              </div>
              <div
                v-if="message.error"
                class="message-error"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                  />
                  <line
                    x1="12"
                    y1="16"
                    x2="12.01"
                    y2="16"
                  />
                </svg>
                {{ message.error }}
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Input Area -->
      <div class="input-area">
        <div
          v-if="errorMessage"
          class="error-banner"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>
          {{ errorMessage }}
        </div>

        <form
          class="input-form"
          @submit.prevent="sendMessage"
        >
          <div class="input-wrapper">
            <textarea
              ref="inputRef"
              v-model="input"
              :placeholder="isStreaming ? 'AI is thinking...' : 'Message nuxt-edge-ai...'"
              :disabled="isStreaming"
              rows="1"
              @keydown.enter.prevent="sendMessage"
              @input="autoResize"
            />
            <div class="input-actions">
              <div class="token-slider">
                <label>Max tokens: {{ maxTokens }}</label>
                <input
                  v-model.number="maxTokens"
                  type="range"
                  min="32"
                  max="512"
                  step="32"
                >
              </div>
              <button
                v-if="isStreaming"
                type="button"
                class="btn stop"
                @click="stopStreaming"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    rx="2"
                  />
                </svg>
                Stop
              </button>
              <button
                v-else
                type="submit"
                class="btn send"
                :disabled="!input.trim()"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line
                    x1="22"
                    y1="2"
                    x2="11"
                    y2="13"
                  />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  fellBackToRemote?: boolean
  isStreaming?: boolean
  reasoningDetails?: unknown
  error?: string
}

const edgeAI = useEdgeAI()
const inputRef = ref<HTMLTextAreaElement>()
const settingsRef = ref<HTMLDetailsElement>()

// State
const mode = ref<'local' | 'remote'>('local')
const input = ref('')
const maxTokens = ref(160)
const streamingEnabled = ref(true)
const reasoningEnabled = ref(true)
const pending = ref<false | 'pull' | 'generate'>(false)
const errorMessage = ref('')
const messages = ref<Message[]>([])

const { data: health } = await useAsyncData('health', () => edgeAI.health())

const activeModel = computed(() => mode.value === 'remote' ? edgeAI.remoteModel : edgeAI.defaultModel)
const hasMessages = computed(() => messages.value.length > 0)
const isStreaming = computed(() => messages.value.some(m => m.isStreaming))

const quickPrompts = [
  'Write a poem about AI',
  'Explain quantum computing',
  'What is local-first software?',
  'How does WASM work?',
]

function useQuickPrompt(prompt: string) {
  input.value = prompt
  sendMessage()
}

function setMode(newMode: 'local' | 'remote') {
  mode.value = newMode
  messages.value = []
  errorMessage.value = ''
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

function clearChat() {
  messages.value = []
  errorMessage.value = ''
  if (settingsRef.value) {
    settingsRef.value.open = false
  }
}

async function warmup() {
  pending.value = 'pull'
  errorMessage.value = ''
  try {
    await edgeAI.pull()
  }
  catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
  finally {
    pending.value = false
  }
}

function stopStreaming() {
  edgeAI.stop()
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || isStreaming.value) return

  // Add user message
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
  })

  input.value = ''
  nextTick(autoResize)

  // Add assistant placeholder
  const assistantId = crypto.randomUUID()
  const assistantMsg: Message = {
    id: assistantId,
    role: 'assistant',
    content: '',
    model: activeModel.value,
    isStreaming: streamingEnabled.value,
  }
  messages.value.push(assistantMsg)

  pending.value = 'generate'
  errorMessage.value = ''

  try {
    const history = messages.value
      .filter(m => !m.isStreaming && m.id !== assistantId)
      .map(m => ({ role: m.role, content: m.content }))

    if (streamingEnabled.value) {
      for await (const token of edgeAI.streamChatCompletionsGenerator({
        model: activeModel.value,
        remote: mode.value === 'remote',
        messages: history,
        max_tokens: maxTokens.value,
        reasoning: mode.value === 'remote' && reasoningEnabled.value ? { enabled: true } : undefined,
      })) {
        assistantMsg.content += token
      }
      assistantMsg.isStreaming = false
    }
    else {
      const res = await edgeAI.client.chat.completions.create({
        model: activeModel.value,
        remote: mode.value === 'remote',
        messages: history,
        max_tokens: maxTokens.value,
        reasoning: mode.value === 'remote' && reasoningEnabled.value ? { enabled: true } : undefined,
      })
      assistantMsg.content = String(res.choices[0]?.message?.content ?? '')
      assistantMsg.fellBackToRemote = res.fellBackToRemote
      assistantMsg.isStreaming = false
    }
  }
  catch (err) {
    if ((err as Error).name !== 'AbortError') {
      assistantMsg.error = err instanceof Error ? err.message : String(err)
      errorMessage.value = assistantMsg.error
    }
    assistantMsg.isStreaming = false
  }
  finally {
    pending.value = false
  }
}

onMounted(() => {
  autoResize()
})
</script>

<style>
/* CSS Variables */
:root {
  --color-bg: #0a0a0f;
  --color-bg-secondary: #12121a;
  --color-bg-tertiary: #1a1a25;
  --color-surface: rgba(255, 255, 255, 0.05);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.15);

  --color-text: #f0f0f5;
  --color-text-secondary: #a0a0b0;
  --color-text-muted: #606070;

  --color-accent: #00d4aa;
  --color-accent-hover: #00e8bb;
  --color-accent-alpha: rgba(0, 212, 170, 0.15);

  --color-error: #ff6b6b;
  --color-error-bg: rgba(255, 107, 107, 0.1);
  --color-warning: #ffa93d;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 24px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 40px rgba(0, 212, 170, 0.15);

  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* Reset & Base */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
}

/* App Container */
.app {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* Background Effects */
.bg-gradient {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0, 212, 170, 0.08), transparent),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99, 102, 241, 0.05), transparent);
  pointer-events: none;
}

.bg-glow {
  position: fixed;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  opacity: 0.4;
}

.bg-glow.top {
  top: -300px;
  left: -200px;
  background: radial-gradient(circle, rgba(0, 212, 170, 0.3), transparent 70%);
}

.bg-glow.bottom {
  bottom: -300px;
  right: -200px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%);
}

/* Main Container */
.container {
  max-width: 900px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0;
  border-bottom: 1px solid var(--color-border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  width: 40px;
  height: 40px;
  color: var(--color-accent);
}

.logo svg {
  width: 100%;
  height: 100%;
}

.brand-text h1 {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.version {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Status Badge */
.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.status-badge.ready {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-alpha);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  position: relative;
}

.status-badge.ready .status-dot {
  background: var(--color-accent);
}

.status-badge.ready .status-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid var(--color-accent);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0; }
}

/* Dropdown */
.dropdown {
  position: relative;
}

.dropdown summary {
  list-style: none;
  cursor: pointer;
}

.dropdown summary::-webkit-details-marker {
  display: none;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.dropdown-trigger:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.dropdown-trigger .icon {
  width: 16px;
  height: 16px;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-md);
  z-index: 100;
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.panel-section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

/* Mode Selector */
.mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-option:hover {
  border-color: var(--color-border-strong);
}

.mode-option.active {
  border-color: var(--color-accent);
  background: var(--color-accent-alpha);
}

.mode-icon {
  width: 24px;
  height: 24px;
  color: var(--color-text-secondary);
}

.mode-option.active .mode-icon {
  color: var(--color-accent);
}

.mode-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.mode-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.mode-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Toggle */
.toggle-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}

.toggle-label:last-child {
  border-bottom: none;
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.toggle-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.toggle-input {
  appearance: none;
  width: 44px;
  height: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toggle-input::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--color-text-secondary);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle-input:checked {
  background: var(--color-accent-alpha);
  border-color: var(--color-accent);
}

.toggle-input:checked::after {
  left: 22px;
  background: var(--color-accent);
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.info-value {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Panel Actions */
.panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  border-color: var(--color-border-strong);
  background: var(--color-bg-tertiary);
}

.action-btn.secondary {
  color: var(--color-text-secondary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn .icon {
  width: 16px;
  height: 16px;
}

/* Chat Container */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  overflow-y: auto;
}

/* Welcome Screen */
.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
}

.welcome-icon {
  width: 64px;
  height: 64px;
  color: var(--color-accent);
  margin-bottom: 24px;
  opacity: 0.8;
}

.welcome-icon svg {
  width: 100%;
  height: 100%;
}

.welcome h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--color-text), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome p {
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}

.quick-starts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 500px;
}

.quick-prompt {
  padding: 10px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-prompt:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-alpha);
}

/* Messages */
.messages {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message {
  display: flex;
  gap: 16px;
  animation: message-in 0.3s ease;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.avatar svg {
  width: 20px;
  height: 20px;
}

.avatar.assistant {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-alpha);
}

.avatar.user {
  color: var(--color-text-secondary);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.8125rem;
}

.message-author {
  font-weight: 600;
  color: var(--color-text);
}

.message-model {
  color: var(--color-text-muted);
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
}

.badge.fallback {
  background: rgba(255, 169, 61, 0.15);
  color: var(--color-warning);
}

.badge.streaming {
  background: var(--color-accent-alpha);
  color: var(--color-accent);
  animation: pulse-opacity 2s ease-in-out infinite;
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.message-body {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  font-size: 0.9375rem;
  line-height: 1.6;
}

.message.user .message-body {
  background: var(--color-accent-alpha);
  border-color: var(--color-accent);
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: var(--color-accent);
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

/* Reasoning */
.reasoning {
  margin-top: 12px;
}

.reasoning details {
  font-size: 0.8125rem;
}

.reasoning summary {
  color: var(--color-text-muted);
  cursor: pointer;
  user-select: none;
}

.reasoning summary:hover {
  color: var(--color-text);
}

.reasoning pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Message Error */
.message-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: var(--color-error-bg);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: var(--radius-sm);
  color: var(--color-error);
  font-size: 0.8125rem;
}

.message-error svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Input Area */
.input-area {
  padding: 24px 0;
  border-top: 1px solid var(--color-border);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: var(--color-error-bg);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: 0.875rem;
}

.error-banner svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.input-form {
  position: relative;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.input-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.input-wrapper textarea {
  width: 100%;
  min-height: 60px;
  max-height: 200px;
  padding: 16px;
  background: transparent;
  border: none;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.input-wrapper textarea::placeholder {
  color: var(--color-text-muted);
}

.input-wrapper textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border);
}

.token-slider {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-slider label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.token-slider input[type="range"] {
  width: 120px;
  height: 4px;
  background: var(--color-surface);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.token-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn svg {
  width: 18px;
  height: 18px;
}

.btn.send {
  width: 40px;
  height: 40px;
  background: var(--color-accent);
  color: var(--color-bg);
}

.btn.send:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: scale(1.05);
}

.btn.send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn.stop {
  gap: 6px;
  padding: 10px 16px;
  background: var(--color-error-bg);
  color: var(--color-error);
}

.btn.stop:hover {
  background: rgba(255, 107, 107, 0.2);
}

/* Responsive */
@media (max-width: 640px) {
  .container {
    padding: 0 16px;
  }

  .header {
    padding: 16px 0;
  }

  .brand-text h1 {
    font-size: 1.1rem;
  }

  .dropdown-panel {
    position: fixed;
    top: auto;
    right: 16px;
    left: 16px;
    bottom: 80px;
    width: auto;
  }

  .message {
    gap: 12px;
  }

  .avatar {
    width: 32px;
    height: 32px;
  }

  .message-body {
    padding: 12px;
  }
}
</style>
