<template>
  <main class="app-shell">
    <div class="page-glow page-glow-top" />
    <div class="page-glow page-glow-bottom" />

    <div class="playground-shell">
      <header class="top-bar">
        <div class="bar-brand">
          <p class="eyebrow">
            nuxt-edge-ai
          </p>
          <div class="brand-row">
            <h1>Playground</h1>
            <span class="subtle-pill">{{ mode }}</span>
          </div>
        </div>

        <div class="bar-actions">
          <span
            class="health-pill"
            :class="{ ready: health?.engine.ready }"
          >
            {{ health?.engine.ready ? 'Engine ready' : 'Engine cold' }}
          </span>

          <details
            ref="runtimeMenu"
            class="menu"
          >
            <summary class="menu-trigger">
              Runtime
            </summary>

            <div class="menu-panel">
              <div class="menu-section">
                <p class="menu-label">
                  Inference mode
                </p>

                <div
                  class="mode-switch"
                  role="tablist"
                  aria-label="Inference mode"
                >
                  <button
                    type="button"
                    class="mode-tab"
                    :class="{ active: mode === 'local' }"
                    @click="setMode('local')"
                  >
                    <span>Local</span>
                    <small>WASM runtime</small>
                  </button>
                  <button
                    type="button"
                    class="mode-tab"
                    :class="{ active: mode === 'remote' }"
                    @click="setMode('remote')"
                  >
                    <span>Remote</span>
                    <small>OpenAI-compatible</small>
                  </button>
                </div>
              </div>

              <label
                v-if="mode === 'remote'"
                class="reasoning-toggle"
              >
                <div>
                  <strong>Reasoning traces</strong>
                  <span>Include reasoning details when available.</span>
                </div>
                <input
                  v-model="reasoningEnabled"
                  type="checkbox"
                >
              </label>

              <dl class="menu-meta">
                <div>
                  <dt>runtime</dt>
                  <dd>{{ edgeAI.runtime }}</dd>
                </div>
                <div>
                  <dt>model</dt>
                  <dd>{{ activeModel }}</dd>
                </div>
                <div>
                  <dt>ready</dt>
                  <dd>{{ health?.engine.ready ? 'yes' : 'no' }}</dd>
                </div>
                <div>
                  <dt>fallback</dt>
                  <dd>{{ edgeAI.remoteFallback ? 'on' : 'off' }}</dd>
                </div>
              </dl>
            </div>
          </details>

          <details
            ref="actionsMenu"
            class="menu"
          >
            <summary class="menu-trigger">
              Actions
            </summary>

            <div class="menu-panel action-panel">
              <button
                class="menu-button"
                :disabled="pending"
                @click="handleWarmup"
              >
                {{ pending === 'pull' ? 'Warming local model...' : 'Warm up local model' }}
              </button>
              <button
                class="menu-button"
                :disabled="pending"
                @click="handleRefreshHealth"
              >
                Refresh health
              </button>
              <button
                class="menu-button"
                :disabled="pending"
                @click="handleClearConversation"
              >
                Clear conversation
              </button>
            </div>
          </details>
        </div>
      </header>

      <section
        class="chat-stage"
        :class="{ engaged: isChatActive }"
      >
        <div
          class="chat-frame panel"
          :class="{ engaged: isChatActive }"
        >
          <section
            v-if="isChatActive"
            class="chat-scroll"
          >
            <article
              v-for="message in conversation"
              :key="message.id"
              class="message-row"
              :class="`role-${message.role}`"
            >
              <div
                v-if="message.role === 'assistant'"
                class="avatar"
              >
                AI
              </div>

              <div class="message-card">
                <div class="message-meta">
                  <span class="message-role">{{ message.role === 'user' ? 'You' : 'Assistant' }}</span>
                  <span>{{ message.model || activeModel }}</span>
                  <span v-if="message.fellBackToRemote">fallback</span>
                </div>

                <p class="message-text">
                  {{ message.content }}
                </p>

                <details
                  v-if="message.reasoningDetails"
                  class="reasoning-block"
                >
                  <summary>Reasoning details</summary>
                  <pre>{{ message.reasoningDetails }}</pre>
                </details>

                <p
                  v-if="message.error"
                  class="message-error"
                >
                  {{ message.error }}
                </p>
              </div>
            </article>

            <article
              v-if="pending === 'generate'"
              class="message-row role-assistant"
            >
              <div class="avatar">
                AI
              </div>
              <div class="message-card pending-card">
                <div class="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          </section>

          <section
            class="composer-shell"
            :class="{ engaged: isChatActive }"
          >
            <div
              v-if="errorMessage"
              class="banner error-banner"
            >
              {{ errorMessage }}
            </div>

            <div
              v-if="pullResult"
              class="banner info-banner"
            >
              Local warmup {{ pullResult.loadedNow ? 'loaded the model just now' : 'completed' }}.
            </div>

            <form
              class="composer"
              @submit.prevent="run"
            >
              <textarea
                ref="composerInput"
                v-model="prompt"
                class="composer-input"
                rows="1"
                placeholder="Message nuxt-edge-ai..."
                @input="resizeComposer"
                @keydown.enter.exact.prevent="run"
              />

              <div class="composer-footer">
                <label class="token-control">
                  <span>Max tokens</span>
                  <input
                    v-model.number="maxNewTokens"
                    type="number"
                    min="8"
                    max="256"
                    step="8"
                  >
                </label>

                <button
                  class="primary-button"
                  type="submit"
                  :disabled="pending === 'generate' || !prompt.trim()"
                >
                  {{ pending === 'generate' ? 'Sending...' : 'Send message' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
interface ConversationItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  fellBackToRemote?: boolean
  reasoningDetails?: unknown
  error?: string
}

const edgeAI = useEdgeAI()
const client = edgeAI.client
const composerInput = ref<HTMLTextAreaElement | null>(null)
const runtimeMenu = ref<HTMLDetailsElement | null>(null)
const actionsMenu = ref<HTMLDetailsElement | null>(null)

const mode = ref<'local' | 'remote'>('local')
const prompt = ref('')
const maxNewTokens = ref(160)
const reasoningEnabled = ref(true)
const pending = ref<false | 'pull' | 'generate'>(false)
const errorMessage = ref('')
const pullResult = ref<Awaited<ReturnType<typeof edgeAI.pull>> | null>(null)
const conversation = ref<ConversationItem[]>([])

const { data: health, refresh: refreshHealth } = await useAsyncData('edge-ai-health', () => edgeAI.health())

const activeModel = computed(() => mode.value === 'remote' ? edgeAI.remoteModel : edgeAI.defaultModel)
const isChatActive = computed(() => conversation.value.length > 0)

function closeMenu(menu: { value: HTMLDetailsElement | null }) {
  if (menu.value) {
    menu.value.open = false
  }
}

function setMode(nextMode: 'local' | 'remote') {
  mode.value = nextMode
  closeMenu(runtimeMenu)
}

async function handleRefreshHealth() {
  closeMenu(actionsMenu)
  await refreshHealth()
}

function handleClearConversation() {
  closeMenu(actionsMenu)
  clearConversation()
}

async function handleWarmup() {
  closeMenu(actionsMenu)
  await warmup()
}

function normalizeMessageContent(content: unknown) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object' && 'text' in item) {
          return String(item.text ?? '')
        }

        return ''
      })
      .join('')
  }

  if (content == null) {
    return ''
  }

  return String(content)
}

