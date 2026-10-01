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
