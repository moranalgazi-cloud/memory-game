import { formatDuration, formatScorePercent } from "./records.js";

/** @typedef {import("./records.js").AllStats} AllStats */
/** @typedef {import("./records.js").GameMode} GameMode */

/** @type {readonly GameMode[]} */
const GAME_MODES = ["math", "sums", "english1", "english2", "fractions"];

const BRAND = "#6c4dff";
const BRAND_DARK = "#5538e0";
const TEXT = "#1a2850";
const MUTED = "#5a6a96";
const BORDER = "#d8e2f0";
const ROW_ALT = "#f5f8fd";

/**
 * @typedef {{
 *   title: string;
 *   intro: string;
 *   gamesHeading: string;
 *   testsHeading: string;
 *   playerLabel: string;
 *   mode: string;
 *   bestTime: string;
 *   won: string;
 *   played: string;
 *   bestScore: string;
 *   testsPassed: string;
 *   testsTaken: string;
 *   modes: Record<GameMode, string>;
 *   dir: "ltr" | "rtl";
 * }} RecordsEmailLabels
 */

/**
 * @param {AllStats} data
 * @param {RecordsEmailLabels} labels
 * @param {string} playerName
 * @returns {{ html: string; htmlFragment: string; plainText: string }}
 */
export function buildRecordsEmailContent(data, labels, playerName) {
  const gamesRows = GAME_MODES.map((mode) => {
    const stats = data[mode];
    return [
      labels.modes[mode],
      formatDuration(stats.bestTimeMs),
      String(stats.gamesWon),
      String(stats.gamesPlayed),
    ];
  });

  const testRows = GAME_MODES.map((mode) => {
    const stats = data.tests[mode];
    return [
      labels.modes[mode],
      formatScorePercent(stats.bestScorePercent),
      String(stats.testsPassed),
      String(stats.testsTaken),
    ];
  });

  const body = buildEmailFragment({
    labels,
    playerName,
    gamesRows,
    testRows,
    gamesColumns: [labels.mode, labels.bestTime, labels.won, labels.played],
    testsColumns: [labels.mode, labels.bestScore, labels.testsPassed, labels.testsTaken],
  });

  const html = [
    "<!DOCTYPE html>",
    `<html dir="${labels.dir}" lang="${labels.dir === "rtl" ? "he" : "en"}">`,
    `<head><meta charset="utf-8"></head>`,
    `<body bgcolor="#eef2f8" style="margin:0;padding:24px;background-color:#eef2f8;">`,
    body,
    "</body></html>",
  ].join("");

  const plainText = [
    labels.intro,
    `${labels.playerLabel}: ${playerName}`,
    "",
    labels.gamesHeading,
    ...gamesRows.map((row) => row.join(" · ")),
    "",
    labels.testsHeading,
    ...testRows.map((row) => row.join(" · ")),
  ].join("\n");

  return { html, htmlFragment: body, plainText };
}

/**
 * @param {{
 *   labels: RecordsEmailLabels;
 *   playerName: string;
 *   gamesRows: string[][];
 *   testRows: string[][];
 *   gamesColumns: string[];
 *   testsColumns: string[];
 * }} input
 * @returns {string}
 */
function buildEmailFragment({ labels, playerName, gamesRows, testRows, gamesColumns, testsColumns }) {
  const align = labels.dir === "rtl" ? "right" : "left";

  return [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2f8" style="background-color:#eef2f8;font-family:Segoe UI,Arial,sans-serif;">`,
    `<tr><td align="center" style="padding:8px;">`,
    `<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:640px;width:100%;background-color:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">`,

    `<tr><td bgcolor="${BRAND}" style="background-color:${BRAND};padding:22px 26px;color:#ffffff;text-align:${align};" dir="${labels.dir}">`,
    `<div style="font-size:22px;font-weight:700;line-height:1.3;color:#ffffff;">${escapeHtml(labels.title)}</div>`,
    `<div style="font-size:14px;line-height:1.4;color:#ffffff;margin-top:6px;opacity:0.95;">${escapeHtml(labels.playerLabel)}: <strong>${escapeHtml(playerName)}</strong></div>`,
    `</td></tr>`,

    `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:22px 26px 8px;color:${TEXT};font-size:15px;line-height:1.55;text-align:${align};" dir="${labels.dir}">`,
    escapeHtml(labels.intro),
    `</td></tr>`,

    `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:8px 26px 26px;" dir="${labels.dir}">`,
    renderSection(labels.gamesHeading, gamesColumns, gamesRows, align),
    renderSection(labels.testsHeading, testsColumns, testRows, align),
    `</td></tr>`,

    `</table></td></tr></table>`,
  ].join("");
}

