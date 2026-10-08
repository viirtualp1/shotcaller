# Staged release plan

Each release branch builds on the preceding release. Deploy in this order.
The original working directory remains on its unchanged, uncommitted 10.0.1 work.
`codex/10.0.1-base` preserves that baseline for these branches.

| Version | Branch | Scope |
| --- | --- | --- |
| 10.1 | `codex/10.1-recipes` | Eight explicit two-component recipes; no recipe upgrades |
| 10.2 | `codex/10.2-legends` | Three tier-four heroes, abilities and talents |
| 10.3 | `codex/10.3-coach-path` | Coach progression, avatar frames, titles and mastery |
| 10.4 | `codex/10.4-seasons` | Six-week seasons, half-rating reset, medals and cosmetics |
| 10.5 | `codex/10.5-battle-view` | Readable tokens, battle camera and events |
| 10.6 | `codex/10.6-home` | Platform availability and compact upcoming platforms |
| 10.6.1 | `codex/10.6.1-rogue` | Measured Rogue behaviour correction |

Branches listed here are planned until the corresponding implementation and checks are complete.
Release dates currently use the preparation date, 2026-10-08; update before publishing if needed.

For every gameplay release, deploy matching client and arbiter rules together, redeploy
`game-telemetry` for new content identifiers, then run `npm run ghosts:seed` against
the deployed version. Apply required database migrations before the corresponding
client deployment. Preparation does not deploy services or seed production.

## 10.1 — recipes

Implemented on `codex/10.1-recipes`. New match rules: `29d1cf83`.
Validation: typecheck, lint, formatting, production build, 690 unit/component tests.
The built `/patches/10.1/` page was checked in EN/RU at 1440×900 and 390×844.
The browser check covers dragging two stash components, cancelling and confirming.

Local Windows worktree checks share installed dependencies. Vitest needs a writable
TEMP/TMP under the project and a local Vite `server.fs.allow` override for the
junction's resolved dependency directory. These are local runner settings only.