function scrollToBottom() {
  nextTick(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'auto',
    })
  })
}

function focusComposer() {
  nextTick(() => {
    composerInput.value?.focus()
  })
}

function resizeComposer() {
  nextTick(() => {
    const textarea = composerInput.value
    if (!textarea) {
      return
    }

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
  })
}

function toRemoteMessages() {
  return conversation.value.map(message => ({
    role: message.role,
    content: message.content,
    ...(message.reasoningDetails ? { reasoning_details: message.reasoningDetails } : {}),
  }))
}

function resetConversation() {
  errorMessage.value = ''
  pullResult.value = null
  conversation.value = []
  scrollToBottom()
}

function clearConversation() {
  resetConversation()
  focusComposer()
}

watch(mode, () => {
  resetConversation()
  focusComposer()
})

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
  const text = prompt.value.trim()
  if (!text || pending.value) {
    return
  }

  pending.value = 'generate'
  errorMessage.value = ''

  conversation.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    model: activeModel.value,
  })

  prompt.value = ''
  resizeComposer()
  scrollToBottom()

  try {
    const completion = await client.chat.completions.create({
      model: activeModel.value,
      remote: mode.value === 'remote',
      messages: toRemoteMessages(),
      max_tokens: maxNewTokens.value,
      reasoning: mode.value === 'remote' && reasoningEnabled.value ? { enabled: true } : undefined,
    })

    const assistant = completion.choices[0]?.message
    conversation.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: normalizeMessageContent(assistant?.content),
      model: completion.model,
      fellBackToRemote: completion.fellBackToRemote,
      reasoningDetails: assistant?.reasoning_details,
    })

    await refreshHealth()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = message
    conversation.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'The request failed. Check the banner below for the upstream response.',
      model: activeModel.value,
      error: message,
    })
  }
  finally {
    pending.value = false
    scrollToBottom()
  }
}

onMounted(() => {
  resizeComposer()
  scrollToBottom()
  focusComposer()
})
</script>

