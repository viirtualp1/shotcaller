# Performance and connection audit — 8.6.1

Date: 2026-10-01. This is a local engineering assessment, not a certification of minimum hardware requirements.

## Assessment

The sampled simulation is inexpensive on an Apple M1 Pro. The more significant risks for weaker devices are GPU work, download size, JavaScript startup, synchronous battle skips, and waking from a suspended tab. A poor connection does not affect solo battle rules or require a stream of battle positions. Online duels exchange boards at round boundaries and simulate the fight on each device.

| Device class          | Evidence and assessment                                                                                                                                                                                      | Remaining validation                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Modern desktop        | M1 Pro CPU benchmark, production browser checks. Plenty of simulation headroom in the sampled cases. Renderer capped at 60 FPS.                                                                              | Long sessions, Windows GPUs, high-resolution monitors.                                    |
| Weak desktop / laptop | Source review and CPU sensitivity estimates. With a hypothetical 6× slower CPU, the worst sampled p95 step is about 0.93 ms. This is an estimate, not measured hardware. GPU/driver quality can matter more. | Physical low-end Intel/AMD integrated graphics, memory pressure, battery saver.           |
| Tablet                | Responsive viewport checks and bounded high-DPI canvas allocation. The renderer no longer adds unrestricted DPR oversampling.                                                                                | Physical Android tablet and iPad: GPU limits, thermal throttling, memory reclamation.     |
| Mobile                | Responsive viewport checks; the decorative demo is unloaded while offscreen. Smaller sound downloads help slow connections.                                                                                  | Low-end Android, iPhone Safari, thermal throttling, actual radio loss and app suspension. |

Viewport emulation changes layout; it does not emulate a phone's CPU, GPU, battery or network. No physical weak laptop, tablet or phone was available for this audit. Network recovery tests use controlled service failures, not a live two-player Supabase session under packet loss.

## Browser and layout sample

The production browser on this M1 Pro showed no measured long task or frame interval over 50 ms during one ten-second early three-lane battle at 1280×720. Browser requestAnimationFrame cadence averaged 119.9 Hz, with p95 interval 8.6 ms and p99 9.3 ms. This measures page scheduling on a 120 Hz display, **not** the capped 60 FPS Pixi draw rate. It is a short sample with two friendly heroes, not a full-roster endurance test.

The summary's hero meters had no horizontal overflow at 1024×768 (658 px dialog width/scroll width) and 390×844 (356 px width/scroll width). Page width matched viewport width at both sizes. The removed “Full bar…” caption was absent. The desktop backing canvas was approximately two million pixels.

## Reproducible simulation measurements

Run `TSX_TSCONFIG_PATH=tsconfig.node.json node --import tsx scripts/performance.ts`.

Machine: Apple M1 Pro, arm64 macOS, Node 24.14.0. Each scenario has one warm-up and five measured seeded fights. Total: 30 measured fights, 40,500 fixed steps. Preview lineups and late-round maximum-size lineups with three-star heroes and two items are sampled; these are not exhaustive worst-case combinations. The measurements exclude rendering, Vue updates, audio, network and storage. Raw output is in [performance-simulation.json](performance-simulation.json).

| Mode / scenario          | Mean step (ms) | p95 (ms) | p99 (ms) | Longest complete round (ms) | Peak entities |
| ------------------------ | -------------: | -------: | -------: | --------------------------: | ------------: |
| Three lanes / preview    |          0.094 |    0.155 |    0.291 |                       135.1 |           108 |
| Three lanes / late round |          0.087 |    0.135 |    0.259 |                       123.7 |           106 |
| Two lanes / preview      |          0.062 |    0.098 |    0.173 |                        93.4 |            75 |
| Two lanes / late round   |          0.057 |    0.088 |    0.155 |                        80.4 |            78 |
| One lane / preview       |          0.051 |    0.085 |    0.162 |                        80.6 |            59 |
| One lane / late round    |          0.038 |    0.057 |    0.104 |                        55.1 |            46 |

Simulation advances at 30 fixed steps per simulated second. At duel speed 2×, that averages one step per 60 Hz display frame. An uninterrupted synchronous skip still has a visible hitch risk: the worst sampled full round takes 135 ms on this machine and could take much longer on weak hardware. Moving skip/replay computation to a worker is a possible follow-up; it requires separating visual event effects from the simulation.

## Loading and rendering changes

