# Project instructions

## Code style

- Always use braces for `if`, `else if`, and `else`. Put the body on new lines; never write a conditional and its body on one line.
- Separate meaningful steps with blank lines. Usually leave a blank line after a conditional, and between guards, state changes, and asynchronous work. Keep a variable declaration next to its immediate use when they form one step. Do not add blank lines mechanically between every statement.
- Order Vue `<script setup>` and TypeScript setup code as follows: imports; types/interfaces; plain constants and mutable variables; props/emits; `use*` composables and stores; `ref`/`reactive` state; `computed`; functions; watchers and other subscriptions; lifecycle hooks such as `onMounted`; SEO/head setup such as `useSeo`.
- Preserve dependencies and initialization behavior when ordering declarations. A composable that requires a computed value must follow that value; immediate watchers must follow the state and functions they use.
- Apply these rules to new and edited code. Use the existing Prettier and ESLint configuration, and fix both formatting and lint issues before finishing.

## Validation

- Run `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test` for changes affecting application behavior or project checks. Run the production build when changing application or build configuration.
- Keep tests focused on the behavior under test. Do not simulate an entire match to verify a purchase made during planning. Full-match integration tests should have an explicit timeout appropriate for CI.

## UI styling

- Use `var(--radius)` from `src/ui/styles/base.css` for buttons, links with a button/card surface, cards, panels, dialogs and form controls. The shared radius is `8px`; do not introduce individual values for these surfaces.
- Surfaces attached to the screen edge keep zero radius along that edge and use `var(--radius)` on their exposed corners. Clipped card headers use the same token or inherit the card's radius.
- Circular portraits, status dots, progress tracks and decorative artwork retain the shapes appropriate to their content.

## Patch releases and presentation

- Use patches 8.6 and 8.5 as the visual references for substantial feature releases. Read their entries in `src/ui/patchNotes/notes.ts`, `CareerRelease.vue`, `FeatureCard.vue`, and the relevant feature illustrations before designing a new release.
- A substantial release uses `major.minor` in patch notes (for example, `8.7`) and `major.minor.0` in `package.json` and the root package entries in `package-lock.json`. Small fixes use `major.minor.patch`. Keep versions synchronized, prepend the new notes, and use the user's current calendar date.
- Open a large patch with a clear title, a release-specific illustrated introduction when useful, and a few feature highlights. Use 8.6 and 8.5 as references for visual quality, not templates to copy. Choose a new composition that fits the release: matchmaking suggests a confrontation between squads, while career progression suits a selectable path. Do not repeat mode selectors or interactive dossiers just because an earlier patch used them. Keep the gold, chalk and green palette, hand-lettered headline, generous spacing, and responsive layout.
- Build illustrations with existing Vue components, hero portraits, medals, maps, Lucide icons and CSS. Extend the typed `FeatureArt` variants and `FeatureArt.vue`; add a release-specific component and `campaign` variant for a distinct introduction. Add interaction only when it explains the feature; decorative introductions can be static. Any mode or feature selection must explain the update without starting a match or making network requests.
- Illustrations are fixed historical examples, separate from the player's account and live progress. Never label them: no "Example", "Sample" or similar badges or captions in patch notes or their illustrations. Write historical values explicitly so later balance changes do not rewrite old releases.
- Write every title, description, caption and interaction in English and Russian. Use matching `**highlight**` pairs to emphasize meaningful numbers and benefits. Explain actual player-facing changes, include concise follow-up details and fixes, and avoid backend implementation details, unsupported claims, device-specific layout commentary, and repetition of the feature cards.
- Patch notes are a marketing page, not documentation. Say what players can now do and why it is worth trying. Do not inventory a screen's fields or columns, list what it does not show ("only the chosen photo or avatar, nickname and rank / MMR"), name data sources ("server MMR") or explain how syncing, broadcasts or traffic work. Keep to the rules and numbers that change how people play.
- Keep old patch notes and their illustrations intact. The shared patch picker, pager, latest-patch card and generated SEO pages read `PATCH_NOTES`; extend that source rather than hardcoding a new latest version elsewhere.
- Verify both languages, desktop and narrow-screen layouts, feature interactions, and the built `/patches/<version>/` page. Run the existing patch-note tests and all required project checks. Coordinate any required database migrations with the client deployment; writing release notes does not apply migrations or deploy the release.
