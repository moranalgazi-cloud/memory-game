import roadmapMapImg from "../docs/images/adventure/roadmap-map.png?url";
import albumCoverImg from "../docs/images/adventure/album-animals.png?url";
import stickerLion from "../docs/images/stickers/sticker-lion.png?url";
import stickerPenguin from "../docs/images/stickers/sticker-penguin.png?url";
import { GAME_MODE_ORDER, getModeIconUrl } from "./mode-icons.js";
import { NAV_ICON_URLS } from "./nav-icons.js";
import { hasUserCompletedTutorial, markUserTutorialCompleted } from "./tutorial.js";
import { getCurrentUserSlug } from "./user-store.js";

/**
 * @typedef {Object} TutorialUiDeps
 * @property {(key: string, vars?: Record<string, string>) => string} t
 */

/** @typedef {'match' | 'modes' | 'adventure' | 'album' | 'shortcuts'} TutorialSlideId */

/** @type {TutorialUiDeps | null} */
let deps = null;

/** @type {(() => void) | null} */
let pendingDone = null;

/** @type {string | null} */
let activeUserSlug = null;

/** @type {number} */
let slideIndex = 0;

/** @type {readonly TutorialSlideId[]} */
const SLIDE_IDS = ["match", "modes", "adventure", "album", "shortcuts"];

const tutorialDialog = document.querySelector("#tutorialDialog");
const tutorialArt = document.querySelector("#tutorialArt");
const tutorialTitle = document.querySelector("#tutorialTitle");
const tutorialBody = document.querySelector("#tutorialBody");
const tutorialDots = document.querySelector("#tutorialDots");
const tutorialSkipBtn = document.querySelector("#tutorialSkip");
const tutorialBackBtn = document.querySelector("#tutorialBack");
const tutorialNextBtn = document.querySelector("#tutorialNext");

/**
 * @param {TutorialUiDeps} d
 */
export function initTutorialUi(d) {
  deps = d;

  tutorialSkipBtn?.addEventListener("click", () => completeTutorial());
  tutorialBackBtn?.addEventListener("click", () => {
    if (slideIndex <= 0) return;
    slideIndex -= 1;
    renderSlide();
  });
  tutorialNextBtn?.addEventListener("click", () => {
    if (slideIndex >= SLIDE_IDS.length - 1) completeTutorial();
    else {
      slideIndex += 1;
      renderSlide();
    }
  });

  tutorialDialog?.addEventListener("cancel", (e) => {
    e.preventDefault();
    completeTutorial();
  });
}

function completeTutorial() {
  const slug = activeUserSlug ?? getCurrentUserSlug();
  markUserTutorialCompleted(slug);
  tutorialDialog?.close();
  activeUserSlug = null;
  const done = pendingDone;
  pendingDone = null;
  done?.();
}

/**
 * @param {TutorialSlideId} id
 */
