# AGENTS.md

This file defines shared instructions for AI coding tools working in this repository.

## Project overview

- **Service:** `pesticides-ocr-frontend`
- **Runtime:** Node.js `>=24`
- **Module system:** ESM (`"type": "module"`)
- **Framework:** Hapi, Nunjucks views (`@hapi/vision`), GOV.UK Frontend
- **Session cache:** Redis (CatboxRedis) when deployed, CatboxMemory locally
- **Testing:** Vitest
- **Linting/formatting:** neostandard (via ESLint) + Prettier

## Core architecture

- Entry point: `src/index.js`
- Server composition: `src/server/server.js`
- Configuration: `src/config/config.js` (Convict, strict validation)
- Nunjucks setup: `src/config/nunjucks/**`
- Routes: `src/server/routes/**`, collected in `src/server/routes/routes.js` and
  registered by `src/server/plugins/router.js`
- Plugins: `src/server/plugins/*.js` (logging, tracing, pulse, session cache, CSP, router)
- Shared server helpers: `src/server/common/helpers/**`
- Shared Nunjucks components and layouts: `src/server/common/components/**`,
  `src/server/common/templates/**`
- Browser code (bundled by Vite): `src/client/javascripts/**`, `src/client/stylesheets/**`

## Folder structure and naming conventions

Each page (or group of related routes) lives in its own kebab-case folder under
`src/server/routes/`, optionally nested in a journey folder
(`qualifying-questions/`, `pro-users/`, `check-confirm/`, `admin/`). Files inside
a page folder have fixed names, so do not repeat the folder name in them:

```text
src/server/routes/<journey>/<page>/
  index.js          # Hapi plugin: registers the page's routes (entry point)
  index.njk         # Nunjucks view for the page
  controller.js     # route handlers
  controller.test.js
  options.js        # route `options.app` (pageTitle etc.) and Joi `validate`
  items.js          # radio/checkbox items and allowed values (if needed)
  helpers/          # page-specific helpers, with co-located tests (if needed)
```

- Reference views by folder path ending in `index`, e.g.
  `h.view('pro-users/member-schemes/index')` and
  `viewFailAction('pro-users/member-schemes/index')`.
- Import the plugin from the folder's `index.js` in `src/server/routes/routes.js`.
- Tests are co-located next to the file under test as `<file>.test.js`.
  Use a suffix such as `controller.unit.test.js` only to separate a second test style.
- Helpers used by more than one page go in `src/server/common/helpers/`, not in
  `src/client/` (which is for browser code only).
- Nunjucks components follow the GOV.UK Frontend layout:
  `src/server/common/components/<name>/{macro.njk,template.njk}`.

## Coding conventions

- Use **plain JavaScript** (no TypeScript unless explicitly requested).
- Follow existing ESM import style and keep `.js` extensions in imports.
- Prefer internal alias imports using `#/...` for app modules.
- Match existing style:
  - no semicolons
  - single quotes
  - concise functions and explicit names
- Reuse existing helpers and patterns before introducing new abstractions.
- Keep changes focused; avoid unrelated refactors.

## API and plugin patterns

- New pages should follow the folder structure above and be added to
  `src/server/routes/routes.js`.
- Use Hapi response toolkit (`h.view(...)`, `h.redirect(...)`) and `@hapi/boom` for HTTP errors.
- Keep request validation failures explicit (see `src/server/common/helpers/view-fail-action.js`).

## Configuration and environment

- Add new config keys in `src/config/config.js` with:
  - `doc`, `format`, `default`, and `env` where relevant
  - strict compatibility with `config.validate({ allowed: 'strict' })`
- Do not bypass config validation or hardcode environment-specific values.

## Quality gates

Use existing scripts from `package.json`:

- `npm run lint`
- `npm run test`
- `npm run format:check`

For code changes, ensure lint and tests pass before finishing.

## Safety and change boundaries

- Do not commit secrets or credentials.
- Do not remove logging, tracing, or security-related middleware unless requested.
- Preserve existing behavior unless the task explicitly asks for behavioral changes.
- If you change observable behavior (API, config, startup, DB access), update relevant docs/tests in the same change.
