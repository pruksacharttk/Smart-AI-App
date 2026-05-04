<!-- PROJECT_CONFIG
runtime: javascript-npm
test_command: npm test
typecheck_command: npm run typecheck
build_command: npm run build
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-scaffold-vite-react-ts
section-02-typed-api-client
section-03-app-shell-dashboard
section-04-config-page
section-05-run-skill-page
section-06-static-serving
section-07-verification-cleanup
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---|---|---|---|
| section-01-scaffold-vite-react-ts | - | 02, 03, 04, 05, 06, 07 | No |
| section-02-typed-api-client | 01 | 03, 04, 05, 07 | No |
| section-03-app-shell-dashboard | 01, 02 | 04, 05, 07 | No |
| section-04-config-page | 01, 02, 03 | 07 | Yes after 03 |
| section-05-run-skill-page | 01, 02, 03 | 07 | Yes after 03 |
| section-06-static-serving | 01 | 07 | Yes after 01 |
| section-07-verification-cleanup | 03, 04, 05, 06 | - | No |

## Execution Order

1. `section-01-scaffold-vite-react-ts`
2. `section-02-typed-api-client`
3. `section-03-app-shell-dashboard`
4. `section-04-config-page` and `section-05-run-skill-page`
5. `section-06-static-serving`
6. `section-07-verification-cleanup`

## Section Summaries

### section-01-scaffold-vite-react-ts

Add Vite, React, TypeScript, frontend folder structure, scripts, Node/Vite compatibility guard, and baseline build/typecheck.

### section-02-typed-api-client

Create typed API client, response types, SSE helpers, sanitized error handling, and localStorage migration helper integration.

### section-03-app-shell-dashboard

Build React app shell, navigation, status handling, language state, and Dashboard page.

### section-04-config-page

Build Config page with encrypted config API integration, key rotation, provider tests, model guidance, and one-time legacy migration.

### section-05-run-skill-page

Build dynamic Run Skill page from skill schemas, including uploads, SSE run flow, output tabs, and sample behavior.

### section-06-static-serving

Update backend static serving for Vite production output while preserving API route precedence, migration fallback, and static asset safety.

### section-07-verification-cleanup

Add typecheck/smoke tests, verify parity, remove obsolete inline UI only after React frontend is validated.