<style scoped>
:global(:root) {
  color-scheme: dark;
  --bg-base: #080c12;
  --bg-shell: rgba(13, 18, 27, 0.82);
  --bg-soft: rgba(20, 27, 39, 0.92);
  --bg-muted: rgba(255, 255, 255, 0.04);
  --line-soft: rgba(255, 255, 255, 0.08);
  --line-strong: rgba(0, 220, 130, 0.28);
  --text-strong: #f5f7fb;
  --text-body: rgba(223, 229, 239, 0.78);
  --text-muted: rgba(168, 178, 193, 0.66);
  --accent: #00dc82;
  --accent-soft: #5ff2ac;
  --danger-bg: rgba(133, 39, 32, 0.24);
  --danger-text: #ffc4bb;
  --shadow-xl: 0 32px 90px rgba(0, 0, 0, 0.28);
  --font-ui: "Manrope", "Segoe UI", sans-serif;
}

:global(body) {
  margin: 0;
  min-height: 100vh;
  color: var(--text-strong);
  background:
    radial-gradient(circle at top left, rgba(0, 220, 130, 0.08), transparent 22%),
    radial-gradient(circle at 90% 12%, rgba(0, 220, 130, 0.05), transparent 18%),
    linear-gradient(180deg, #0d1219 0%, #090c12 40%, #06080d 100%);
  font-family: var(--font-ui);
}

:global(*) {
  box-sizing: border-box;
}

.app-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.page-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(110px);
  pointer-events: none;
}

.page-glow-top {
  top: -14%;
  left: -8%;
  width: 420px;
  height: 420px;
  background: rgba(0, 220, 130, 0.09);
}

.page-glow-bottom {
  right: -10%;
  bottom: -12%;
  width: 360px;
  height: 360px;
  background: rgba(0, 220, 130, 0.06);
}

.playground-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(1120px, calc(100vw - 36px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 22px 0 28px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding-bottom: 18px;
}

.bar-brand {
  display: grid;
  gap: 8px;
}

.eyebrow,
.menu-label {
  margin: 0;
  color: var(--accent-soft);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.brand-row h1,
.brand-row h1 {
  margin: 0;
  font-family: var(--font-ui);
  letter-spacing: -0.04em;
}

.brand-row h1 {
  font-size: clamp(1.8rem, 2.5vw, 2.4rem);
  line-height: 1;
}

.subtle-pill,
.health-pill,
.menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-body);
  font-size: 0.85rem;
  white-space: nowrap;
}

.bar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.health-pill.ready {
  border-color: rgba(0, 220, 130, 0.22);
  color: #dffff0;
}

.menu {
  position: relative;
}

.menu summary {
  list-style: none;
}

.menu summary::-webkit-details-marker {
  display: none;
}

.menu-trigger {
  cursor: pointer;
  user-select: none;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.menu[open] .menu-trigger,
.menu-trigger:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.06);
}

.menu-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 12;
  display: grid;
  gap: 16px;
  width: min(360px, calc(100vw - 28px));
  padding: 16px;
  border: 1px solid var(--line-soft);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    rgba(11, 16, 24, 0.96);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(18px);
}

.menu-section {
  display: grid;
  gap: 10px;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mode-tab,
.menu-button,
.composer-input,
.token-control input,
.primary-button {
  color: inherit;
  font: inherit;
  border: 1px solid var(--line-soft);
}

.mode-tab {
  display: grid;
  gap: 4px;
  min-height: 76px;
  padding: 16px;
  border-radius: 22px;
  background: var(--bg-muted);
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.mode-tab span {
  font-weight: 700;
}

.mode-tab small {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.mode-tab.active {
  border-color: var(--line-strong);
  background: linear-gradient(135deg, rgba(0, 220, 130, 0.14), rgba(0, 220, 130, 0.04));
}

.reasoning-toggle {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  background: var(--bg-muted);
}

.reasoning-toggle strong {
  display: block;
  margin-bottom: 4px;
}

.reasoning-toggle span {
  color: var(--text-body);
  line-height: 1.6;
}

.reasoning-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}

.menu-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.menu-meta div {
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: var(--bg-muted);
}

.menu-meta dt,
.message-meta {
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-meta dd {
  margin: 8px 0 0;
  color: var(--text-strong);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.action-panel {
  gap: 10px;
}

.menu-button {
  min-height: 48px;
  padding: 0 16px;
  border-radius: 18px;
  background: var(--bg-muted);
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.panel {
  border: 1px solid var(--line-soft);
  border-radius: 34px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01)),
    var(--bg-shell);
  box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.chat-stage {
  display: grid;
  align-items: center;
  padding: 16px 0 10px;
}

.chat-stage.engaged {
  align-items: start;
}

.chat-frame {
  display: grid;
  grid-template-rows: auto;
  width: min(840px, 100%);
  height: auto;
  margin: 0 auto;
  overflow: hidden;
  transition: width 220ms ease, border-radius 220ms ease;
}

.chat-frame.engaged {
  grid-template-rows: auto auto;
  width: min(1080px, 100%);
}

.chat-scroll {
  display: grid;
  gap: 14px;
  padding: 24px 24px 16px;
}

.message-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.role-user {
  grid-template-columns: minmax(0, 1fr);
  justify-items: end;
}

.avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid var(--line-strong);
  background: linear-gradient(180deg, rgba(0, 220, 130, 0.18), rgba(0, 220, 130, 0.05));
  color: #dfffee;
  font-size: 0.76rem;
  font-weight: 700;
}

.message-card {
  max-width: min(86%, 840px);
  padding: 14px 16px;
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.012)),
    rgba(12, 18, 26, 0.92);
}

.role-user .message-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.016)),
    rgba(18, 24, 34, 0.94);
}

