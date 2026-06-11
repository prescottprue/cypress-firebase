# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`cypress-firebase` is a published npm library providing Cypress custom commands (`cy.login`, `cy.callFirestore`, `cy.callRtdb`, `cy.auth*`, etc.) and a Cypress plugin for testing Firebase projects. `firebase-admin` is a peer dependency. Yarn 4 is the package manager.

## Commands

```bash
yarn build              # tsc -> lib/
yarn lint               # biome lint
yarn lint:fix           # biome lint --write
yarn format             # biome format --write
yarn test               # starts firestore+database emulators, runs all unit tests
yarn test:base          # run tests WITHOUT starting emulators (expects them running)
yarn emulators          # start emulators standalone (for use with test:base / test:watch)
yarn size               # build + size-limit check (9kb budget per export)
```

Run a single test file (only `tasks.spec.ts` needs emulators running, e.g. via `yarn emulators` in another terminal):

```bash
yarn vitest run test/unit/tasks.spec.ts
```

Or wrap it in one command: `yarn firebase emulators:exec --only firestore,database "vitest run test/unit/tasks.spec.ts"`. Add `-t 'pattern'` to filter tests by name. Tests use vitest (assertions and mocks via `expect`/`vi`); `vitest.config.ts` loads `test/setup.ts`, which sets emulator env vars and globals (`projectId`, `databaseURL`).

Commits must follow conventional commits (commitlint + husky enforce this); releases are automated via semantic-release, so the commit type determines the published version.

## Architecture

The library has two halves that talk over Cypress's task IPC. This split exists because firebase-admin only runs in Node, while custom commands run in the browser:

1. **Browser side — `src/attachCustomCommands.ts`**: registers all `cy.*` custom commands. Commands don't touch firebase-admin; they package their arguments into a settings object and invoke `cy.task(taskName, settings)`. Login/logout commands additionally use the client-side `firebase` instance (signing in with custom tokens minted by the node side).

2. **Node side — `src/plugin.ts`**: runs in `setupNodeEvents`. Initializes firebase-admin (via `initializeFirebase` in `firebase-utils.ts`), wraps every task from `src/tasks.ts` to inject the admin instance, registers them with `on('task', ...)`, and returns the Cypress config extended with emulator env vars (`extendWithFirebaseConfig.ts` copies `GCLOUD_PROJECT`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_DATABASE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` from `process.env` into `config.env`).

The two sides are linked by `taskSettingKeys` in `src/tasks.ts` — an ordered map from task name to its parameter names. The browser side builds the settings object with those keys; `plugin.ts` destructures them **in array order** back into positional task arguments. Adding or changing a task's parameters requires updating: the task function in `tasks.ts`, its entry in `taskSettingKeys` (order matters), and the corresponding command in `attachCustomCommands.ts`. `typedTask` derives type-safe `cy.task` signatures from these maps.

`src/firebase-utils.ts` also holds the `protectProduction` logic (warn/error when emulator hosts aren't set, to avoid tests hitting real projects) and slash-path → Firestore/RTDB ref conversion, including `where`/`orderBy`/`limit` query building.

### Constraints

- `adminInstance` is intentionally typed `any` and accessed through the legacy namespaced API shape (`admin.firestore()`, `admin.auth()`) so the same code works across firebase-admin versions. firebase-admin v14+ removed that API, so `plugin.ts` detects modular modules via `isModularAdmin` and wraps them with `adaptModularAdmin` (both in `firebase-utils.ts`) to recreate the legacy shape; the adapter lazily `require`s `firebase-admin/*` subpaths. Types are imported from `firebase-admin/*` subpaths as type-only imports.
- The package is consumed in both browser and Node contexts; `package.json`'s `browser` field stubs `fs`/`os`/`path` and the `firebase-admin/*` subpaths used by the adapter. Don't add runtime dependencies (it's advertised as 0-dependency) or Node-only imports to browser-side code paths.
- `size-limit` enforces a 9kb budget on each of the two exports (`attachCustomCommands`, `plugin`).
- Biome handles lint + format (single quotes, spaces). `console` calls are errors; intentional logging uses `// biome-ignore lint/suspicious/noConsole: Intentional logging`.
- Public API surface is only what `src/index.ts` exports: `attachCustomCommands` and `plugin` (plus types).

The `examples/` directory contains standalone example apps; it is excluded from Biome and has its own dependencies.
