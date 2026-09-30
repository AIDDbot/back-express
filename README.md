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

| Variable             | Default          | Meaning                                                                  |
| -------------------- | ---------------- | ------------------------------------------------------------------------ |
| `PORT`               | `3000`           | Port the server listens on                                               |
| `HOST`               | unset            | Bind address. Unset listens on all interfaces                            |
| `DB_PATH`            | `./data/demo.db` | SQLite database file. Relative paths start at the project root           |
| `DB_BUSY_TIMEOUT_MS` | `5000`           | How long SQLite waits on a locked database, in milliseconds              |
| `LOG_DIR`            | `./logs`         | Folder for the daily log files. Relative paths start at the project root |
| `LOG_LEVEL`          | `info`           | Minimum level: `debug`, `info`, `warn`, `error`                          |
| `CORS_ORIGIN`        | `*`              | Allowed browser origin, or a comma-separated list                        |

## Architecture

Two main containers (api and core) and a shared one. `core/` holds server infrastructure and Express middleware, including session middleware. `api/` is where features live. Both can use `shared/`: framework-free utilities, config, logger, `ApiError`, and the SQLite connection (`db.ts`). `src/main.ts` is the composition root and the only file that may import from every folder; it connects the core session middleware to the auth service.

```txt
main.ts  -> depends on api, core, shared
/api     -> depends on shared and Express (shared/db.js from repositories only); router receives middleware by injection
/core    -> depends on shared and Express; session lookup is injected
/shared  -> Node built-ins only (no Express, no other folder)
```

These rules are enforced by `bun run lint` (`eslint/no-restricted-imports` overrides in `.oxlintrc.json`), together with `import/no-cycle`. Test files are exempt.

### API features

The API exposes endpoints following screaming snake case conventions for paths and uses standard HTTP methods for actions.

Inside is a simple layered architecture with controllers handling HTTP requests, services containing business logic, and repositories managing database interactions.

```txt
src/api/
  api.ts            -> wires public routes, injected session middleware, and controllers
  endpoint-alfa/
    *.controller.ts -> depends on the service and auth session accessor
    *.service.ts    -> depends on the repository; no Express
    *.repository.ts -> depends on shared/db.js; no upper layer, no ApiError
    *.types.ts      -> leaf: only other *.types.ts and shared
```

A feature reaches another feature only through its public surface: `*.middleware.ts` and `*.types.ts` (plus `*.service.ts`, from a service). Importing another feature's repository or controller is a lint error.

Repositories know nothing of HTTP: they throw domain errors (e.g. `DuplicateEmailError`) and the service maps them to an `ApiError` with its status.

When adding a new kind of file, write the patterns with `group` (gitignore-style globs, `!` to allow). Avoid `regex`: oxlint does not support lookahead and silently ignores such a pattern.

## API

Every route is mounted under `/api` (see `src/api/api.ts`). Errors always answer `{ "error": "..." }` with the proper status code.

| Method | Path                 | Auth    | Result                                  |
| ------ | -------------------- | ------- | --------------------------------------- |
| `GET`  | `/api/health`        | public  | Uptime and run count                    |
| `POST` | `/api/auth/register` | public  | `201` with the public user              |
| `POST` | `/api/auth/login`    | public  | `{ token, user }`; stores a session row |
| `GET`  | `/api/auth/me`       | session | The current public user                 |

### Protecting routes with session middleware

`login` returns a `token`. Clients send it back as `Authorization: Bearer <token>`. `createSessionMiddleware` (`src/core/session.middleware.ts`) parses the bearer token and delegates session lookup to the auth service, which joins `sessions` and `users`. `api.ts` applies it after the public health, registration, and login routes, so routes added after that point require a session by default. A missing, malformed, or unknown token becomes `401 { "error": "..." }` through the shared error handler.

Add protected routes after the middleware registration in `api.ts`. Do not write your own bearer check, and do not use `(req as any).user`:

```ts
// Inside createApiRouter(requireSession), after apiRouter.use(requireSession)
apiRouter.use(requireSession);
apiRouter.get("/orders", getOrders);

// src/api/orders/orders.controller.ts
import { getSessionUser } from "../auth/auth.session.js";
export const getOrders = (_req: Readonly<Request>, res: Readonly<Response>): void => {
  const user = getSessionUser(res); // typed `User`; never includes the password hash
  res.json(listOrdersFor(user.id));
};
```

`getSessionUser` throws a server error when called on a route that did not pass through the session middleware, so a missing middleware fails loudly.

### Database tables: one owner per module

`src/shared/db.ts` only opens the shared SQLite connection. **Never add table creation to `getDb`.**

Each module owns its schema:

1. `{module}.repository.ts` exports `init{Module}Repository()`, which runs its `CREATE TABLE IF NOT EXISTS …` (and indexes). See `initAuthRepository()` for an example.
2. The module's service calls it from a `start{Module}…()` function, and `src/main.ts` calls that at startup, next to `startAuthTracking()` and `startHealthTracking()`.
3. Tests call the same init function before they touch the tables.

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
