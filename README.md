# The Shotcaller

An auto battler in the spirit of Dota. You are the coach: buy heroes, send them down the lanes and watch the fight play out.

## Game modes

- **Three lanes**: the classic. Top, mid and bot, one tower per lane, the throne behind them.
- **Two lanes**: top and bot around the jungle. A good place to start; the tutorial is played here.
- **One lane**: a long bridge with two towers a side and heal relics in the middle. A short match where kills count toward the round.

Every mode has its own duel rating.

## How to play

- Buy heroes in the shop. Three copies of a hero merge into one stronger hero.
- Place heroes on the lanes. Synergies only work between heroes on the same lane.
- Give your heroes items: each has two slots.
- Press **Fight**. The round goes to whoever hurt the enemy towers and throne more. That damage never heals.
- Break the enemy throne and the match is yours on the spot.

Play against the computer or duel your friends; duels move your rating. The game installs as an app and works offline, except for duels and friends.

**Keys:** D reroll, F buy XP, E sell, Space fight, Esc menu.

## Development dependencies

Use Node 24 (`.nvmrc`) and `npm ci`. Dependency install scripts are declared in `package.json`: esbuild validates its binary and vue-demi selects its Vue 3 exports; fsevents scripts are explicitly disabled because file watching has a portable fallback.

Vue I18n uses the v11 Composition API. Overrides update the i18n build plugin's extensions to v9 (removing its deprecated v10 runtime), Workbox's glob to v13, and the optional PWA asset generator to v2. Both the service-worker build and icon generation are verified with these overrides.

TypeScript stays on 6.0.3: the current TypeScript ESLint parser supports `<6.1.0`, and Vue's type checker still uses the JavaScript compiler API that TypeScript 7 replaced. Upgrade it when both tools support the new compiler.

## Public pages and performance

`npm run build` generates the home page, static patch articles, `robots.txt` and `sitemap.xml`. Serve `dist` at the domain root; public patch URLs use `/patches/<version>/`. The canonical origin is `https://theshotcaller.online`. Private screens are excluded from the sitemap and use `noindex` metadata.

The [performance and connection audit](docs/performance-audit.md) includes measured simulation costs, loading changes, device limitations and offline/duel recovery behavior. Reproduce the CPU sample with `TSX_TSCONFIG_PATH=tsconfig.node.json node --import tsx scripts/performance.ts`.