/**
 * @param {string} heading
 * @param {string[]} columns
 * @param {string[][]} rows
 * @param {"left" | "right"} align
 * @returns {string}
 */
function renderSection(heading, columns, rows, align) {
  const widths = columns.length === 4 ? ["34%", "24%", "14%", "18%"] : ["34%", "20%", "18%", "18%"];

  const headerCells = columns
    .map((label, index) => {
      const edge = index === 0 ? `border-${align === "right" ? "right" : "left"}:1px solid ${BRAND_DARK};` : "";
      return [
        `<td bgcolor="${BRAND}" width="${widths[index]}"`,
        `style="background-color:${BRAND};padding:11px 12px;color:#ffffff;font-size:13px;font-weight:700;`,
        `text-align:${align};border:1px solid ${BRAND_DARK};${edge}">`,
        escapeHtml(label),
        `</td>`,
      ].join("");
    })
    .join("");

  const bodyRows = rows
    .map((cells, rowIndex) => {
      const bg = rowIndex % 2 === 0 ? "#ffffff" : ROW_ALT;
      const tds = cells
        .map((value, index) => {
          const weight = index === 0 ? "font-weight:600;" : "";
          const color = index === 0 ? `color:${TEXT};` : `color:${MUTED};`;
          return [
            `<td bgcolor="${bg}" width="${widths[index]}"`,
            `style="background-color:${bg};padding:11px 12px;font-size:14px;`,
            `text-align:${align};border:1px solid ${BORDER};${weight}${color}">`,
            escapeHtml(value),
            `</td>`,
          ].join("");
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  return [
    `<div style="margin:18px 0 10px;font-size:16px;font-weight:700;color:${TEXT};text-align:${align};">${escapeHtml(heading)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color:#ffffff;border-collapse:collapse;">`,
    `<tr>${headerCells}</tr>`,
    bodyRows,
    `</table>`,
  ].join("");
}

/**
 * Copies the HTML table, then opens Gmail compose with intro text filled in.
 *
 * @param {{ htmlFragment: string; plainText: string; subject: string; composeBody: string }} payload
 * @returns {Promise<"html" | "plain">}
 */
export async function shareRecordsForPaste(payload) {
  if (isMobileLike()) {
    return await shareRecordsForPasteMobile(payload);
  }

  openDesktopGmailCompose(payload.subject, payload.composeBody);
  const mode = await copyHtmlToClipboard(payload.htmlFragment, payload.plainText);
  if (!mode) throw new Error("clipboard_failed");
  return mode;
}

/**
 * Copy the table first (must finish before switching apps), then open Gmail compose.
 *
 * @param {{ htmlFragment: string; plainText: string; subject: string; composeBody: string }} payload
 * @returns {Promise<"html" | "plain">}
 */
async function shareRecordsForPasteMobile(payload) {
  const mode = await copyHtmlToClipboard(payload.htmlFragment, payload.plainText);
  const composeBody =
    mode === null
      ? `${payload.composeBody}\n\n${payload.plainText}`
      : payload.composeBody;

  openMobileGmailCompose(payload.subject, composeBody);
  return mode || "plain";
}

/** @returns {boolean} */
export function isMobileLike() {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.matchMedia("(max-width: 900px)").matches)
  );
}

/** @returns {boolean} */
function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** @returns {boolean} */
function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Synchronous rich HTML copy — works on iOS Safari when triggered from a tap.
 *
 * @param {string} html
 * @returns {boolean}
 */
function copyViaExecCommand(html) {
  if (typeof document === "undefined") return false;

  const container = document.createElement("div");
  container.setAttribute("contenteditable", "true");
  container.innerHTML = html;
  container.setAttribute("aria-hidden", "true");
  Object.assign(container.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
    overflow: "hidden",
  });
  document.body.append(container);
  container.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  selection?.removeAllRanges();
  container.remove();
  return ok;
}

/**
 * @param {string} fragment
 * @returns {string}
 */
function wrapHtmlForClipboard(fragment) {
  return `<!DOCTYPE html><html><body><!--StartFragment-->${fragment}<!--EndFragment--></body></html>`;
}

/**
 * @param {string} html
 * @param {string} plainFallback
 * @returns {Promise<"html" | "plain" | null>}
 */
async function copyHtmlToClipboard(html, plainFallback) {
  const wrappedHtml = wrapHtmlForClipboard(html);

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    const clipItems = [
      {
        "text/html": Promise.resolve(new Blob([wrappedHtml], { type: "text/html" })),
        "text/plain": Promise.resolve(new Blob([plainFallback], { type: "text/plain" })),
      },
      {
        "text/html": new Blob([wrappedHtml], { type: "text/html" }),
        "text/plain": new Blob([plainFallback], { type: "text/plain" }),
      },
    ];

    for (const data of clipItems) {
      try {
        await navigator.clipboard.write([new ClipboardItem(data)]);
        return "html";
      } catch {
        // Try the next clipboard strategy.
      }
    }
  }

  if (copyViaExecCommand(html)) return "html";

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(plainFallback);
      return "plain";
    } catch {
      // All strategies failed.
    }
  }

  return null;
}

