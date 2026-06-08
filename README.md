# Memory games

A Vite-powered web app with several memory-style learning games for kids: **English** (two modes), **multiplication**, **plus & minus**, and **fractions**. Play solo on one device, track records per player, and optionally sync stats to [Supabase](https://supabase.com). **Play online** with a friend (WebRTC + Supabase signaling) when cloud is configured.

**Live demo:** [moranalgazi-cloud.github.io/memory-game](https://moranalgazi-cloud.github.io/memory-game/)

**Overview (1-pager):** [docs/PROJECT.md](docs/PROJECT.md) · **Disclaimer:** [docs/DISCLAIMER.md](docs/DISCLAIMER.md)

## Game modes

| Mode | Description |
|------|-------------|
| English 1 | Match picture icons to English words |
| English 2 | Match Hebrew words to English words |
| Plus & minus | Match expressions to answers |
| Multiplication | Match products to equations |
| Fractions | Match pie diagrams to fraction labels |

All modes work **solo** and in **online** 1v1 (host picks game and level; guest joins with a room code or invite link).

## Prerequisites

- [Node.js](https://nodejs.org/) **18** or newer (LTS recommended)
- [npm](https://docs.npmjs.com/cli/v10/commands/npm) (comes with Node)

## Install

```bash
git clone https://github.com/moranalgazi-cloud/memory-game.git
cd memory-game
npm install
```

If you cloned from a different path or folder name, `cd` into that directory instead of `memory-game`.

## Configuration (optional)

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. **Local-only:** leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` empty in `.env`. Solo play and local records still work; **Play online** and cloud sync are disabled.

3. **With Supabase:** create a project at [supabase.com](https://supabase.com), then in the Supabase SQL editor run these scripts **in order**:
   - `supabase/memory_players.sql` — table + initial policies
   - `supabase/02_auth_owner.sql` — `owner_id` column (Phase 2 auth)
   - `supabase/03_security_rls.sql` — owner-scoped RLS (Phase 3 security; **required** for cloud sync after Phase 3)
   - `supabase/memory_players_delete_policy.sql` — only if you created the table before DELETE policy existed

   Fill in the URL and anon (or publishable) key from **Project Settings → API** — never put the **service_role** secret in the frontend. Enable **Anonymous sign-ins** and optionally **Google** under Authentication → Providers. Details are in `.env.example`.

4. **Online multiplayer:** enable Realtime on the project and follow [supabase/online-realtime.md](supabase/online-realtime.md). Deployments (e.g. GitHub Pages) need the same `VITE_*` secrets in CI.

## Run (development)

```bash
npm run dev
```

Vite prints a local URL (often `http://localhost:5173/`). Open it in your browser.

## Build (production bundle)

```bash
npm run build
```

Output is written to `dist/`. Preview that build locally:

```bash
npm run preview
```

## Mobile app (Capacitor — Android first)

See **[docs/CAPACITOR.md](docs/CAPACITOR.md)** for Android Studio setup, **`npm run cap:sync`**, and Play Store **AAB** steps. iOS can be added later on a Mac (same doc).

## Test

Watch mode (re-runs on file changes):

```bash
npm test
```

Single run (e.g. for CI or a quick check):

```bash
npm run test:run
```

## Other scripts

| Script            | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `npm run build:lexicon` | Validates curated English vocabulary (`scripts/build-english-lexicon.mjs`) |
| `npm run fix:utf8`      | Normalizes text file encodings (also runs around install/dev/build) |
| `npm run cap:sync`      | Build web app and sync to Capacitor Android project |

## Project layout (short)

- `src/` — application code, styles, and tests next to modules (`*.test.js`)
- `src/multiplayer/` — online signaling, WebRTC, host game logic, seeded decks
- `supabase/` — SQL for the dashboard; notes for Realtime / online play
- `docs/` — [PROJECT.md](docs/PROJECT.md) overview, [DISCLAIMER.md](docs/DISCLAIMER.md), Capacitor guide, SVG illustrations
- `scripts/` — Node helpers used by npm scripts

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PROJECT.md](docs/PROJECT.md) | One-page product & technical overview (with diagrams) |
| [docs/DISCLAIMER.md](docs/DISCLAIMER.md) | No warranty / limitation of liability (not legal advice) |
| [docs/CAPACITOR.md](docs/CAPACITOR.md) | Android packaging |
| [supabase/online-realtime.md](supabase/online-realtime.md) | Online multiplayer setup |

## Learning checklist

See `LEARNING-TODO.md` for a broader roadmap (Git habits, CI, Supabase depth, app quality). Feature ideas live in `FUNCTIONALITY-TODO.md`.
