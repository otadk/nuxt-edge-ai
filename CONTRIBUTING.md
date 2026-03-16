# Contributing

## Development setup

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm vendor:runtime
pnpm lint
pnpm test
pnpm test:types
pnpm prepack
```

## Guidelines

- Keep the module install surface stable for Nuxt consumers.
- Do not introduce runtime dependencies on Ollama, Rust, C++, Python, or native toolchains.
- Prefer changes that work in both local development and published package builds.
- Add or update tests when behavior changes.
- Keep docs in `README.md` and `docs/` aligned with actual behavior.

## Pull requests

- Use small, focused changes.
- Explain the user-facing impact and any runtime tradeoffs.
- Include verification notes for lint, tests, type-checking, and packaging where relevant.

## Release expectations

Releases should pass:

- `pnpm lint`
- `pnpm test`
- `pnpm test:types`
- `pnpm prepack`
