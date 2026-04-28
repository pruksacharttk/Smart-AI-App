# Orchestra Plan

## Task
Fix the first-load header so the app opens on Dashboard with a global "Smart AI App" header, while the skill-specific header appears only on the Run Skill page.

## Classification
- scope: small
- risk: low
- affected_domains: frontend UI
- estimated_file_count: 1
- chosen_route: direct-edit
- task_summary: Keep the top header as the web app name and move skill-specific title/description into the Run Skill page.
- bug_route: false

## Route
Direct edit in `public/index.html`, followed by syntax and smoke checks.
