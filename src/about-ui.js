import gameBoardImg from "../docs/images/game-board.svg?url";
import gameModesImg from "../docs/images/game-modes.svg?url";
import onlinePlayImg from "../docs/images/online-play.svg?url";
import {
  getEnglish2SourceLang,
  english2SourceLangName,
  isEnglish2ModeAvailable,
  english1LabelKey,
} from "./english2-source.js";
import { getLocale } from "./i18n.js";
import { getModeIconUrl } from "./mode-icons.js";

/**
 * @typedef {Object} AboutUiDeps
 * @property {(key: string, vars?: Record<string, string>) => string} t
 */

/** @type {AboutUiDeps | null} */
let deps = null;

const aboutDialog = document.querySelector("#aboutDialog");
const aboutBody = document.querySelector("#aboutBody");
const aboutCloseBtn = document.querySelector("#aboutCloseBtn");
const openAboutSettingsBtn = document.querySelector("#openAbout");

/**
 * @param {AboutUiDeps} d
 */
export function initAboutUi(d) {
  deps = d;
  aboutCloseBtn?.addEventListener("click", () => aboutDialog?.close());
  openAboutSettingsBtn?.addEventListener("click", () => {
    closeSettingsMenu();
    openAboutDialog();
  });
}

function closeSettingsMenu() {
  const menu = document.querySelector("#settingsMenu");
  const btn = document.querySelector("#settingsMenuBtn");
  if (menu instanceof HTMLElement) menu.hidden = true;
  if (btn instanceof HTMLButtonElement) btn.setAttribute("aria-expanded", "false");
}

/**
 * @param {string} src
 * @param {string} alt
 */
function appendAboutImage(container, src, alt) {
  const wrap = document.createElement("figure");
  wrap.className = "about-dialog__figure";
  const img = document.createElement("img");
  img.className = "about-dialog__img";
  img.src = src;
  img.alt = alt;
  img.decoding = "async";
  img.loading = "lazy";
  wrap.append(img);
  container.append(wrap);
}

/**
 * @param {HTMLElement} container
 * @param {string} text
 */
function appendParagraph(container, text) {
  const p = document.createElement("p");
  p.textContent = text;
  container.append(p);
}

/**
 * @param {HTMLElement} container
 * @param {string} title
 */
function appendHeading(container, title) {
  const h = document.createElement("h3");
  h.className = "about-dialog__heading";
  h.textContent = title;
  container.append(h);
}

/**
 * @param {HTMLElement} container
 * @param {string[]} items
 */
function appendBulletList(container, items) {
  const ul = document.createElement("ul");
  ul.className = "about-dialog__list";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ul.append(li);
  }
  container.append(ul);
}

/**
 * @param {HTMLElement} container
 * @param {[import("./records.js").GameMode, string, string][]} rows
 */
function appendModesTable(container, rows) {
  const table = document.createElement("table");
  table.className = "about-dialog__table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const label of [deps?.t("aboutModeColGame") ?? "Game", deps?.t("aboutModeColMatch") ?? "Match"]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = document.createElement("tbody");
  for (const [mode, game, match] of rows) {
    const tr = document.createElement("tr");
    const tdGame = document.createElement("td");
    tdGame.className = "about-dialog__mode-cell";
    const iconUrl = getModeIconUrl(mode, { english2SourceLang: getEnglish2SourceLang() });
    if (iconUrl) {
      const img = document.createElement("img");
      img.className = "about-dialog__mode-icon";
      img.src = iconUrl;
      img.width = 28;
      img.height = 28;
      img.decoding = "async";
      img.alt = "";
      tdGame.append(img);
    }
    const name = document.createElement("span");
    name.textContent = game;
    tdGame.append(name);
    const tdMatch = document.createElement("td");
    tdMatch.textContent = match;
    tr.append(tdGame, tdMatch);
    tbody.append(tr);
  }
  table.append(tbody);
  container.append(table);
}

function renderAboutBody() {
  if (!aboutBody || !deps) return;
  const t = deps.t;
  aboutBody.replaceChildren();

  appendParagraph(aboutBody, t("aboutIntro"));

  const author = document.createElement("p");
  author.className = "about-dialog__author";
  author.textContent = t("aboutAuthor");
  aboutBody.append(author);

  appendHeading(aboutBody, t("aboutHowTitle"));
  appendBulletList(aboutBody, [
    t("aboutHowStep1"),
    t("aboutHowStep2"),
    t("aboutHowStep3"),
    t("aboutHowStep4"),
  ]);
  appendAboutImage(aboutBody, gameBoardImg, t("aboutImgBoardAlt"));

  appendHeading(aboutBody, t("aboutModesTitle"));
  /** @type {[string, string, string][]} */
  const aboutModes = [
    ["english1", t(english1LabelKey(getLocale(), "mode")), t("aboutModeEnglish1")],
    ["sums", t("modeSums"), t("aboutModeSums")],
    ["math", t("modeMath"), t("aboutModeMath")],
    ["fractions", t("modeFractions"), t("aboutModeFractions")],
  ];
  if (isEnglish2ModeAvailable(getLocale())) {
    aboutModes.splice(1, 0, [
      "english2",
      t("modeEnglish2"),
      t("aboutModeEnglish2", {
        sourceLangName: english2SourceLangName(getEnglish2SourceLang(), t),
      }),
    ]);
  }
  appendModesTable(aboutBody, aboutModes);
  appendAboutImage(aboutBody, gameModesImg, t("aboutImgModesAlt"));
  appendParagraph(aboutBody, t("aboutEnglishNote"));

  appendHeading(aboutBody, t("aboutOnlineTitle"));
  appendBulletList(aboutBody, [
    t("aboutOnlineStep1"),
    t("aboutOnlineStep2"),
    t("aboutOnlineStep3"),
    t("aboutOnlineStep4"),
    t("aboutOnlineStep5"),
  ]);
  appendAboutImage(aboutBody, onlinePlayImg, t("aboutImgOnlineAlt"));

  appendHeading(aboutBody, t("aboutExtrasTitle"));
  appendBulletList(aboutBody, [
    t("aboutExtraRecords"),
    t("aboutExtraQuiz"),
    t("aboutExtraLanguages"),
  ]);
}

export function openAboutDialog() {
  if (!aboutDialog || !deps) return;
  const title = document.querySelector("#aboutDialogTitle");
  if (title) title.textContent = deps.t("aboutTitle");
  if (aboutCloseBtn) aboutCloseBtn.textContent = deps.t("aboutCloseBtn");
  renderAboutBody();
  aboutDialog.showModal();
}

export function refreshAboutLabels() {
  if (!deps) return;
  if (openAboutSettingsBtn) openAboutSettingsBtn.textContent = deps.t("aboutMenu");
}
