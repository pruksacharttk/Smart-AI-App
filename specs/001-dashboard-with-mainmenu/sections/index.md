<!-- PROJECT_CONFIG
runtime: javascript-npm
test_command: npm test
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-usage-store
section-02-backend-api
section-03-app-shell
section-04-dashboard-page
section-05-run-skill-page
section-06-config-page
section-07-security-verification
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---|---|---|---|
| section-01-usage-store | - | 02, 07 | No |
| section-02-backend-api | 01 | 04, 07 | No |
| section-03-app-shell | - | 04, 05, 06 | Yes |
| section-04-dashboard-page | 02, 03 | 07 | No |
| section-05-run-skill-page | 03 | 07 | Yes |
| section-06-config-page | 03 | 07 | Yes |
| section-07-security-verification | 01, 02, 04, 05, 06 | - | No |

## Execution Order

1. `section-01-usage-store` and `section-03-app-shell` can start independently, but section 01 should land first if implementation is sequential.
2. `section-02-backend-api` after section 01.
3. `section-04-dashboard-page` after sections 02 and 03.
4. `section-05-run-skill-page` and `section-06-config-page` after section 03.
5. `section-07-security-verification` last.

## Section Summaries

### section-01-usage-store

Add SQLite dependency, `.gitignore` entry, usage store module, and store-level tests.

### section-02-backend-api

Initialize usage store in `server.js`, add `GET /api/llm-usage`, and record successful LLM usage without breaking successful runs.

### section-03-app-shell

Refactor frontend layout into a dashboard-first app shell with left navigation and page containers.

### section-04-dashboard-page

Implement dashboard data fetching, empty/error/populated states, safe rendering, and refresh/stale behavior.

### section-05-run-skill-page

Move current skill runner into the Run Skill page while preserving existing behavior.

### section-06-config-page

Move Config modal content into the Config page while preserving localStorage compatibility and Test LLM behavior.

### section-07-security-verification

Add final automated/manual checks for sensitive-data minimization, SQL safety, static asset safety, and regression coverage.
