import mathIcon from "../docs/images/icons/icon-mode-multiplication.png?url";
import sumsIcon from "../docs/images/icons/icon-mode-sums.png?url";
import english1Icon from "../docs/images/icons/icon-mode-english1.png?url";
import english2Icon from "../docs/images/icons/icon-mode-english2.png?url";
import fractionsIcon from "../docs/images/icons/icon-mode-fractions.png?url";

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

/** @type {Record<import("./records.js").GameMode, string>} */
export const MODE_ICON_URLS = {
  math: mathIcon,
  sums: sumsIcon,
  english1: english1Icon,
  english2: english2Icon,
  fractions: fractionsIcon,
};

/** @param {import("./records.js").GameMode | string} mode */
export function getModeIconUrl(mode) {
  return MODE_ICON_URLS[/** @type {import("./records.js").GameMode} */ (mode)] ?? null;
}

/** Wire bundled mode icons onto every `img[data-mode-icon]`. */
export function applyModeIcons() {
  for (const el of document.querySelectorAll("img[data-mode-icon]")) {
    const mode = el.getAttribute("data-mode-icon");
    const url = mode ? getModeIconUrl(mode) : null;
    if (url) el.src = url;
  }
}
