# Section 03: Frontend App Shell And Navigation

## Purpose

Create the dashboard-first app shell with a left-side navigation menu and page containers. This section introduces navigation structure but does not need to fully implement Dashboard data rendering or page-specific refactors.

## Scope

Implement:

- Left-side main menu.
- Main content page containers.
- Dashboard as default active page.
- Navigation state and active menu styling.
- Responsive menu behavior.

## Files To Change

- `public/index.html`

## Navigation Requirements

Menu items:

- Dashboard
- Run Skill
- Config

Use a simple allowlisted state:

```text
dashboard | run | config
```

If using hash/query routing, unknown values fall back to `dashboard`.

## Layout Requirements

Desktop:

- Left menu is visually distinct.
- Main content occupies remaining width.
- Active page is clear.

Mobile:

- Menu remains usable.
- Menu does not overlay or hide form/output content.
- Avoid horizontal overflow.

## State Preservation

Page switching should hide/show containers, not destroy DOM nodes. This preserves:

- form values
- uploaded image previews
- output tabs
- current result
- unsaved config edits

## Topbar Adjustments

The current topbar includes skill select and Config button. Recommended:

- Keep language toggle and status visible globally.
- Move skill selector into Run Skill page or hide it except when Run Skill is active.
- Make topbar Config button navigate to Config page.

## Tests And Checks

- Check app initializes to Dashboard.
- Check clicking each menu item shows the correct page.
- Check active menu styling updates.
- Check invalid route falls back to Dashboard if routes use hash/query.
- Check switching away from Run Skill and back preserves form state.
- Check inline script syntax remains valid.

## Acceptance Criteria

- App has Dashboard, Run Skill, and Config page containers.
- Dashboard is default.
- Navigation works without a full page reload.
- Existing Run Skill behavior is not intentionally changed in this section.

## Implemented

- Added left-side navigation menu with Dashboard, Run Skill, and Config.
- Added page containers in `public/index.html`.
- Dashboard is active by default.
- Page switching uses client-side state and CSS classes.
- Skill selector is hidden outside the Run Skill page.
