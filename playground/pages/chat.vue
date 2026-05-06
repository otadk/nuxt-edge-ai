<template>
  <div>
    <!-- Status Bar -->
    <div class="status-bar">
      <div
        class="status-badge"
        :class="{ ready: health?.engine.ready }"
      >
        <span class="status-dot" />
        <span>{{ health?.engine.ready ? 'Ready' : 'Cold Start' }}</span>
      </div>
      <div class="status-info">
        <span>Runtime: {{ edgeAI.runtime }}</span>
        <span>Model: {{ activeModel }}</span>
      </div>
    </div>

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
        <h2>Local-first AI Chat</h2>
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
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
              v-if="message.error"
              class="message-error"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><circle
                cx="12"
                cy="12"
                r="10"
              /><line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
              /><line
                x1="12"
                y1="16"
                x2="12.01"
                y2="16"
              /></svg>
              {{ message.error }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Input -->
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
        ><circle
          cx="12"
          cy="12"
          r="10"
        /><line
          x1="12"
          y1="8"
          x2="12"
          y2="12"
        /><line
          x1="12"
          y1="16"
          x2="12.01"
          y2="16"
        /></svg>
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
            :placeholder="isStreaming ? 'AI is thinking...' : 'Message...'"
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
              ><rect
                x="6"
                y="6"
                width="12"
                height="12"
                rx="2"
              /></svg>
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
              ><line
                x1="22"
                y1="2"
                x2="11"
                y2="13"
              /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      </form>
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
  error?: string
}

const edgeAI = useEdgeAI()
const inputRef = ref<HTMLTextAreaElement>()
const input = ref('')
const maxTokens = ref(160)
const streamingEnabled = ref(true)
const errorMessage = ref('')
const messages = ref<Message[]>([])

const { data: health } = await useAsyncData('health', () => edgeAI.health())
const activeModel = computed(() => edgeAI.defaultModel)
const hasMessages = computed(() => messages.value.length > 0)
const isStreaming = computed(() => messages.value.some(m => m.isStreaming))

const quickPrompts = ['Write a poem about AI', 'Explain quantum computing', 'What is local-first software?', 'How does WASM work?']

function useQuickPrompt(prompt: string) {
  input.value = prompt
  sendMessage()
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

function stopStreaming() {
  edgeAI.stop()
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || isStreaming.value) return

  messages.value.push({ id: crypto.randomUUID(), role: 'user', content: text })
  input.value = ''
  nextTick(autoResize)

  const assistantId = crypto.randomUUID()
  // Push first, then retrieve the reactive proxy — raw object refs are NOT tracked by Vue
  messages.value.push({ id: assistantId, role: 'assistant', content: '', model: activeModel.value, isStreaming: streamingEnabled.value })
  const assistantMsg = messages.value[messages.value.length - 1]!
  errorMessage.value = ''

  try {
    const history = messages.value.filter(m => !m.isStreaming && m.id !== assistantId).map(m => ({ role: m.role, content: m.content }))

    if (streamingEnabled.value) {
      const generator = edgeAI.streamChatCompletionsGenerator({ model: activeModel.value, messages: history, max_tokens: maxTokens.value })
      for await (const token of generator) {
        assistantMsg.content += token
      }
      if (!assistantMsg.content) {
        assistantMsg.error = 'Received empty response from the model.'
        errorMessage.value = assistantMsg.error
      }
      assistantMsg.isStreaming = false
    }
    else {
      const res = await edgeAI.client.chat.completions.create({ model: activeModel.value, messages: history, max_tokens: maxTokens.value })
      assistantMsg.content = String(res.choices[0]?.message?.content ?? '')
      if (!assistantMsg.content) {
        assistantMsg.error = 'Received empty response from the model.'
      }
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
}

onMounted(() => autoResize())
</script>

<style scoped>
.status-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid var(--color-border);
}
.status-badge {
  display: flex; align-items: center; gap: 8px; padding: 6px 14px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 999px; font-size: 0.8125rem; font-weight: 500; color: var(--color-text-secondary);
}
.status-badge.ready { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-alpha); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-text-muted); }
.status-badge.ready .status-dot { background: var(--color-accent); }
.status-info { display: flex; gap: 16px; font-size: 0.8125rem; color: var(--color-text-muted); }

