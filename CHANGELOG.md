# Changelog

## Node.js 26.10 migration — 2026-10-01

- Baseline with Bun 1.4.2: `bun test` and `bun test --coverage` both passed 95 tests across 14 files, with 0 failures. Coverage: 98.78% lines, 99.08% functions.
- Decoded a real `Bun.password.hash("migration-fixture-password", { algorithm: "argon2id" })`: Argon2id v19, m=65536 KiB, t=2, p=1, 32-byte salt, 32-byte digest, unpadded base64. The exact PHC string is fixed in `src/shared/password.test.ts`.
- Removed Bun runtime, test runner, package manager, lockfile, configuration, and types. Native Node type-stripping, tests, coverage, and Argon2 replace them; npm manages dependencies.
- Final validation with Node 26.10.0 and npm 11.19.1, with Bun absent from PATH: `npm test` passed 99 tests; `npm run quality:all` passed with 98.37% lines and 96.94% functions; `coverage/lcov.info` was generated. `npm start` served `/api/health` with HTTP 200.
