# Memory Games — Interview Q&A

Questions a **technical** or **non-technical** interviewer might ask about this app, with accurate answers based on the current codebase. Pros and cons are included where they help you explain trade-offs honestly.

**Live demo:** [www.playmemorygames.win](https://www.playmemorygames.win/)

---

## Table of contents

1. [Product & purpose (non-technical)](#1-product--purpose-non-technical)
2. [Users, UX & design (non-technical)](#2-users-ux--design-non-technical)
3. [Business, product & prioritization (mixed)](#3-business-product--prioritization-mixed)
4. [Architecture & tech stack (technical)](#4-architecture--tech-stack-technical)
5. [Frontend implementation (technical)](#5-frontend-implementation-technical)
6. [Game logic & learning content (technical)](#6-game-logic--learning-content-technical)
7. [Cloud, auth & data (technical)](#7-cloud-auth--data-technical)
8. [Online multiplayer (technical)](#8-online-multiplayer-technical)
9. [Security, privacy & compliance (mixed)](#9-security-privacy--compliance-mixed)
10. [Testing & quality (technical)](#10-testing--quality-technical)
11. [Mobile, deployment & operations (technical)](#11-mobile-deployment--operations-technical)
12. [Adventure roadmap & stickers (mixed)](#12-adventure-roadmap--stickers-mixed)
13. [Challenges, mistakes & what you’d improve (mixed)](#13-challenges-mistakes--what-youd-improve-mixed)

---

## 1. Product & purpose (non-technical)

### What is this app?

**Answer:** Memory Games is a browser-first learning game for kids. Players flip cards to find matching pairs while practicing **English**, **addition/subtraction**, **multiplication**, and **fractions**. It supports solo play on one device, optional cloud save, and real-time **online 1v1** with a friend via a room code.

**Pros:** One app covers several school subjects; memory mechanics keep it playful rather than worksheet-like.

**Cons:** It is not a full curriculum — it reinforces topics through repetition, not structured lessons.

---

### Who is it for?

**Answer:** Primarily **children** (roughly ages 5–12) and the adults who supervise them — parents, tutors, or teachers. The UI supports **English and Hebrew**, plus **German, Spanish, and French** for menus and labels. English 2 (bilingual matching) appears when the UI language is not English.

**Pros:** Multi-language UI broadens reach; local multi-profile support fits shared family tablets.

**Cons:** Content depth varies by mode; not all sticker art is finished yet (some use emoji placeholders).

---

### What problem does it solve?

**Answer:** Kids often need **short, repeatable practice** in math and language. Traditional drills can feel boring. This app turns practice into a game with immediate feedback (match/no match), celebration on wins, optional quizzes, records, and a long-term **adventure roadmap** with collectible stickers.

**Pros:** Low friction — open and play in seconds; no account required for local-only use.

**Cons:** Requires adult setup for cloud sync, Google sign-in, and online play.

---

### How is this different from other memory or educational apps?

**Answer:**

| Differentiator | What we do |
|----------------|------------|
| Subject breadth | Five distinct game engines in one shell |
| Online play | Peer-to-peer WebRTC with room codes — no game server billing |
| Local-first | Full solo experience without backend configuration |
| Adventure layer | Level-based challenges + weekly sticker albums (Match Masters–style collection) |
| Bilingual | Hebrew ↔ English mode built in, not bolted on |

**Pros:** Technical choices (P2P, local-first) keep hosting costs low.

**Cons:** P2P is harder to debug than a central game server; fewer “social lobby” features than big commercial titles.

---

### Is it free? How do you make money?

**Answer:** The project is positioned as a learning/portfolio product with a public demo. There is **no in-app payment or ads** in the codebase today. Distribution is via web and an **Android (Capacitor)** build path for the Play Store.

**Pros:** Simple, kid-safe experience without ad tracking.

**Cons:** No monetization model implemented — sustainability would need a deliberate product decision.

---

## 2. Users, UX & design (non-technical)

### What does a typical play session look like?

**Answer:**

1. Choose a **player profile** (name on this device).
2. Pick **game mode** and **difficulty** (pairs count, level).
3. Flip two cards per turn; matches stay face-up.
4. On win: confetti, optional **“Test me”** quiz, records update.
5. Roadmap progress may advance; a **sticker reward** can unlock for the weekly album.

**Pros:** Clear loop: play → win → reward → optional quiz.

**Cons:** Many entry points (modes, roadmap, album, online) — new users benefit from the built-in tutorial.

---

### Why a memory (concentration) mechanic instead of quizzes only?

**Answer:** Matching engages **visual memory and attention**. For language, pairing words to pictures or translations reinforces recognition. For math, pairing `7×8` to `56` builds automatic recall. The post-win quiz adds a second retrieval step.

**Pros:** Works for pre-readers (English 1 uses pictures); same engine powers all modes.

**Cons:** Less suited to open-ended writing or long reading comprehension.

---

### Tell me about the visual design and themes.

**Answer:** The app uses a **kid-friendly game art** style: saturated purples and oranges, navy starfield backgrounds, sticker-style rewards, and PNG mode/nav icons. Three UI themes exist: **Light**, **Dark**, and **Fun** (deep blue, kid-oriented). The adventure roadmap uses a full-screen cosmic star-trail illustration.

**Pros:** Consistent art direction documented in `.cursor/skills/memory-match-art/`; assets feel like one family.

**Cons:** Mixed maturity — some stickers have custom art, others emoji placeholders; layout tuning on mobile took iteration.

---

### How do you handle Hebrew / RTL?

**Answer:** Hebrew UI uses **Rubik/Heebo** fonts, RTL layout rules in CSS (`html[lang="he"]`), and dedicated message files under `src/i18n/messages/he.js`. English 2 matches **Hebrew text to English text** when the UI locale is Hebrew.

**Pros:** Real bilingual product, not just translated strings.

**Cons:** RTL + full-screen roadmap required extra CSS care; more QA surface per locale.

---

### What accessibility considerations exist?

**Answer:** The app uses semantic HTML (`dialog`, `button`, `aria-label` on nav icons), speech synthesis for English cards at certain levels, and large touch targets on mobile. There is no dedicated screen-reader audit documented in the repo.

**Pros:** Speech support helps pronunciation practice.

**Cons:** Not a full a11y compliance project yet — color contrast and keyboard-only flows could be improved.

---

## 3. Business, product & prioritization (mixed)

### Why build this project?

**Answer:** To ship a **complete vertical slice**: game UX, cloud sync, real-time multiplayer, mobile packaging, i18n, and gamification (roadmap/albums). It demonstrates full-stack product thinking without a large team.

**Pros:** Shows end-to-end ownership — from SQL policies to sticker art briefs.

**Cons:** Scope is wide for a solo/small team; some areas are intentionally “good enough.”

---

### How did you prioritize features?

**Answer:** Phased roadmap documented in `docs/PROJECT.md`:

| Phase | Focus |
|-------|--------|
| 1 | UI polish, themes |
| 2 | Auth (anonymous + Google) |
| 3 | Security (RLS) |
| 4 | Multiplayer hardening (TURN, signaling) |

Adventure roadmap, analytics, and extra locales were added as engagement and ops needs grew.

**Pros:** Security and multiplayer were not afterthoughts.

**Cons:** Some backlog items remain (`FUNCTIONALITY-TODO.md` is mostly empty; broader ideas live in `LEARNING-TODO.md`).

---

### What metrics would you track?

**Answer:** The codebase supports **admin analytics** via a Supabase Edge Function (`admin-stats`): signups over time, age-range buckets, roadmap level distribution, album engagement. Game-level metrics (wins per mode, session length) are stored in **local/cloud records**, not a separate analytics pipeline.

**Pros:** Age stored as **ranges** (`5_6`, `7_8`, …), not exact birthdates — privacy-conscious.

**Cons:** No product analytics SDK (Mixpanel, etc.); ops dashboards are DIY.

---

### What would you cut if you had half the time?

**Answer:** Likely **online multiplayer** or **sticker album art** first — both are high-effort. Core solo learning + records delivers most educational value faster.

**Pros:** Honest scoping conversation.

**Cons:** Cutting multiplayer removes a major differentiator.

---

## 4. Architecture & tech stack (technical)

### What is the tech stack?

**Answer:**

| Layer | Choice |
|-------|--------|
| UI | **Vanilla JavaScript** (ES modules), HTML, CSS |
| Build | **Vite 6** |
| Tests | **Vitest** |
| Mobile | **Capacitor 7** (Android) |
| Backend | **Supabase** (Postgres, Auth, Realtime, Edge Functions) |
| P2P | **WebRTC** data channels |
| TURN | **Cloudflare Worker** (`workers/turn-credentials`) |

**Pros:** Small bundle; no framework version churn; Vite dev experience is fast.

**Cons:** No React/Vue means manual DOM updates — `main.js` is large; pattern discipline is up to the author.

---

### Why vanilla JavaScript instead of React/Vue/Angular?

**Answer:** The app is **DOM-centric** (flip cards, dialogs, drag-and-drop stickers) without complex component trees. Vanilla JS avoids framework overhead and keeps the deployed bundle smaller — important for kids on older phones.

**Pros:**

- Fast cold start on mobile web
- Easy to reason about for a focused game loop
- Fewer dependencies to maintain

**Cons:**

- Harder to scale UI complexity — roadmap/album code is module-separated but still hand-rolled
- No built-in state management — state lives across `main.js`, `roadmap.js`, `user-store.js`, etc.
- Hiring/onboarding: many teams expect a framework

---

### Describe the high-level architecture.

**Answer:**

```text
index.html + main.js (shell, board, settings)
    ├── game.js / english-game.js / sums-game.js / fraction-game.js
    ├── roadmap.js + roadmap-ui.js (adventure progression)
    ├── records.js + quiz.js
    ├── cloud-sync.js + auth.js → Supabase
    └── online-ui.js → multiplayer/ (WebRTC + signaling)
```

Supabase stores **per-user player stats**; it does **not** host live game state for online matches.

**Pros:** Clear separation between solo engines and online session layer.

**Cons:** `main.js` orchestrates many concerns — a future refactor could extract a thin app controller.

---

### Why Vite?

**Answer:** Native ESM dev server, fast HMR, simple production build to `dist/`, and first-class support for importing assets (PNG icons, roadmap map). No custom webpack config needed.

**Pros:** Low config; works well with Capacitor (`npm run cap:sync`).

**Cons:** Less ecosystem than Next.js for SSR/SEO — mitigated by static `publicMeta` content in `index.html` for crawlers.

---

### How do modules communicate?

**Answer:** Plain **ES module imports** and a few **callback/deps objects** (e.g. `initRoadmapUi({ t, getCurrentUserSlug, onStartChallenge })`). Auth broadcasts via listener sets in `auth.js`. Cloud sync reads/writes through `user-store.js` and `records.js`.

**Pros:** Explicit dependencies; easy to unit test pure game functions.

**Cons:** No central event bus — cross-feature wiring requires knowing import graph.

---

## 5. Frontend implementation (technical)

### How is state managed?

**Answer:**

| State | Where |
|-------|--------|
| Active game (deck, turns, flipped cards) | In-memory in `main.js` / host-game for online |
| Player profiles | `localStorage` via `user-store.js` |
| Records | `localStorage` + optional Supabase sync |
| Roadmap progress | `localStorage` per player slug; summary synced to cloud |
| Auth session | Supabase client session |
| UI dialogs | Native `<dialog>` elements + module init functions |

**Pros:** Local-first — app works offline for solo play.

**Cons:** Multiple storage keys; migration logic must stay careful (see legacy stats migration in `user-store.js`).

---

### How does internationalization work?

**Answer:** `src/i18n.js` loads message objects from `src/i18n/messages/{en,he,de,es,fr}.js`. `t("key", { vars })` resolves strings. Page `lang` and `dir` attributes switch for Hebrew RTL.

**Pros:** No runtime JSON fetch; all strings bundled — works offline.

**Cons:** Adding a language means duplicating a large message file; no TMS integration.

---

### How are themes implemented?

**Answer:** CSS custom properties on `:root[data-theme="light|dark|fun"]` in `src/style.css`. Toggle sets `data-theme` on the document root. Adventure and screen dialogs consume shared tokens.

**Pros:** One codebase, three looks; kid-friendly “fun” theme is the default brand feel.

**Cons:** Theme-specific overrides spread across `style.css`, `adventure.css`, `screens.css`.

---

### How is the adventure roadmap UI built?

**Answer:** `roadmap-ui.js` renders a **full-screen dialog** with:

- Background image (`docs/images/adventure/roadmap-map.png`)
- Level nodes positioned along a polyline (`roadmap-map-spots.js`, 512×768 coordinate space)
- Separate **album dialog** for weekly sticker collection (drag-and-drop placement)
- Challenge popover docked in the footer bar (does not cover level 1)

**Pros:** Custom illustration gives a premium kid-game feel; progression is visual.

**Cons:** Layout is sensitive to viewport changes on mobile — required `svh`, aspect-ratio, and touch-action tuning.

---

## 6. Game logic & learning content (technical)

### How is a card deck generated?

**Answer:** Each mode has a builder:

- `buildEnglishDeck`, `buildSumDeck`, `buildFractionDeck`, etc.
- Pools are filtered by difficulty; entries are shuffled (`shuffle` in `game.js`).
- Pairs are duplicated and shuffled again for the board.

Online play uses a **seeded PRNG** so host and guest get identical decks (`multiplayer/online-deck`).

**Pros:** Deterministic online decks prevent cheating by regenerating locally.

**Cons:** Deck variety is bounded by curated pools — not procedurally infinite.

---

### How does English content work?

**Answer:** Curated lexicon in `english-game.js` with topics (animals, colors, jobs, …). **English 1** pairs icons with English words. **English 2** pairs a source language (Hebrew, French, German, Spanish) with English. `scripts/build-english-lexicon.mjs` validates vocabulary. Speech uses the Web Speech API (`english-speech.js`).

**Pros:** Quality-controlled word lists; topic rotation keeps rounds fresh.

**Cons:** Expanding vocabulary requires script maintenance, not live CMS edits.

---

### How does the “Test me” quiz work?

**Answer:** After a solo win, `quiz.js` builds questions from the **same deck** the player just matched. `scorePercent` drives pass/fail; results feed records and can advance roadmap **testPass** goals.

**Pros:** Reinforces active recall immediately after visual matching.

**Cons:** Quiz is short and multiple-choice style — not adaptive AI tutoring.

---

### How are difficulty levels defined?

**Answer:** Per-mode `easy | medium | hard` filters pool size, number ranges, or vocabulary complexity. Pair count (4/6/8 pairs) is user-selectable and affects board size.

**Pros:** Simple mental model for kids and parents.

**Cons:** Difficulty is rule-based, not personalized to individual performance yet.

---

## 7. Cloud, auth & data (technical)

### What does Supabase store?

**Answer:** Primarily the `memory_players` table: per-auth-user rows with JSON stats, records, optional `age_range`, `created_at`, and a compact `roadmap` summary for analytics. **No online match state** in the database.

**Pros:** Minimal backend surface; RLS-friendly single table.

**Cons:** Large JSON blobs in one row — harder to query fine-grained stats in SQL without schema evolution.

---

### Explain the auth strategy.

**Answer:** (`src/auth.js`)

1. If Supabase env vars are set, every visitor gets an **anonymous Supabase session** on boot — kids never see a login wall.
2. Optional **Google sign-in** uses `linkIdentity` to upgrade the anonymous user so progress follows them across devices.
3. If Supabase is not configured, auth is a **no-op** — fully local app.

**Pros:** Frictionless for children; still supports cross-device sync when parents opt in.

**Cons:** Anonymous accounts can be lost if local storage is cleared before linking Google; requires clear parent communication.

---

### What is Row Level Security (RLS)?

**Answer:** `supabase/03_security_rls.sql` replaces open policies with **owner-scoped** rules: `owner_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE. Clients only ever use the **anon key**; service role is server-side only (Edge Functions).

**Pros:** Even if the frontend is compromised, users cannot read others’ rows by default.

**Cons:** Legacy rows with `owner_id IS NULL` become invisible after migration — they must resync from device.

---

### How does cloud sync work?

**Answer:** `cloud-sync.js` pushes local player profiles and records to `memory_players` when authenticated. A stable `device_id` in localStorage helps reconcile profiles. Sync is **best-effort** — solo play never blocks on network.

**Pros:** Graceful degradation without Supabase.

**Cons:** Conflict resolution is last-write-wins style, not CRDT — rare edge cases if two devices edit offline.

---

### Why an Edge Function for admin stats?

**Answer:** `supabase/functions/admin-stats` uses the **service role** server-side to aggregate across users. The browser passes a **Bearer secret** (`ADMIN_STATS_SECRET`) — not exposed in the client bundle as a database key. This avoids widening RLS for admin dashboards.

**Pros:** Aggregates without giving every client service-role access.

**Cons:** Shared secret auth is simple but not as robust as OAuth/JWT roles — fine for internal ops, not enterprise IAM.

---

## 8. Online multiplayer (technical)

### How does online play work end-to-end?

**Answer:**

1. **Host** picks game + level, creates a room → 6-letter code.
2. **Guest** joins with code or invite URL.
3. **Signaling** (SDP offer/answer, ICE candidates) flows through **Supabase Realtime** channels.
4. After connect, all gameplay uses a **WebRTC data channel** (host-authoritative state).
5. **TURN** (Cloudflare Worker) helps when direct peer connection fails (mobile NAT).

**Pros:** Game traffic is peer-to-peer — no central game server to scale or pay for per match.

**Cons:** Host leaving kills the session; NAT/firewall issues require TURN; harder to replay or moderate matches centrally.

---

### Why WebRTC for game state instead of Supabase Realtime?

**Answer:** Realtime is for **low-volume signaling**. Game moves at match speed would increase latency, cost, and server load. WebRTC data channels give **sub-100ms** LAN-like latency when P2P works.

**Pros:** Appropriate tool split — signaling vs data plane.

**Cons:** Two connection technologies to debug; WebRTC state is opaque to the backend.

---

### What does “host-authoritative” mean?

**Answer:** The **host’s browser** owns truth for flipped cards, turns, and win detection. The guest applies messages from the host. This prevents guests from cheating by mutating shared state locally.

**Pros:** Simple trust model; no server-side game loop.

**Cons:** If host tab freezes, game stalls; host has slight advantage if implementation bugs exist.

---

### How are room codes generated?

**Answer:** Six letters from an unambiguous alphabet (no `I`/`O` confusion), tested in `multiplayer/room-code.test.js`. Codes map to Realtime channel names.

**Pros:** Easy for kids to read aloud over the phone.

**Cons:** Finite space — collisions possible at scale; would need expiry/unicity policy for huge traffic.

---

### What happens when a player quits?

**Answer:** Peer-leave signals propagate; remaining player sees win/confetti. Cleanup runs on dialog close (ICE debounce, channel unsubscribe, data channel close). Connect timeout prevents indefinite “waiting” UI.

**Pros:** Defined failure modes — not a hung spinner.

**Cons:** No reconnection to an in-progress match mid-game in v1.

---

## 9. Security, privacy & compliance (mixed)

### Is it safe for kids?

**Answer:** Designed with kid safety in mind: **no chat**, no public profiles, room codes shared only by choice, optional Google sign-in for parents, age collected as **ranges** not exact DOB, disclaimer in `docs/DISCLAIMER.md`. Adults should supervise online play and code sharing.

**Pros:** Small attack surface — no open social graph.

**Cons:** Not COPPA-certified; operators must review privacy policy and school policies for their jurisdiction.

---

### What data leaves the device?

**Answer:**

| Data | When |
|------|------|
| Game stats / records | Supabase sync when configured + signed in |
| Roadmap summary | Analytics fields on sync |
| Signaling messages | Ephemeral SDP/ICE via Realtime |
| Game moves | P2P only — not stored in DB |

**Pros:** Minimal persistent server data.

**Cons:** Google sign-in shares identity with Google/Supabase under their terms — privacy policy must explain this.

---

### Can users see each other’s data?

**Answer:** **No** — RLS restricts `memory_players` to `owner_id = auth.uid()`. Admin aggregates use a server function, not client-side queries across users.

**Pros:** Defense in depth for a family/education app.

**Cons:** No legitimate “teacher sees all students” mode without a separate product design.

---

### Where are secrets stored?

**Answer:** Frontend `.env` only has `VITE_*` **anon** keys and public URLs (Supabase, TURN). **Service role** and `ADMIN_STATS_SECRET` stay in Supabase Edge Function secrets / CI — never in the repo.

**Pros:** Follows standard Supabase security guidance.

**Cons:** Developers must discipline env files — `.env` is gitignored but human error is always possible.

---

## 10. Testing & quality (technical)

### What is your testing strategy?

**Answer:** **Vitest** unit tests colocated as `*.test.js`. Coverage includes:

- Deck building and shuffling (`game.test.js`)
- English pool rules (`english-game.test.js`)
- Math/fraction generators
- Room codes and seeded online decks
- ICE server fetch fallback
- Roadmap logic (`roadmap.test.js`)
- Admin auth helpers

Run: `npm run test:run` (~65 tests in suite; some need `localStorage` polyfill in CI).

**Pros:** Pure game logic is highly testable without a browser.

**Cons:** No Playwright/Cypress E2E; UI/regression relies on manual QA (screenshots in `docs/play-store/`).

---

### What would you add to CI?

**Answer:** GitHub Actions running `npm ci && npm run test:run` on every PR (listed in `LEARNING-TODO.md`). Optionally `vite build` to catch CSS/bundle errors.

**Pros:** Cheap safety net for a solo dev.

**Cons:** UI pixel regressions still won’t be caught without visual tests.

---

### How do you test WebRTC multiplayer?

**Answer:** Unit tests cover **protocol and deck sync**; production verification was **manual cross-network** play (documented in Phase 4). TURN worker has been load-tested in production per `PROJECT.md`.

**Pros:** Realistic — WebRTC is hard to fully mock.

**Cons:** Automated regression for NAT scenarios is weak.

---

## 11. Mobile, deployment & operations (technical)

### How does the Android app work?

**Answer:** **Capacitor** wraps the Vite `dist/` output in a WebView (`docs/CAPACITOR.md`). `npm run cap:sync` builds and copies assets. Play Store assets live under `docs/play-store/`.

**Pros:** One web codebase → Android; iOS possible later on Mac.

**Cons:** WebView performance and offline behavior differ from native; store review still required.

---

### How is the web app deployed?

**Answer:** Static `dist/` hosting (live at **playmemorygames.win**). Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURN_CREDENTIALS_URL`) injected at build time in CI.

**Pros:** Cheap, CDN-friendly hosting.

**Cons:** Build-time env means separate builds per environment unless scripted.

---

### What happens if Supabase is down?

**Answer:** Solo play and local records continue. Cloud sync fails silently or logs warnings. Online play cannot signal — host/join disabled or errors shown.

**Pros:** Core product degrades gracefully.

**Cons:** Online and sync are unavailable — no offline queue for sync retries documented.

---

## 12. Adventure roadmap & stickers (mixed)

### What is the adventure roadmap?

**Answer:** A **70-level** progression path (`roadmap.js`). Each level has a challenge template: win N games, speed-run, or pass quizzes. Completing a level awards a **sticker** for the current **weekly album** (rotates every **5 days**). Players drag stickers into album slots (`roadmap-ui.js`).

**Pros:** Long-term engagement beyond single matches; connects learning to collection goals.

**Cons:** Balancing 70 levels requires playtesting; album art pipeline is still growing.

---

### Why weekly albums?

**Answer:** Creates **fresh collection goals** without infinite content sprawl — similar to seasonal battle passes or sticker albums in mobile games. Released albums are gated by UTC epoch (`ALBUM_EPOCH_MS` in `roadmap-albums.js`).

**Pros:** Predictable content rhythm for a small team.

**Cons:** Players who join late have catch-up albums — complexity in `listSelectableAlbumWeeks`.

---

### How are stickers designed?

**Answer:** PNG assets in `docs/images/stickers/` with a documented style guide (thick borders, kid-game palette). `sticker-art.js` maps IDs to URLs. Some stickers still use emoji until art is produced.

**Pros:** Visual reward quality matches commercial kid games.

**Cons:** Art production is manual — 36+ IDs still need raster art per skill doc.

---

## 13. Challenges, mistakes & what you’d improve (mixed)

### What was the hardest technical problem?

**Answer:** **Reliable WebRTC on mobile networks** — combining Supabase signaling, ICE debouncing, TURN credentials, host-authoritative sync, and UX for disconnects. Second: **mobile roadmap layout** — viewport height changes (`dvh`/`svh`) and overlay UI without stretching artwork.

**Pros:** Demonstrates persistence on real-world P2P issues.

**Cons:** Still no automated NAT matrix tests.

---

### What technical debt exists?

**Answer:**

- Large `main.js` orchestrator
- Some test suites need `localStorage` mock for Node/Vitest
- English-game bilingual filter test currently failing in CI
- Framework-free UI modules multiply as features grow
- Incomplete sticker art inventory

**Pros:** Debt is localized and documented.

**Cons:** Refactoring `main.js` is risky without more E2E coverage.

---

### What would you do differently next time?

**Answer:**

| Area | Alternative | Trade-off |
|------|-------------|-----------|
| UI scale | Lit or Preact | Smaller components vs bundle size |
| Multiplayer | Dedicated game server | Easier reconnect/spectate vs hosting cost |
| Content | CMS for vocabulary | Non-dev edits vs complexity |
| Analytics | First-class event schema | Product insight vs privacy simplicity |

**Pros:** Shows you evaluate trade-offs, not just “rewrite in React.”

**Cons:** Listeners may ask you to defend current choices — tie back to solo-dev scope and cost.

---

### How do you know the product works?

**Answer:**

- Automated unit tests for logic
- Production demo at playmemorygames.win
- Play Store screenshot set prepared under `docs/play-store/`
- Cross-network multiplayer verified in Phase 4
- Ongoing dogfooding during roadmap/UI iteration

**Pros:** Evidence beyond “it works on my machine.”

**Cons:** No formal user study or A/B testing documented.

---

### Why should we hire you based on this project?

**Answer (non-technical framing):** You shipped a **complete kid-facing product** — not a tutorial app — with polish (themes, i18n, art direction), responsibility (disclaimer, RLS, privacy-minded age buckets), and delight (confetti, stickers, adventure map).

**Answer (technical framing):** You own **full stack**: Vite frontend, Supabase schema + RLS + Edge Functions, WebRTC + TURN, Capacitor Android, Vitest, and iterative mobile UX fixes — with clear docs (`PROJECT.md`, `TURN.md`, `CAPACITOR.md`).

**Pros:** Demonstrates breadth and finishing.

**Cons:** Be ready to discuss what you **didn’t** build (payments, CMS, full a11y audit) and why.

---

## Quick reference card (30-second pitch)

> **Memory Games** is a kid-friendly learning app: flip cards to practice English and math, solo or online with a friend. It’s vanilla JS + Vite, local-first, with optional Supabase sync and Google sign-in. Online play uses WebRTC peer-to-peer (host-authoritative) and Supabase only for signaling. An adventure roadmap with 70 levels and weekly sticker albums keeps kids coming back. Live at playmemorygames.win; Android via Capacitor.

---

## Files to cite in a live interview

| Topic | Path |
|-------|------|
| Product overview | `docs/PROJECT.md` |
| Auth | `src/auth.js` |
| RLS | `supabase/03_security_rls.sql` |
| Multiplayer | `src/multiplayer/`, `supabase/online-realtime.md` |
| TURN | `docs/TURN.md` |
| Roadmap | `src/roadmap.js`, `src/roadmap-ui.js` |
| Tests | `src/*.test.js` |
| Disclaimer | `docs/DISCLAIMER.md` |
| Android | `docs/CAPACITOR.md` |

---

*Generated from repository state, June 2026. Update this doc when major features ship.*
