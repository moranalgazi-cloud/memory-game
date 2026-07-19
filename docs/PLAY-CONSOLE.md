# Google Play Console — step-by-step (Memory games)

Use this checklist to publish **Memory games** (`com.memorygames.app`) to Google Play.

**Privacy policy URL (required everywhere):**
```
https://www.playmemorygames.win/privacy.html
```

**Store assets in this repo:** `docs/play-store/` (icon, feature graphic, screenshots).

---

## Phase 0 — Before you open Play Console

| Item | Status |
|------|--------|
| AdMob app + ad units | Done |
| GDPR + US privacy messages in AdMob | Done |
| Ads tested on Android emulator | Done |
| Privacy policy updated (July 2026) | Done |
| AdMob account approved | Wait for Google email |
| Signed AAB built | Do in Phase 3 |

---

## Phase 1 — Create your developer account

1. Go to [play.google.com/console](https://play.google.com/console)
2. Sign in with your Google account
3. Pay the **one-time $25** registration fee (if new account)
4. Complete **identity verification** if Google asks (can take a few days)

---

## Phase 2 — Create the app

1. **All apps** → **Create app**
2. **App name:** `Memory games`
3. **Default language:** English (United States) — add Hebrew later if you want
4. **App or game:** Game
5. **Free or paid:** Free
6. Declarations:
   - Follow Google Play Developer Program Policies — **Yes**
   - US export laws — **Yes** (standard for apps)
7. Click **Create app**

---

## Phase 3 — Build a signed release (AAB)

In your project:

```bash
cd c:\dev\test-project
npm run cap:sync
npm run cap:android
```

In **Android Studio**:

1. **Build → Generate Signed App Bundle / APK**
2. Choose **Android App Bundle**
3. **Create new keystore** (first time only):
   - Save the `.jks` file somewhere safe (backup!)
   - Remember the passwords — **you cannot recover them**
4. Select **release** build variant
5. Finish → note the output path (e.g. `android/app/release/app-release.aab`)

**Never commit the keystore or passwords to git.**

---

## Phase 4 — Store listing

Play Console → your app → **Grow** → **Store presence** → **Main store listing**

| Field | Suggestion |
|-------|------------|
| **App name** | Memory games |
| **Short description** | ≤ 80 chars — e.g. "Flip cards to learn English & math. Solo, adventure map, stickers!" |
| **Full description** | Educational memory game for kids; modes, adventure, albums, optional online play |
| **App icon** | `docs/play-store/app-icon-512.png` (512×512) |
| **Feature graphic** | `docs/play-store/feature-graphic-1024x500.png` (1024×500) |
| **Phone screenshots** | At least 2 from `docs/play-store/screenshots/` (resize to 16:9 or 9:16 if needed) |

**Privacy policy URL:**
```
https://www.playmemorygames.win/privacy.html
```

---

## Phase 5 — Required policy forms

Play Console → **Policy and programs** → **App content**

Complete each section (Start → fill → Save):

### 1. Privacy policy
- URL: `https://www.playmemorygames.win/privacy.html`

### 2. Ads
- **Does your app contain ads?** → **Yes**
- Ad network: **Google AdMob**

### 3. App access
- If everything works without login → **All functionality is available without restrictions**
- Or explain if Supabase / Google sign-in is optional

### 4. Content rating
- Start questionnaire (IARC)
- Violence: none / cartoon
- User interaction: users can interact (online play with room codes)
- Share location: No
- Complete → apply rating

### 5. Target audience and content
- **Target age groups:** select children ranges that match your app (e.g. 5 and under, 6–8, 9–12)
- **Appeal to children:** Yes
- comply with **Families policy**

### 6. Data safety
Declare honestly (typical for this app):

| Data type | Collected? | Shared? | Purpose |
|-----------|------------|---------|---------|
| App activity (game progress) | Yes, optional cloud | No | App functionality |
| Device or other IDs | Yes (local device id, AdMob) | AdMob may process | App functionality, Advertising |
| Email (optional) | If Google sign-in | No | Account |
| Name (nickname) | Yes, local | No | App functionality |

- Data encrypted in transit: Yes (HTTPS)
- Users can request deletion: Yes (contact email in policy)
- **Advertising data:** Yes — via AdMob in Android app only

Use [Google’s AdMob data safety guidance](https://support.google.com/admob/answer/9944913).

### 7. Government apps / Financial / Health
- Usually **No** for this game

---

## Phase 6 — Upload to Internal testing

1. **Test and release** → **Testing** → **Internal testing**
2. **Create new release**
3. **Upload** your `.aab` file
4. **Release name:** e.g. `1.0.0 (1)`
5. **Release notes:** "First internal test — ads, adventure, albums"
6. **Review release** → **Start rollout to Internal testing**

Add testers:
- **Testers** tab → create email list → add your Gmail
- Open the **opt-in link** on your phone → install from Play Store

---

## Phase 7 — Link AdMob to Play Store

After the app exists in Play Console:

1. [AdMob](https://admob.google.com/) → **Apps** → **Memory games**
2. **App settings** → **Add store** / link **Google Play**
3. Select your Play Console app

This helps approval and ad serving.

---

## Phase 8 — Switch to real ads (after AdMob approval)

When AdMob approval email arrives:

1. Edit `.env.production`:
   ```env
   VITE_ADS_USE_TEST_UNITS=false
   ```
2. Rebuild:
   ```bash
   npm run cap:sync
   ```
3. Generate a **new signed AAB** and upload as next internal release
4. Verify real ads on a test device

---

## Phase 9 — Production release

When internal testing looks good:

1. Complete all **App content** items (green checkmarks)
2. **Test and release** → **Production** → **Create new release**
3. Upload the same (or newer) AAB
4. **Start rollout to Production**

First review can take **several days** (longer for new developer accounts and kids apps).

---

## Quick reference

| Setting | Value |
|---------|--------|
| Package name | `com.memorygames.app` |
| App name | Memory games |
| Privacy URL | https://www.playmemorygames.win/privacy.html |
| Contains ads | Yes (AdMob) |
| In-app purchases | No |
| Website ads | No |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Rejected — Families policy | Ensure target audience + Data safety match kids app |
| Rejected — privacy policy | Deploy updated `public/privacy.html` to your website first |
| Ads not in production build | `VITE_ADS_ENABLED=true`, run `cap:sync`, rebuild AAB |
| Lost keystore | Cannot update app — keep backup |

---

## Deploy privacy policy to website

After editing `public/privacy.html`, deploy your site so Play Console and AdMob see the live URL:

```bash
npm run build
# then deploy dist/ + public/privacy.html via your usual hosting (GitHub Pages, etc.)
```

Verify: open https://www.playmemorygames.win/privacy.html and confirm **Last updated: July 2026** and the Android ads section.