- Main entry HTML's JS/CSS dependencies total about **406 KB gzip** (local gzip calculation), down from about 570 KB before separating the dynamic-import helper from Pixi. The initial critical dependency set now excludes Pixi. A visible home demo or game loads it on demand.
- The service worker still precaches roughly **2.1 MiB** of application assets for offline play. That background installation can compete with first-visit traffic; a smaller critical bundle does not mean the entire installation downloads only 406 KB. Optional emoji JSON, audio and historical patch HTML are excluded from precache.
- The climax music shrank from **19,052,830 to 2,210,706 bytes** (88.4% less). The two PCM effects now total 131,547 bytes. AAC/M4A preserves broad browser support; sound quality should be listened to on target devices.
- At a hypothetical 1 Mbps, the old climax file alone needs about **152 seconds**, and the new one about **18 seconds**, before latency, packet loss and streaming behavior. This is transfer arithmetic, not a measured loading time. Other music still includes a 3.1 MB battle track.
- Muted music releases its player and does not create a download. Unmuting starts the current desired track.
- Audio is cached on demand, with support for range requests. Only successfully cached sounds are available offline; a first-ever offline play may be silent. Audio and fonts never block match rules.
- External font waiting is capped at 1.5 seconds before the board draws using fallback fonts.
- Canvas DPR is capped at 2 and at about two million backing pixels where native CSS area permits. It never goes below native 1× resolution, so a native 4K canvas still exceeds this budget.
- The renderer is capped at 60 FPS and stops when the document is hidden. The decorative home demo uses 30 FPS, stops simulation in hidden documents and unmounts outside the viewport.
- A suspended duel catches up at most eight fixed steps per frame, preserving every deterministic step. Returning after a long absence can take several frames rather than blocking input with the entire catch-up at once.
- Per-board art textures are released on destruction; shared role-icon textures survive demo replacement and offscreen unloading.

## Connection behavior

| Scenario                                       | Behavior in 8.6.1                                                                                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slow first visit                               | JS/CSS and visible-board downloads remain required. Fonts time out gracefully. Audio is smaller and muted tracks do not download.                                           |
| Solo match loses internet                      | Battle simulation and device saves continue locally. Previously cached application assets support offline reload. An uncached first visit still needs internet.             |
| Duel loses internet during a running battle    | The received boards and seed are enough to simulate the battle locally. The next exchange and result reporting need internet.                                               |
| Upload succeeds but its response is lost       | The same board remains locked and is retried. The server's existing idempotent submission keeps the original board.                                                         |
| Upload fails / connection flaps                | Recoverable failures retry on the polling cadence; a reconnecting message is shown. A failed request does not silently unlock the submitted lineup for editing.             |
| Realtime board notification is missed          | A poll fetches the opponent's board. Slow requests do not overlap.                                                                                                          |
| Realtime end/forfeit is missed                 | Active-duel state is fetched periodically, so the player observes the server's terminal state.                                                                              |
| Final result request fails transiently         | The report remains queued in memory and is retried. Resuming a locally saved finished duel reports the result again.                                                        |
| Tab becomes visible or browser reports online  | Recovery is triggered without waiting only for another realtime event.                                                                                                      |
| Player signs out / leaves during a request     | Pending exchange is cancelled; late responses are ignored.                                                                                                                  |
| Duel is gone, forbidden, or in the wrong round | Permanent errors stop retrying and use the existing failure explanation.                                                                                                    |
| Long disconnection                             | The server still allows the opponent to claim after the **180-second round timeout**. Reconnection does not make a duel immune to timeout or restore an already ended duel. |

Board/status/result requests have a 12-second timeout. Polling normally runs every five seconds; a request already in flight can delay recovery until it times out and a later poll starts. Internet status is only a browser hint: an online device can still fail to reach the service.

Remaining limitations: invites and presence remain largely dependent on realtime; losing an invitation event can require returning online or refreshing. Closing the page during an unacknowledged forfeit/result is not a guaranteed durable delivery mechanism. The local finished-duel resume path helps with results, but a persistent outbox would be needed for guaranteed retry after every kind of shutdown. Network latency can offset the two devices' battle-start clocks because the server exchanges boards rather than issuing a shared battle-start timestamp. These need a live two-device interruption test before promising seamless competitive recovery.

## SEO and indexing

The build emits 34 patch articles at `/patches/<version>/`, a public home page, canonical and social metadata, robots.txt and sitemap.xml. Patch articles contain real readable HTML before JavaScript and adjacent links. All article content comes from the same player-facing notes as the app. Older hash links continue working. Personal profile/career screens remain hash-based, matches are local app state, and their rendered metadata uses `noindex, nofollow`; these are not separate public articles or sitemap entries.

Robots rules disallow private path prefixes, auth/API paths and audio. Hash fragments are never sent to the server, so robots.txt cannot distinguish `/#/career` from `/`. The app's noindex policy and absence of private crawlable articles are the relevant protections. Robots.txt alone is not a guarantee that a blocked URL will never appear as a bare search result. This follows [Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) and [robots.txt limitations](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

Generated public HTML defaults to English; the app updates metadata and document language to the selected locale. Separate indexable Russian URLs and hreflang are not implemented. Deployment must serve the generated files at the site root (`https://theshotcaller.online`), which is the existing public address.