.role-assistant .message-card {
  border-color: rgba(0, 220, 130, 0.16);
  background:
    linear-gradient(180deg, rgba(0, 220, 130, 0.08), rgba(0, 220, 130, 0.02)),
    rgba(11, 17, 25, 0.94);
}

.message-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.7rem;
}

.message-meta span {
  overflow-wrap: anywhere;
}

.message-role {
  color: #d8ffee;
}

.message-text {
  margin: 0;
  color: var(--text-strong);
  line-height: 1.64;
  white-space: pre-wrap;
}

.reasoning-block {
  margin-top: 10px;
  color: var(--text-body);
}

.reasoning-block pre {
  margin: 10px 0 0;
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.035);
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
  font-family: inherit;
  font-size: 0.8rem;
}

.message-error {
  margin: 10px 0 0;
  color: #ffb1a7;
  white-space: pre-wrap;
}

.pending-card {
  display: grid;
  align-items: center;
  min-height: 62px;
}

.typing-dots {
  display: flex;
  gap: 8px;
}

.typing-dots span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--accent);
  animation: pulse 1s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

.composer-shell {
  padding: 18px;
  background: rgba(8, 12, 18, 0.78);
}

.composer-shell.engaged {
  padding: 12px 18px 18px;
  border-top: 1px solid var(--line-soft);
  background: linear-gradient(180deg, rgba(8, 12, 18, 0.4), rgba(8, 12, 18, 0.92));
}

.banner {
  margin-bottom: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  font-size: 0.92rem;
}

.error-banner {
  background: var(--danger-bg);
  color: var(--danger-text);
}

.info-banner {
  background: rgba(0, 220, 130, 0.14);
  color: #dffff0;
}

.composer {
  display: grid;
  gap: 14px;
}

.composer-input {
  width: 100%;
  min-height: 74px;
  max-height: 220px;
  padding: 18px;
  resize: none;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    rgba(7, 12, 19, 0.52);
  line-height: 1.7;
}

.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.token-control {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-body);
}

.token-control input {
  width: 120px;
  height: 44px;
  padding: 0 12px;
  border-radius: 16px;
  background: var(--bg-muted);
}

.primary-button {
  min-width: 148px;
  height: 48px;
  padding: 0 18px;
  border-radius: 16px;
  border-color: rgba(132, 255, 200, 0.28);
  background: linear-gradient(135deg, #00dc82 0%, #37f0aa 100%);
  color: #062012;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(0, 220, 130, 0.16);
  transition: transform 140ms ease, filter 140ms ease;
}

.mode-tab:hover,
.menu-button:hover:enabled,
.primary-button:hover:enabled,
.menu-trigger:hover {
  transform: translateY(-1px);
}

.menu-button:disabled,
.primary-button:disabled {
  opacity: 0.55;
  cursor: default;
}

@keyframes pulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (max-width: 900px) {
  .playground-shell {
    width: min(100vw - 20px, 1120px);
    padding-top: 14px;
  }

  .top-bar,
  .composer-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .bar-actions {
    justify-content: flex-start;
  }

  .chat-frame {
    width: 100%;
    height: auto;
  }

  .menu-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .chat-scroll {
    padding: 18px 14px 14px;
  }

  .message-row {
    grid-template-columns: 1fr;
  }

  .avatar {
    display: none;
  }

  .message-card,
  .role-user .message-card,
  .primary-button,
  .token-control input {
    width: 100%;
    max-width: 100%;
  }

  .token-control {
    width: 100%;
    justify-content: space-between;
  }

  .menu-panel {
    right: auto;
    left: 0;
  }
}
</style>