.chat-container { flex: 1; display: flex; flex-direction: column; padding: 24px 0; overflow-y: auto; }

.welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 24px; }
.welcome-icon { width: 64px; height: 64px; color: var(--color-accent); margin-bottom: 24px; opacity: 0.8; }
.welcome-icon svg { width: 100%; height: 100%; }
.welcome h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 8px; background: linear-gradient(135deg, var(--color-text), var(--color-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.welcome p { color: var(--color-text-secondary); margin-bottom: 32px; }
.quick-starts { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 500px; }
.quick-prompt { padding: 10px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 999px; font-size: 0.875rem; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.quick-prompt:hover { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-alpha); }

.messages { display: flex; flex-direction: column; gap: 24px; }
.message { display: flex; gap: 16px; animation: msg-in 0.3s ease; }
@keyframes msg-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.message-avatar { flex-shrink: 0; }
.avatar { width: 36px; height: 36px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); }
.avatar svg { width: 20px; height: 20px; }
.avatar.assistant { color: var(--color-accent); border-color: var(--color-accent); background: var(--color-accent-alpha); }
.avatar.user { color: var(--color-text-secondary); }
.message-content { flex: 1; min-width: 0; }
.message-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.8125rem; }
.message-author { font-weight: 600; color: var(--color-text); }
.message-model { color: var(--color-text-muted); }
.badge { padding: 2px 8px; border-radius: 999px; font-size: 0.6875rem; font-weight: 500; text-transform: uppercase; }
.badge.fallback { background: rgba(255, 169, 61, 0.15); color: var(--color-warning); }
.badge.streaming { background: var(--color-accent-alpha); color: var(--color-accent); }
.message-body { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; font-size: 0.9375rem; line-height: 1.6; }
.message.user .message-body { background: var(--color-accent-alpha); border-color: var(--color-accent); }
.message-text { white-space: pre-wrap; word-break: break-word; }
.cursor { display: inline-block; width: 2px; height: 1.2em; background: var(--color-accent); margin-left: 2px; vertical-align: middle; animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
.message-error { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 12px; background: var(--color-error-bg); border: 1px solid rgba(255, 107, 107, 0.2); border-radius: var(--radius-sm); color: var(--color-error); font-size: 0.8125rem; }
.message-error svg { width: 16px; height: 16px; flex-shrink: 0; }

.input-area { padding: 24px 0; border-top: 1px solid var(--color-border); }
.error-banner { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 12px 16px; background: var(--color-error-bg); border: 1px solid rgba(255, 107, 107, 0.2); border-radius: var(--radius-md); color: var(--color-error); font-size: 0.875rem; }
.error-banner svg { width: 16px; height: 16px; flex-shrink: 0; }
.input-wrapper { display: flex; flex-direction: column; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); transition: all var(--transition-fast); }
.input-wrapper:focus-within { border-color: var(--color-accent); box-shadow: var(--shadow-glow); }
.input-wrapper textarea { width: 100%; min-height: 60px; max-height: 200px; padding: 16px; background: transparent; border: none; color: var(--color-text); font-family: inherit; font-size: 0.9375rem; line-height: 1.5; resize: none; outline: none; }
.input-wrapper textarea::placeholder { color: var(--color-text-muted); }
.input-wrapper textarea:disabled { opacity: 0.6; cursor: not-allowed; }
.input-actions { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--color-border); }
.token-slider { display: flex; flex-direction: column; gap: 4px; }
.token-slider label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
.token-slider input[type="range"] { width: 120px; height: 4px; background: var(--color-surface); border-radius: 2px; outline: none; -webkit-appearance: none; }
.token-slider input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: var(--color-accent); border-radius: 50%; cursor: pointer; }
.btn { display: flex; align-items: center; justify-content: center; padding: 10px; border: none; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all var(--transition-fast); }
.btn svg { width: 18px; height: 18px; }
.btn.send { width: 40px; height: 40px; background: var(--color-accent); color: var(--color-bg); }
.btn.send:hover:not(:disabled) { background: var(--color-accent-hover); transform: scale(1.05); }
.btn.send:disabled { opacity: 0.4; cursor: not-allowed; }
.btn.stop { gap: 6px; padding: 10px 16px; background: var(--color-error-bg); color: var(--color-error); }

@media (max-width: 640px) {
  .container { padding: 0 16px; }
  .message { gap: 12px; }
}
</style>
