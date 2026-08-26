# [back-express](https://github.com/AIDDbot/back-express)

Archetype with boilerplate code for a backend API with express

## Quick start

```bash
# Install Bun 1.4.0 (Windows PowerShell)
powershell -c "irm bun.com/install.ps1 | iex"
bun upgrade --stable

# Verify pinned runtime
bun --version   # expected: 1.4.0

# Install dependencies and start the API
bun install
bun dev
```

Alternative for macOS/Linux:

```bash
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.0"
bun --version   # expected: 1.4.0
bun install
bun dev
```

## Tool stack

- [TypeScript7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) : typed superset of JavaScript that compiles to plain JavaScript.
- [Node26](https://nodejs.org/es/blog/release/v26.0.0/) : JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Bun 1.4.0](https://bun.com/docs/installation) : JavaScript runtime and package manager used by this project.
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) : high-performance linter for  TypeScript 

### Pending: 
- [Stryker](https://stryker-mutator.io/docs/stryker-js/introduction/) : mutation testing framework for JavaScript and TypeScript.
- [Crap4TS](https://github.com/breezy-bays-labs/crap4ts) :  find functions that are too complex and too poorly tested.

---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
