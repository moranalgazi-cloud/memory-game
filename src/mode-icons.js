import mathIcon from "../docs/images/icons/icon-mode-multiplication.png?url";
import sumsIcon from "../docs/images/icons/icon-mode-sums.png?url";
import english1Icon from "../docs/images/icons/icon-mode-english1.png?url";
import english2HeIcon from "../docs/images/icons/icon-mode-english2-he.png?url";
import english2FrIcon from "../docs/images/icons/icon-mode-english2-fr.png?url";
import english2DeIcon from "../docs/images/icons/icon-mode-english2-de.png?url";
import english2EsIcon from "../docs/images/icons/icon-mode-english2-es.png?url";
import fractionsIcon from "../docs/images/icons/icon-mode-fractions.png?url";
import { english1LabelKey, getEnglish2SourceLang } from "./english2-source.js";

/** @type {import("./records.js").GameMode[]} */
export const GAME_MODE_ORDER = ["english1", "english2", "sums", "math", "fractions"];

/** @type {Record<import("./records.js").GameMode, string>} */
export const MODE_LABEL_KEYS = {
  english1: "modeEnglish1",
  english2: "modeEnglish2",
  sums: "modeSums",
  math: "modeMath",
  fractions: "modeFractions",
};

/**
 * @param {import("./records.js").GameMode} mode
 * @param {import("./i18n.js").Locale} locale
 */
export function getModeLabelKey(mode, locale) {
  if (mode === "english1") return english1LabelKey(locale, "mode");
  return MODE_LABEL_KEYS[mode];
}

/** @type {Record<import("./records.js").GameMode, string>} */
const MODE_ICON_URLS = {
  math: mathIcon,
  sums: sumsIcon,
  english1: english1Icon,
  english2: english2HeIcon,
  fractions: fractionsIcon,
};

/** @type {Record<import("./english2-source.js").English2SourceLang, string>} */
const ENGLISH2_SOURCE_ICON_URLS = {
  he: english2HeIcon,
  fr: english2FrIcon,
  de: english2DeIcon,
  es: english2EsIcon,
};

/**
 * @param {import("./records.js").GameMode | string} mode
 * @param {{ english2SourceLang?: import("./english2-source.js").English2SourceLang }} [opts]
 */
export function getModeIconUrl(mode, opts = {}) {
  const m = /** @type {import("./records.js").GameMode} */ (mode);
  if (m === "english2") {
    const src = opts.english2SourceLang ?? getEnglish2SourceLang();
    return ENGLISH2_SOURCE_ICON_URLS[src] ?? MODE_ICON_URLS.english2;
  }
  return MODE_ICON_URLS[m] ?? null;
}

/** Wire bundled mode icons onto every `img[data-mode-icon]`. */
export function applyModeIcons() {
  const english2SourceLang = getEnglish2SourceLang();
  for (const el of document.querySelectorAll("img[data-mode-icon]")) {
    const mode = el.getAttribute("data-mode-icon");
    if (mode === "english2") {
      el.setAttribute("data-english2-source", english2SourceLang);
    }
    const url = mode ? getModeIconUrl(mode, { english2SourceLang }) : null;
    if (url && el.getAttribute("src") !== url) el.src = url;
  }
}
