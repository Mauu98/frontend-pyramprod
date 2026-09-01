---
name: frontend-design-review
description: "Trigger: UI, componente, página, pantalla, mockup, diseño, frontend styling, new page, new component. Enforce this app's design tokens and layout conventions before/while writing UI code."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Use before creating or restyling anything under `src/pages`, `src/components`, or `src/layouts`. Not needed for pure logic changes (services, stores, api-client) with no visual surface.

## Hard Rules

- `src/styles/tokens.css` (the `--erp-*` variables) is the single source of truth for color, spacing, radius, and typography. Never hardcode a hex/px value that already has a token; if a needed value is missing, add it to `tokens.css` first, don't inline it.
- Reuse an existing primitive from `src/components/ui` before writing a new one. A new component there is only justified when no existing primitive (button, card, input, form-field, form-dialog, page-layout, etc.) covers the case.
- No boxed/self-contained branding: never wrap a logo or brand element in its own colored box/shadow floating above another card — reuse the page's existing palette and surface instead (established convention, learned the hard way on the login redesign).
- For any new page or a visually significant change to an existing one, produce a mockup via the `design` Artifact skill first and get it approved before touching `src/`. Skip this only for small, obviously-scoped tweaks (copy, spacing nudge, one prop).
- Run a fresh-context review pass before every commit that touches UI, even when you wrote and fixed it yourself in the same session.

## Decision Gates

| Situation | Action |
|---|---|
| Value exists in `tokens.css` | Use the token, never hardcode |
| Value doesn't exist yet and is genuinely reusable | Add to `tokens.css`, then use it |
| Primitive exists in `components/ui` | Reuse/extend it, don't fork |
| New page or visible layout change | Mockup via Artifact first, then implement |
| Small scoped tweak on existing screen | Implement directly, no mockup needed |

## Execution Steps

1. Read `src/styles/tokens.css` and the closest existing page/component in the same domain (e.g. another `pages/catalog/*` file for a catalog change) to match established patterns.
2. If the change is new-page-shaped or visually significant, draft it as an Artifact mockup and confirm with the user before writing code.
3. Implement using existing tokens and `components/ui` primitives; extend tokens only when a genuinely new value is needed.
4. Before commit, run a fresh-context design/code review of the diff.

## Output Contract

State which tokens/primitives were reused, any new token added (and why), and whether a mockup was shown and approved before implementation.
