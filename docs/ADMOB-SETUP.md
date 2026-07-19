# AdMob setup (Android)

Step-by-step guide to enable **interstitial** and **rewarded video** ads in the Memory games Android app.

Ads are **Android-only** and **off by default** on web and local dev.

---

## Step 1 — Create a Google AdMob account

1. Go to [admob.google.com](https://admob.google.com/) and sign in with your Google account.
2. Accept the AdMob terms if prompted.

---

## Step 2 — Register your Android app

1. In AdMob: **Apps → Add app**.
2. Choose **Android**.
3. Select **No** if the app is not yet on Play Store (you can link it later).
4. App name: **Memory games** (or your store name).
5. Copy the **App ID** — it looks like `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`.

---

## Step 3 — Create ad units

Create **two** ad units for this app:

| Type | AdMob name suggestion | Used for |
|------|----------------------|----------|
| **Interstitial** | `Solo win break` | Full-screen ad after every 2 solo wins |
| **Rewarded** | `Bonus sticker` | Optional video in Album → current week |

For each unit, copy the **Ad unit ID** (`ca-app-pub-XXXXXXXX/ZZZZZZZZZZ`).

**Kids app settings in AdMob:**

- When creating units, use **family-friendly** / child-directed options where offered.
- In app settings, mark content as directed at children if applicable.

---

## Step 4 — Put the App ID in Android

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<string name="admob_app_id">ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
```

Replace with your real App ID from Step 2.

---

## Step 5 — Enable ads in your production build

Create `.env.production` in the project root (do not commit real IDs to public repos if you prefer secrets in CI):

```env
VITE_ADS_ENABLED=true
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXXXXXX/1111111111
VITE_ADMOB_REWARDED_ID=ca-app-pub-XXXXXXXX/2222222222
VITE_ADS_GAMES_BETWEEN=2
```

---

## Step 6 — Build and sync

```bash
npm run cap:sync
npm run cap:android
```

In Android Studio: Run on a **real device** or emulator with Google Play services.

**Test without real units:** leave `VITE_ADMOB_*` empty — Google sample test IDs are used automatically.

---

## Step 7 — Test on device

### Interstitial

1. Set `VITE_ADS_ENABLED=true` in `.env.production` (or temporarily in `.env.local` for a test build).
2. Play and win **2 solo games** — a test interstitial should appear.

### Rewarded video

1. Open **Album** → open the **current week's** album.
2. Tap **Watch video** at the bottom of the sticker tray.
3. Finish the test video — a bonus sticker is added to the tray.

---

## Step 8 — Google Play Console (before publishing)

1. **Policy → App content → Ads** — declare that the app contains ads.
2. **Target audience** — set age groups honestly (designed for children + families).
3. **Data safety** — disclose AdMob SDK data collection ([Google's guidance](https://support.google.com/googleplay/android-developer/answer/10787469)).
4. Update **privacy policy** URL — set `public/privacy.html` “Today” section to say ads are active on Android.

---

## Step 9 — GDPR / consent (UMP)

The app calls Google's **User Messaging Platform** on startup (`src/ads.js`).

1. In AdMob: **Privacy & messaging → GDPR**.
2. Create a **GDPR message** for your app.
3. Test in EEA debug mode if needed (see `@capacitor-community/admob` README).

---

## Step 10 — Upload to Play

1. `npm run cap:sync`
2. Android Studio → **Build → Generate Signed App Bundle**
3. Upload **AAB** to Play Console (internal testing first).

---

## Where ads appear in the app

| Ad type | When | User action |
|---------|------|-------------|
| Interstitial | After every N solo wins | Automatic at natural break |
| Rewarded | Album → current week | User taps “Watch video” |

Ads never show during gameplay or online multiplayer.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No ads at all | Check `VITE_ADS_ENABLED=true`, rebuild with `npm run cap:sync`, use Android (not browser) |
| “Consent: ads not allowed” | Complete UMP form in AdMob; on test device try accepting consent |
| Reward button disabled | Wait a few seconds for ad to load; check logcat for `[ads]` messages |
| Test ads work, real ads don't | New AdMob accounts can take hours; verify unit IDs and app ID match |
