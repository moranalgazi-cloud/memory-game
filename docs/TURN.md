# Phase 4 — Cloudflare TURN for online play

Online multiplayer uses **WebRTC** for game state. When two players are on different networks (e.g. phone on mobile data + PC on Wi‑Fi), a **TURN relay** is often required.

This project uses **Cloudflare Realtime TURN** via a small **Cloudflare Worker** that keeps your API token secret.

## One-time Cloudflare setup

You already created a TURN app (`memory-games-turn`). Finish these steps:

### 1. Copy credentials

In **Cloudflare Dashboard → Realtime → TURN Server → memory-games-turn**:

- **Turn Token ID** (e.g. `3d6ec623f3363f5da4b3b3ea18bb6309`)
- **API Token** (secret — shown once when created)

### 2. Deploy the Worker

```bash
cd workers/turn-credentials
npm install
npx wrangler secret put TURN_KEY_API_TOKEN
# paste your API Token when prompted

# Set Turn Token ID (or edit wrangler.toml [vars] TURN_KEY_ID)
npx wrangler secret put TURN_KEY_ID
# paste Turn Token ID

npm run deploy
```

### 3. Attach a route

In **Cloudflare Dashboard → Workers & Pages → memory-games-turn → Settings → Triggers → Routes**:

| Field | Value |
|-------|--------|
| Route | `www.playmemorygames.win/api/turn-credentials` |
| Zone | `playmemorygames.win` |

Or uncomment the `[[routes]]` block in `workers/turn-credentials/wrangler.toml` and redeploy.

### 4. Test the endpoint

Open in a browser:

```
https://www.playmemorygames.win/api/turn-credentials
```

You should see JSON like `{ "iceServers": [ ... ] }`.

### 5. Redeploy the game (if needed)

GitHub Actions already sets:

```
VITE_TURN_CREDENTIALS_URL=https://www.playmemorygames.win/api/turn-credentials
```

Push to `main` or re-run the **Deploy to GitHub Pages** workflow.

For local dev, add to `.env`:

```
VITE_TURN_CREDENTIALS_URL=http://localhost:8787
```

Then run `npm run dev` and, in another terminal, `cd workers/turn-credentials && npm run dev`.

## Abuse controls

The worker rate-limits credential minting (~60/hour per IP) and rejects requests whose `Origin` is present but not in `ALLOWED_ORIGINS`. CORS alone is not auth — keep an eye on Cloudflare Realtime usage. Stronger option later: require a short-lived Supabase JWT.

## Cost

Cloudflare TURN: **~1,000 GB/month free**, then $0.05/GB. This game sends tiny data-channel messages — family use stays at **$0**.

## Testing

1. **Easy:** two browsers on the same Wi‑Fi → Play online.
2. **Hard (needs TURN):** phone on **mobile data**, PC on Wi‑Fi → host/join → play a full game.
3. **Stress:** run 2–3 rooms at once; confirm no lag or disconnects.

## Fallback

If the Worker is down or not configured, the app falls back to **STUN only** (same-network play may still work).
