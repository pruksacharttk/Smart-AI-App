# Section 01: Scaffold Vite React TypeScript

## Purpose

Introduce a Vite + React + TypeScript frontend workspace without breaking the current backend or existing static UI.

## Dependencies

None.

## Scope

Implement:

- `frontend/` folder.
- Vite config.
- React entrypoint.
- TypeScript config.
- Base CSS import.
- Package scripts for build/typecheck/dev.
- Vite dev proxy to backend `/api/*`.

## Files To Change

- `package.json`
- `package-lock.json`
- `frontend/index.html`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/styles/app.css`

## Requirements

- Use React with TypeScript.
- Confirm local Node compatibility with the selected Vite version. Latest Vite requires Node `20.19+` or `22.12+`; if the project cannot enforce that yet, pin Vite to a compatible version and document why.
- Keep existing `server.js` backend unchanged in this section unless scripts require documentation.
- Do not delete `public/index.html`.
- Initial React app can render a minimal shell plus "Migration scaffold" copy.
- `npm run build` should produce Vite output.
- `npm run typecheck` should pass.

## Suggested Dependencies

- `vite`
- `react`
- `react-dom`
- `typescript`
- `@types/react`
- `@types/react-dom`
- `@vitejs/plugin-react`

## Vite Proxy

Development proxy should route:

```ts
server: {
  proxy: {
    "/api": "http://localhost:4173"
  }
}
```

The actual backend port may use env configuration, but default must work with the current app.

## Tests And Checks

- `npm run typecheck`
- `npm run build`
- Existing `npm test`
- `node --version` checked against the selected Vite version.
- Manual open Vite dev server and confirm the React shell renders.

## Acceptance Criteria

- Vite React TS scaffold exists.
- Existing backend tests still pass.
- Existing static app remains available.
- TypeScript build catches missing references.
