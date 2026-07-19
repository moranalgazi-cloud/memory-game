import { Capacitor } from "@capacitor/core";

/** Google sample units — replace with your AdMob ids in production. */
const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";
const TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";

const ADS_ENABLED = import.meta.env.VITE_ADS_ENABLED === "true";
const INTERSTITIAL_ID =
  (import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || "").trim() || TEST_INTERSTITIAL_ID;
const REWARDED_ID =
  (import.meta.env.VITE_ADMOB_REWARDED_ID || "").trim() || TEST_REWARDED_ID;
const GAMES_BETWEEN_ADS = Math.max(
  1,
  Number.parseInt(import.meta.env.VITE_ADS_GAMES_BETWEEN || "2", 10) || 2,
);

/** Use Google test creatives (recommended until AdMob account is approved). */
const USE_TEST_ADS =
  import.meta.env.VITE_ADS_USE_TEST_UNITS === "true" || import.meta.env.DEV;

const ACTIVE_INTERSTITIAL_ID = USE_TEST_ADS ? TEST_INTERSTITIAL_ID : INTERSTITIAL_ID;
const ACTIVE_REWARDED_ID = USE_TEST_ADS ? TEST_REWARDED_ID : REWARDED_ID;

const REWARD_AD_OPTIONS = {
  npa: true,
  isTesting: USE_TEST_ADS,
};

/** True on Android native builds when ads are enabled via env. */
export function isAdsSupported() {
  return ADS_ENABLED && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

let initStarted = false;
let interstitialPrepared = false;
let interstitialShowing = false;
let rewardVideoPrepared = false;
let rewardVideoShowing = false;
let winsSinceLastAd = 0;

/** Initialize AdMob (child-directed, non-personalized). No-op on web or when disabled. */
export async function initAds() {
  if (!isAdsSupported() || initStarted) return;
  initStarted = true;

  try {
    const {
      AdMob,
      MaxAdContentRating,
      AdmobConsentStatus,
      InterstitialAdPluginEvents,
      RewardAdPluginEvents,
    } = await import("@capacitor-community/admob");

    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      interstitialPrepared = true;
    });
    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
      interstitialPrepared = false;
    });
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      interstitialPrepared = false;
      interstitialShowing = false;
      void prepareInterstitialAd();
    });
    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
      interstitialPrepared = false;
      interstitialShowing = false;
      void prepareInterstitialAd();
    });

    AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
      rewardVideoPrepared = true;
    });
    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
      rewardVideoPrepared = false;
    });
    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      rewardVideoPrepared = false;
      rewardVideoShowing = false;
      void prepareRewardVideoAd();
    });
    AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      rewardVideoPrepared = false;
      rewardVideoShowing = false;
      void prepareRewardVideoAd();
    });

    await AdMob.initialize({
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: MaxAdContentRating.General,
      initializeForTesting: USE_TEST_ADS,
    });

    try {
      let consentInfo = await AdMob.requestConsentInfo();
      if (
        consentInfo.status === AdmobConsentStatus.REQUIRED &&
        consentInfo.isConsentFormAvailable
      ) {
        consentInfo = await AdMob.showConsentForm();
      }
      if (!consentInfo.canRequestAds) {
        console.info("[ads] consent: ads not allowed");
        return;
      }
    } catch (e) {
      console.warn("[ads] consent flow:", e);
    }

    void prepareInterstitialAd();
    void prepareRewardVideoAd();
  } catch (e) {
    console.warn("[ads] init failed:", e);
  }
}

async function prepareInterstitialAd() {
  if (!isAdsSupported() || interstitialPrepared || interstitialShowing) return;

  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareInterstitial({
      adId: ACTIVE_INTERSTITIAL_ID,
      ...REWARD_AD_OPTIONS,
    });
  } catch (e) {
    interstitialPrepared = false;
    console.warn("[ads] prepare interstitial:", e);
  }
}

async function prepareRewardVideoAd() {
  if (!isAdsSupported() || rewardVideoPrepared || rewardVideoShowing) return;

  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareRewardVideoAd({
      adId: ACTIVE_REWARDED_ID,
      ...REWARD_AD_OPTIONS,
    });
  } catch (e) {
    rewardVideoPrepared = false;
    console.warn("[ads] prepare rewarded:", e);
  }
}

/** Whether a rewarded video is loaded and can be shown. */
export function isRewardedVideoReady() {
  return isAdsSupported() && rewardVideoPrepared && !rewardVideoShowing;
}

/**
 * Show an opt-in rewarded video. Resolves when the ad closes.
 * @returns {Promise<{ rewarded: boolean }>}
 */
export async function showRewardedVideo() {
  if (!isRewardedVideoReady()) {
    void prepareRewardVideoAd();
    return { rewarded: false };
  }

  const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");

  return new Promise((resolve) => {
    let rewarded = false;
    let settled = false;

    /** @type {import('@capacitor/core').PluginListenerHandle | null} */
    let rewardedListener = null;
    /** @type {import('@capacitor/core').PluginListenerHandle | null} */
    let dismissedListener = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      rewardVideoShowing = false;
      rewardVideoPrepared = false;
      void rewardedListener?.remove();
      void dismissedListener?.remove();
      void prepareRewardVideoAd();
      resolve({ rewarded });
    };

    void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      rewarded = true;
    }).then((handle) => {
      rewardedListener = handle;
    });

    void AdMob.addListener(RewardAdPluginEvents.Dismissed, finish).then((handle) => {
      dismissedListener = handle;
    });

    rewardVideoShowing = true;
    void AdMob.showRewardVideoAd().catch((e) => {
      console.warn("[ads] show rewarded:", e);
      finish();
    });
  });
}

/**
 * Show a full-screen ad after some solo wins (natural break, never mid-game).
 * Frequency capped by VITE_ADS_GAMES_BETWEEN (default: every 2 wins).
 */
export async function maybeShowInterstitialAfterSoloWin() {
  if (!isAdsSupported()) return;

  winsSinceLastAd += 1;
  if (winsSinceLastAd < GAMES_BETWEEN_ADS) {
    void prepareInterstitialAd();
    return;
  }

  if (!interstitialPrepared || interstitialShowing) {
    console.info("[ads] interstitial not ready yet — will retry on next win");
    void prepareInterstitialAd();
    return;
  }

  try {
    const { AdMob } = await import("@capacitor-community/admob");
    interstitialShowing = true;
    winsSinceLastAd = 0;
    await AdMob.showInterstitial();
  } catch (e) {
    interstitialShowing = false;
    interstitialPrepared = false;
    console.warn("[ads] show interstitial:", e);
    void prepareInterstitialAd();
  }
}
