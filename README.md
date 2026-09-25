# [back-express](https://github.com/AIDDbot/back-express)

Archetype with boilerplate code for a backend API with express

## Quick start

> [!IMPORTANT]
> this projects uses `bun` as a package manager and runner.

1. Install bun: the fastest tooling manager for Node.js projects.

```bash
# Install Bun
# (Windows PowerShell)
powershell -c "irm bun.com/install.ps1 | iex"
# (macOS/Linux)
curl -fsSL https://bun.com/install | bash -s
# Verify installation
bun --version
# Upgrade Bun to the latest stable version
bun upgrade --stable
```

2. Install dependencies and run the tests

```bash
bun install
bun start   # runs the server in production mode
bun test    # runs the unit tests
bun dev     # runs in watch mode for development
bun lint    # runs the linter
```

## Configuration

Runtime settings live in `src/shared/config.ts`. Values that change per machine come from the environment (see `.env.example`). The API mount path is `/api` and is not an environment variable.

| Variable             | Default          | Meaning                                                     |
| -------------------- | ---------------- | ----------------------------------------------------------- |
| `PORT`               | `3000`           | Port the server listens on                                  |
| `HOST`               | unset            | Bind address. Unset listens on all interfaces               |
| `DB_PATH`            | `./data/demo.db` | SQLite database file                                        |
| `DB_BUSY_TIMEOUT_MS` | `5000`           | How long SQLite waits on a locked database, in milliseconds |
| `LOG_DIR`            | `./logs`         | Folder for the daily log files                              |
| `LOG_LEVEL`          | `info`           | Minimum level: `debug`, `info`, `warn`, `error`             |
| `CORS_ORIGIN`        | `*`              | Allowed browser origin, or a comma-separated list           |

## Logging

`src/shared/logger.ts` writes one file per day to `LOG_DIR/yyyy-mm-dd.log` (append only, local time) and echoes each line to the console (`warn`/`error` to stderr).

```text
14:03:22.481 INFO  [http]       GET /api/health 200 3ms
14:03:25.002 ERROR [errors]     boom
```

```ts
import { createLogger } from "./src/shared/logger.js";
const log = createLogger("my-source");
log.info("something happened");
```

## Code quality checks

During regular coding, `bun run lint` is the only required quality check. It runs the basic linter and provides fast feedback while changes are being developed.

The other quality scripts (`quality:warnings`, `quality:complexity`, `quality:coverage`, and `quality:all`) are intended for full audits and solution-hardening work. They do not need to be run for every coding change.

## Tool stack

- [TypeScript7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) : typed superset of JavaScript that compiles to plain JavaScript.
- [Node26](https://nodejs.org/es/blog/release/v26.0.0/) : JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Bun 1.4.0](https://bun.com/docs/installation) : JavaScript runtime and package manager used by this project.
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) : high-performance linter for TypeScript

---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
