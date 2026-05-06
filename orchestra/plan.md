# Orchestra Plan

## Task
Investigate and fix incomplete input rendering for the three auto cinematic skills, and review the completeness of those skill packages.

## Task Classification
- Scope: medium
- Risk: low
- Affected domains: skill packages, skill loader, frontend skill form rendering
- Estimated file count: 4-10
- Chosen route: multi-agent-waves (inline standard mode)
- Bug route: true
- Classification notes: The issue is a user-visible bug in skill input rendering and may involve both skill metadata/schema files and the UI/server loader. No auth, database, or external integration changes are expected.

## Wave Plan
- Wave 1: Inspect skill package structure and compare against known working skills.
- Wave 2: Inspect frontend/backend input rendering and schema loading behavior.
- Wave 3: Apply scoped fixes to the three skills or loader as needed.
- Wave 4: Run relevant validation and summarize completeness gaps.
