# Online multiplayer (v1)

Peer-to-peer play uses **Supabase Realtime broadcast** only for WebRTC signaling (`memory-room:{roomId}`). Game state runs over a WebRTC data channel (host-authoritative).

## Dashboard

1. **Project → Realtime**: ensure Realtime is enabled.
2. No extra tables are required for v1 signaling (broadcast on ephemeral channels).
3. Build/deploy must include `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (GitHub Actions secrets for Pages).

## Testing

1. Open the deployed site in two browsers (or normal + incognito).
2. Both players need cloud sync configured (same Supabase project).
3. **Settings → Play online** → host creates a game; guest joins with link or code.
4. Host picks any supported mode (English 1/2, sums, math, fractions) and level; the same seeded deck is sent to the guest.

## TURN (mobile / strict networks)

See **[docs/TURN.md](../docs/TURN.md)** — Cloudflare Worker at `/api/turn-credentials` supplies short-lived ICE servers to the browser.

## Later

- Additional game modes and public lobby.
