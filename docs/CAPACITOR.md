# Capacitor: Android (Google Play)

This repo targets **Android first** via [Capacitor](https://capacitorjs.com/). The same web build (`dist/`) is copied into the native **`android/`** project. **iOS is not set up yet** — see [Adding iOS later](#adding-ios-later) when you have a Mac.

## What’s in the project

- `capacitor.config.json` — `appId` `com.memorygames.app`, display name **Memory games**, `webDir` `dist`, `androidScheme` `https`.
- Vite **`base: "./"`** — assets resolve inside the Android WebView.
- npm scripts: **`cap:sync`**, **`cap:android`**.

Change **`appId`** to your own reverse-DNS id before you publish on Play.

---

## One-time: Android tooling

1. Install [Android Studio](https://developer.android.com/studio).
2. **SDK Manager:** install a recent **Android SDK** + **Platform** (e.g. API 35) + **Build-Tools**.
3. Set **`ANDROID_HOME`** (or `ANDROID_SDK_ROOT`) to the SDK path, e.g. on Windows:  
   `C:\Users\<you>\AppData\Local\Android\Sdk`.

---

## First-time native project

The **`android/`** folder should already exist. If you ever clone without it:

```bash
npm install
npm run build
npx cap add android
```

---

## Day-to-day

1. Sync web build into Android:

   ```bash
   npm run cap:sync
   ```

2. Open Android Studio:

   ```bash
   npm run cap:android
   ```

3. Choose an emulator or USB device → **Run** ▶.

After **web** changes, run **`npm run cap:sync`** again before running from Android Studio.

---

## Google Play (`.aab`)

1. `npm run cap:sync`
2. Android Studio → **Build → Generate Signed App Bundle / APK** (use [Play App Signing](https://developer.android.com/studio/publish/app-signing)).
3. Upload the **AAB** in [Google Play Console](https://play.google.com/console).

Guide: [Capacitor — Deploying to Google Play](https://capacitorjs.com/docs/android/deploying-to-google-play).

---

## Advertising (AdMob, Android)

Ads are **Android-only** and **off by default**. The website never loads AdMob.

1. Create an app in [AdMob](https://admob.google.com/) and an **Interstitial** ad unit.
2. Copy your **App ID** into `android/app/src/main/res/values/strings.xml` → `admob_app_id`.
3. For production builds, set in `.env.production` (or your CI secrets):

   ```env
   VITE_ADS_ENABLED=true
   VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-xxxxxxxx/yyyyyyyyyy
   VITE_ADMOB_REWARDED_ID=ca-app-pub-xxxxxxxx/zzzzzzzzzz
   VITE_ADS_GAMES_BETWEEN=2
   ```

4. `npm run cap:sync` → rebuild the signed AAB.

**Behavior:**

- **Interstitial:** full-screen ad after every **2 solo wins** (configurable).
- **Rewarded video:** optional **Watch video** button in **Album → current week** — grants a bonus sticker when the user finishes the video.

See **`docs/ADMOB-SETUP.md`** for the full step-by-step AdMob + Play Console checklist.

**Kids / Families:** the app requests **child-directed**, **under-age-of-consent**, and **non-personalized** ads (`src/ads.js`). You must also:

- Mark the app **Designed for Families** / child-directed in **Play Console** and **AdMob**.
- Complete the **Data safety** form (AdMob SDK data collection).
- Update `public/privacy.html` before shipping ads to production.

**Test ads:** until you set real IDs, Google’s sample app/unit IDs in `strings.xml` and `src/ads.js` show test creatives only.

---

## Store checklist (manual)

- **Privacy policy** URL and **Data safety** form (local storage, optional Supabase, device id, etc.).
- **Icons & screenshots**, **content rating**.
- Kids / **Families** policies if that applies.

---

## Troubleshooting

| Issue | What to try |
|--------|----------------|
| White screen | `npm run cap:sync`; open `dist/index.html` in a browser; use Chrome **Remote debugging** for the WebView. |
| 404 on JS/CSS | Vite **`base: "./"`** must stay (already set). |

---

## Adding iOS later

On a **Mac** with Xcode (and CocoaPods if the CLI asks):

```bash
npm install @capacitor/ios --save
npx cap add ios
npm run cap:sync
npx cap open ios
```

Then configure signing in Xcode and follow [Capacitor iOS deploy](https://capacitorjs.com/docs/ios/deploying-to-app-store).
