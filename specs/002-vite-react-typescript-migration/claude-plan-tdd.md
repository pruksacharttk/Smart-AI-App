# TDD Plan: Vite React TypeScript Migration

## Testing Strategy

Use tests to lock existing backend behavior first, then add frontend compile and smoke coverage around the regression-prone browser flows.

## Section 01: Scaffold Vite React TypeScript

### Red

- Add `npm run typecheck` and `npm run build` scripts that initially fail before the scaffold exists.

### Green

- Add Vite React TypeScript dependencies and files.
- Make typecheck and build pass for a minimal app.

### Refactor

- Keep scaffold minimal and avoid migrating app behavior before the API client exists.

### Checks

- `npm run typecheck`
- `npm run build`
- `npm test`

## Section 02: Typed API Client

### Red

- Define TypeScript interfaces and compile-time usage that fails if required client methods are missing.
- Add helper tests for SSE parsing and legacy migration helper if helper code is pure enough for Node tests.

### Green

- Implement all required client methods and typed error handling.
- Implement SSE parser for `status`, `result`, and `error` events.

### Refactor

- Move repeated fetch JSON/error handling into shared helpers.

### Checks

- `npm run typecheck`
- targeted helper tests if added
- `npm test`

## Section 03: App Shell And Dashboard

### Red

- Add a smoke or component-level expectation that app shell renders navigation and Dashboard default state.
- Add TypeScript references to typed usage rows.

### Green

- Implement shell, language toggle, status state, independent skill/config loading, and Dashboard.

### Refactor

- Extract reusable status, navigation, and table components only after behavior works.

### Checks

- `npm run typecheck`
- `npm run build`

## Section 04: Config Page

### Red

- Add smoke test expectations for provider cards and image model guidance on Config.
- Add helper tests for legacy migration:
  - migrates once
  - sanitizes keys
  - does not overwrite DB keys
  - marker blocks future migration

### Green

- Implement provider cards, fallback editor, key guides, key rotation, provider tests, LLM test, and DB + `.env` warning.
- Wire legacy migration after config load.

### Refactor

- Keep provider metadata, default config, model recommendations, and migration helper outside the page component.

### Checks

- `npm run typecheck`
- `npm run build`
- helper tests
- Config smoke test

## Section 05: Run Skill Page

### Red

- Add Playwright smoke test that loads the app and asserts skill selector has at least one option.
- Add smoke test that Run Skill does not show image model guidance.

### Green

- Implement dynamic form rendering, validation, image uploads, SSE execution, output tabs, copy/download, and sample behavior.

### Refactor

- Split field rendering and output rendering into components after parity is achieved.

### Checks

- `npm run typecheck`
- `npm run build`
- Run Skill smoke tests
- manual image upload check

## Section 06: Static Serving

### Red

- Add backend test or focused static-serving test that expects Vite dist to be preferred when present.
- Add negative check that API routes are not swallowed by static fallback.

### Green

- Update `server.js` static root resolution and fallback.

### Refactor

- Keep static path safety logic small and explicit.

### Checks

- `npm test`
- `npm run build`
- manual `npm start` page load

## Section 07: Verification And Cleanup

### Red

- Run the full gate before cleanup and capture any failures.

### Green

- Fix failures, remove obsolete inline UI only after parity, and document commands.

### Refactor

- Remove duplicate frontend code and dead CSS only after smoke tests pass.

### Final Checks

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run test:frontend`
