# Send records email worker

Sends formatted HTML records tables to any Gmail (or other) inbox via [Resend](https://resend.com).

## Setup

1. Create a Resend account and verify your sending domain (or use `onboarding@resend.dev` for testing — only delivers to your Resend account email).
2. Deploy the worker:

```bash
cd workers/send-records-email
npm install
npx wrangler secret put RESEND_API_KEY
# Edit wrangler.toml: set FROM_EMAIL to your verified sender, e.g. Memory Games <records@playmemorygames.win>
npm run deploy
```

3. The app calls `https://www.playmemorygames.win/api/send-records-email` automatically on production.

For local dev, run `npm run dev` in this folder and add to `.env`:

```
VITE_RECORDS_EMAIL_URL=http://127.0.0.1:8787
```