function renderArt(id) {
  if (!(tutorialArt instanceof HTMLElement)) return;
  tutorialArt.replaceChildren();
  tutorialArt.className = `tutorial-dialog__art tutorial-dialog__art--${id}`;
  tutorialArt.removeAttribute("aria-hidden");

  if (id === "match") {
    const board = document.createElement("div");
    board.className = "tutorial-art-cards";
    board.setAttribute("aria-hidden", "true");

    /** @param {string} text @param {boolean} [matched] */
    const card = (text, matched = false) => {
      const el = document.createElement("div");
      el.className = "tutorial-art-card";
      if (matched) el.classList.add("tutorial-art-card--matched");
      el.textContent = text;
      return el;
    };

    board.append(
      card("?"),
      card("7×8", true),
      card("?"),
      card("56", true),
      card("?"),
      card("Dog"),
    );

    const spark = document.createElement("span");
    spark.className = "tutorial-art-cards__spark";
    spark.setAttribute("aria-hidden", "true");
    spark.textContent = "✨";

    const wrap = document.createElement("div");
    wrap.className = "tutorial-art-cards__wrap";
    wrap.append(board, spark);
    tutorialArt.append(wrap);
    return;
  }

  if (id === "modes") {
    const grid = document.createElement("div");
    grid.className = "tutorial-art-modes";
    grid.setAttribute("aria-hidden", "true");
    for (const mode of GAME_MODE_ORDER) {
      const url = getModeIconUrl(mode);
      if (!url) continue;
      const cell = document.createElement("div");
      cell.className = "tutorial-art-modes__cell";
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.width = 56;
      img.height = 56;
      img.decoding = "async";
      cell.append(img);
      grid.append(cell);
    }
    tutorialArt.append(grid);
    return;
  }

  if (id === "adventure") {
    const scene = document.createElement("div");
    scene.className = "tutorial-art-adventure";
    scene.setAttribute("aria-hidden", "true");
    const map = document.createElement("img");
    map.className = "tutorial-art-adventure__map";
    map.src = roadmapMapImg;
    map.alt = "";
    map.decoding = "async";
    const sticker = document.createElement("img");
    sticker.className = "tutorial-art-adventure__sticker";
    sticker.src = stickerLion;
    sticker.alt = "";
    sticker.decoding = "async";
    scene.append(map, sticker);
    tutorialArt.append(scene);
    return;
  }

  if (id === "album") {
    const scene = document.createElement("div");
    scene.className = "tutorial-art-album";
    scene.setAttribute("aria-hidden", "true");

    const cover = document.createElement("img");
    cover.className = "tutorial-art-album__cover";
    cover.src = albumCoverImg;
    cover.alt = "";
    cover.decoding = "async";

    const board = document.createElement("div");
    board.className = "tutorial-art-album__board";

    const grid = document.createElement("div");
    grid.className = "tutorial-art-album__grid";

    for (let i = 0; i < 6; i += 1) {
      const slot = document.createElement("div");
      slot.className = "tutorial-art-album__slot";
      if (i === 1) {
        slot.classList.add("tutorial-art-album__slot--placed");
        const placed = document.createElement("img");
        placed.src = stickerLion;
        placed.alt = "";
        placed.decoding = "async";
        slot.append(placed);
      } else {
        slot.classList.add("tutorial-art-album__slot--ghost");
      }
      grid.append(slot);
    }

    const tray = document.createElement("div");
    tray.className = "tutorial-art-album__tray";
    const traySticker = document.createElement("img");
    traySticker.className = "tutorial-art-album__tray-sticker";
    traySticker.src = stickerPenguin;
    traySticker.alt = "";
    traySticker.decoding = "async";
    const dragHint = document.createElement("span");
    dragHint.className = "tutorial-art-album__drag-hint";
    dragHint.textContent = "👆";
    tray.append(traySticker, dragHint);

    board.append(grid, tray);
    scene.append(cover, board);
    tutorialArt.append(scene);
    return;
  }

  const row = document.createElement("div");
  row.className = "tutorial-art-nav";
  row.setAttribute("aria-hidden", "true");
  for (const key of ["adventure", "album", "records", "friend"]) {
    const url = NAV_ICON_URLS[key];
    if (!url) continue;
    const btn = document.createElement("div");
    btn.className = "tutorial-art-nav__item";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.width = 52;
    img.height = 52;
    img.decoding = "async";
    btn.append(img);
    row.append(btn);
  }
  tutorialArt.append(row);
}

function renderDots() {
  if (!(tutorialDots instanceof HTMLElement) || !deps) return;
  tutorialDots.replaceChildren();
  for (let i = 0; i < SLIDE_IDS.length; i += 1) {
    const dot = document.createElement("span");
    dot.className = "tutorial-dialog__dot";
    if (i === slideIndex) dot.classList.add("is-active");
    dot.setAttribute("aria-hidden", "true");
    tutorialDots.append(dot);
  }
}

function renderSlide() {
  if (!deps) return;
  const t = deps.t;
  const id = SLIDE_IDS[slideIndex];
  const step = slideIndex + 1;

  if (tutorialTitle) tutorialTitle.textContent = t(`tutorialStep${step}Title`);
  if (tutorialBody) tutorialBody.textContent = t(`tutorialStep${step}Body`);

  renderArt(id);
  renderDots();

  if (tutorialBackBtn instanceof HTMLButtonElement) {
    const showBack = slideIndex > 0;
    tutorialBackBtn.hidden = !showBack;
    tutorialBackBtn.textContent = t("tutorialBack");
    tutorialBackBtn.setAttribute("aria-label", t("tutorialBackAria"));
  }

  if (tutorialNextBtn) {
    const last = slideIndex >= SLIDE_IDS.length - 1;
    tutorialNextBtn.textContent = last ? t("tutorialStart") : t("tutorialNext");
  }

  if (tutorialArt instanceof HTMLElement) {
    tutorialArt.classList.remove("tutorial-dialog__art--enter");
    void tutorialArt.offsetWidth;
    tutorialArt.classList.add("tutorial-dialog__art--enter");
  }
}

/**
 * @param {string | null | undefined} userSlug
 * @param {() => void} [onDone]
 */
export function openTutorialIfNeeded(userSlug, onDone) {
  if (hasUserCompletedTutorial(userSlug)) {
    onDone?.();
    return;
  }
  activeUserSlug = userSlug ?? null;
  pendingDone = onDone ?? null;
  slideIndex = 0;
  renderSlide();
  tutorialDialog?.showModal();
}

export function refreshTutorialLabels() {
  if (!deps) return;
  const t = deps.t;
  if (tutorialSkipBtn) {
    tutorialSkipBtn.textContent = t("tutorialSkip");
    tutorialSkipBtn.setAttribute("aria-label", t("tutorialSkipAria"));
  }
  if (tutorialDialog) tutorialDialog.setAttribute("aria-label", t("tutorialAria"));
  if (tutorialDialog?.open) renderSlide();
}
