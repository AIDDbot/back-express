# [back-express](https://github.com/AIDDbot/back-express)

Archetype with boilerplate code for a backend API with express

## Quick start

Install [Node.js 26.10+](https://nodejs.org/en/download) with npm (Node 26.10.0 ships npm 11.19.1). `.node-version` pins the baseline release.

```bash
node --version  # must be >= 26.10.0
npm --version
npm install
npm start
npm test
npm run dev
npm run test:watch
npm run lint
npm run fix
npm run quality:all
```

TypeScript runs directly through Node's stable, default type-stripping; no transpiler or runtime flags are required. Relative imports use `.ts`, and `erasableSyntaxOnly` rejects syntax requiring transformation. Node does not type-check at runtime; the type-aware linter checks types.

### Native APIs and experimental options

Checked against `node --help` and the [Node 26.10 CLI documentation](https://nodejs.org/docs/v26.10.0/api/cli.html): `--test`, `--watch`, and `--run` are stable. [Type-stripping](https://nodejs.org/docs/v26.10.0/api/typescript.html#type-stripping) is stable and enabled by default. The ESM preload option `--import` is still experimental.

Coverage options live in `coverage.config.json`, loaded with Node's native `--experimental-config-file` (still experimental in 26.10). The configuration preloads `test.setup.ts` and `coverage.setup.ts`; the latter creates the output directory.

Coverage uses the native runner's experimental `--experimental-test-coverage`, `--test-coverage-exclude`, `--test-coverage-lines`, and `--test-coverage-functions` options. It requires 80% lines and functions, prints a text report, and writes `coverage/lcov.info`. Test files, configuration files, generated files, the composition root, API router, controllers, guards, repositories, and type files are excluded. The native `lcov` reporter needs no external coverage package.

Passwords use [native `crypto.argon2` / `crypto.argon2Sync`](https://nodejs.org/docs/v26.10.0/api/crypto.html#cryptoargon2algorithm-parameters-callback) and PHC Argon2id v19 strings: 65536 KiB memory, 2 passes, 1 lane, random 32-byte salt, and 32-byte digest. Verification reads each stored hash's costs and uses `timingSafeEqual`. A synchronous hash is created once at startup for the unknown-email path; each login performs exactly one verification. The historical fixture and migration baseline are documented in `CHANGELOG.md`.

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
/api     -> depends on shared and Express (shared/db.ts from repositories only); router receives middleware by injection
/core    -> depends on shared and Express; session lookup is injected
/shared  -> Node built-ins only (no Express, no other folder)
```

These rules are enforced by `npm run lint` (`eslint/no-restricted-imports` overrides in `.oxlintrc.tson`), together with `import/no-cycle`. Test files are exempt.

### API features

The API exposes endpoints following screaming snake case conventions for paths and uses standard HTTP methods for actions.

Inside is a simple layered architecture with controllers handling HTTP requests, services containing business logic, and repositories managing database interactions.

```txt
src/api/
  api.ts            -> wires public routes, injected session middleware, and controllers
  endpoint-alfa/
    *.controller.ts -> depends on the service and auth session accessor
    *.service.ts    -> depends on the repository; no Express
    *.repository.ts -> depends on shared/db.ts; no upper layer, no ApiError
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
import { getSessionUser } from "../auth/auth.session.ts";
export const getOrders = (_req: Readonly<Request>, res: Readonly<Response>): void => {
  const user = getSessionUser(res); // typed `User`; never includes the password hash
  res.tson(listOrdersFor(user.id));
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
import { createLogger } from "./src/shared/logger.ts";
const log = createLogger("my-source");
log.info("something happened");
```

## Code quality checks

During regular coding, `npm run lint` is the only required quality check. It runs the basic linter and provides fast feedback while changes are being developed.

The other quality scripts (`quality:warnings`, `quality:complexity`, `quality:coverage`, and `quality:all`) are intended for full audits and solution-hardening work. They do not need to be run for every coding change.

## Tool stack

- [TypeScript7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) : typed superset of JavaScript that compiles to plain JavaScript.
- [Node.js 26.10+](https://nodejs.org/docs/v26.10.0/api/) : JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) : high-performance linter for TypeScript

---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
