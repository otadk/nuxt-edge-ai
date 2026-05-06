<template>
  <div class="app">
    <div class="bg-gradient" />
    <div class="bg-glow top" />
    <div class="bg-glow bottom" />

    <div class="container">
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

        <nav class="nav-links">
          <NuxtLink
            to="/"
            class="nav-link"
            active-class="active"
          >Chat</NuxtLink>
          <NuxtLink
            to="/demos"
            class="nav-link"
            active-class="active"
          >Demos</NuxtLink>
        </nav>
      </header>

      <NuxtPage />
    </div>
  </div>
</template>

<style>
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
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 24px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 40px rgba(0, 212, 170, 0.15);
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

body { background: var(--color-bg); color: var(--color-text); min-height: 100vh; }

.app { min-height: 100vh; position: relative; overflow: hidden; }

.bg-gradient {
  position: fixed; inset: 0;
  background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0, 212, 170, 0.08), transparent),
              radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99, 102, 241, 0.05), transparent);
  pointer-events: none;
}

.bg-glow {
  position: fixed; width: 600px; height: 600px; border-radius: 50%;
  filter: blur(100px); pointer-events: none; opacity: 0.4;
}
.bg-glow.top { top: -300px; left: -200px; background: radial-gradient(circle, rgba(0, 212, 170, 0.3), transparent 70%); }
.bg-glow.bottom { bottom: -300px; right: -200px; background: radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%); }

.container { max-width: 900px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; padding: 0 24px; position: relative; z-index: 1; }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 0; border-bottom: 1px solid var(--color-border);
}

.brand { display: flex; align-items: center; gap: 16px; }
.logo { width: 40px; height: 40px; color: var(--color-accent); }
.logo svg { width: 100%; height: 100%; }
.brand-text h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
.version { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500; }

.nav-links { display: flex; gap: 4px; }
.nav-link {
  padding: 8px 20px; border-radius: 999px; font-size: 0.875rem; font-weight: 500;
  color: var(--color-text-secondary); text-decoration: none; transition: all var(--transition-fast);
}
.nav-link:hover { color: var(--color-text); background: var(--color-surface); }
.nav-link.active { color: var(--color-accent); background: var(--color-accent-alpha); }
</style>
