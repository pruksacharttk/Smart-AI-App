# AGENTS.md

## Orchestra Required For Codebase Work

If the user is only having a normal conversation, asking a factual question, or requesting a simple non-code answer, respond normally.

For any request that requires inspecting, reviewing, changing, testing, or reasoning about the codebase, use the `orchestra` skill before proceeding with code work.

This includes:
- code review or implementation review
- bug investigation
- feature implementation
- refactoring
- architecture or cross-module analysis
- test/debug/verification work
- changes that may touch frontend, backend, database, config, scripts, or specs

Do not require the user to explicitly type `/orchestra`. Treat codebase work as an implicit orchestra invocation.

Exceptions where orchestra is not required:
- simple status checks such as `git status`
- reading or showing a specific file without analysis
- direct terminal utility requests unrelated to code decisions
- casual Q&A that does not require checking repository code

When orchestra is used, follow the skill's own routing, planning, verification, and progress rules.