/**
 * Copies the records table — works best when triggered by a direct button tap on mobile.
 *
 * @param {HTMLElement | null} previewEl
 * @param {string} htmlFragment
 * @param {string} plainText
 * @returns {Promise<"html" | "plain" | null>}
 */
export async function copyRecordsTable(previewEl, htmlFragment, plainText) {
  if (previewEl) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(previewEl);
    selection?.removeAllRanges();
    selection?.addRange(range);

    try {
      if (document.execCommand("copy")) {
        selection?.removeAllRanges();
        return "html";
      }
    } catch {
      // Fall through to clipboard API.
    }

    selection?.removeAllRanges();
  }

  return copyHtmlToClipboard(htmlFragment, plainText);
}

/**
 * Copy plain text — triggered from a button tap (works on mobile Safari).
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyPlainText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand.
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("aria-hidden", "true");
  Object.assign(textarea.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    opacity: "0",
  });
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  textarea.remove();
  return ok;
}

/**
 * Opens the Gmail app compose screen (not Gmail web).
 *
 * @param {string} subject
 * @param {string} body
 */
export function openMobileGmailCompose(subject, body) {
  const mailtoUrl = buildMailtoUrl(subject, body);

  if (isIOS()) {
    const params = new URLSearchParams({ subject, body });
    const gmailAppUrl = `googlegmail:///co?${params.toString()}`;
    navigateExternal(gmailAppUrl, mailtoUrl);
    return;
  }

  navigateExternal(mailtoUrl, buildDesktopGmailUrl(subject, body));
}

/**
 * @param {string} subject
 * @param {string} body
 * @returns {string}
 */
function buildMailtoUrl(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * @param {string} primaryUrl
 * @param {string} fallbackUrl
 */
function navigateExternal(primaryUrl, fallbackUrl) {
  window.location.href = primaryUrl;

  window.setTimeout(() => {
    if (document.visibilityState === "visible" && fallbackUrl && fallbackUrl !== primaryUrl) {
      window.location.href = fallbackUrl;
    }
  }, 700);
}

/**
 * @param {string} subject
 * @param {string} body
 */
function openDesktopGmailCompose(subject, body) {
  const gmailUrl = buildDesktopGmailUrl(subject, body);
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const opened = window.open(gmailUrl, "_blank");
  if (!opened) {
    window.location.href = mailtoUrl;
  }
}

/**
 * @param {string} subject
 * @param {string} body
 * @returns {string}
 */
function buildDesktopGmailUrl(subject, body) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
