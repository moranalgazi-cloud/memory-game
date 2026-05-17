import gameBoardImg from "../docs/images/game-board.svg?url";
import gameModesImg from "../docs/images/game-modes.svg?url";
import onlinePlayImg from "../docs/images/online-play.svg?url";

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
 * @param {[string, string][]} rows
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
  for (const [game, match] of rows) {
    const tr = document.createElement("tr");
    const tdGame = document.createElement("td");
    tdGame.textContent = game;
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

  appendHeading(aboutBody, t("aboutHowTitle"));
  appendBulletList(aboutBody, [
    t("aboutHowStep1"),
    t("aboutHowStep2"),
    t("aboutHowStep3"),
    t("aboutHowStep4"),
  ]);
  appendAboutImage(aboutBody, gameBoardImg, t("aboutImgBoardAlt"));

  appendHeading(aboutBody, t("aboutModesTitle"));
  appendModesTable(aboutBody, [
    [t("modeEnglish1"), t("aboutModeEnglish1")],
    [t("modeEnglish2"), t("aboutModeEnglish2")],
    [t("modeSums"), t("aboutModeSums")],
    [t("modeMath"), t("aboutModeMath")],
    [t("modeFractions"), t("aboutModeFractions")],
  ]);
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
