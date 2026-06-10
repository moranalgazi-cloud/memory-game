import { isDevTesterSession } from "./auth.js";
import { celebrateWin } from "./celebrate.js";
import {
  ALBUM_SIZE,
  getAlbumPeriodId,
  getStickerDef,
  getWeeklyAlbum,
  getAlbumThemeKey,
  getAlbumThemeEmoji,
  getAlbumDominantCategory,
  listSelectableAlbumWeeks,
  countAlbumPlaced,
  isSlotPlaced,
} from "./roadmap-albums.js";
import { createAvatarElement, getNextAvatarId } from "./roadmap-avatars.js";
import {
  devCompleteCurrentLevel,
  formatChallengeDesc,
  formatChallengeTitle,
  getLevelChallenge,
  getRoadmapSummary,
  getVisibleLevelCount,
  placePendingSticker,
  setAvatarId,
  getAvatarId,
} from "./roadmap.js";
import { getAlbumCoverUrl, roadmapMapArt } from "./adventure-art.js";
import { createStickerElement, getStickerLabel } from "./roadmap-stickers.js";

/**
 * @typedef {Object} RoadmapUiDeps
 * @property {(key: string, vars?: Record<string, string>) => string} t
 * @property {() => string | null} getCurrentUserSlug
 * @property {() => { name: string } | null} getCurrentUser
 * @property {(preset: { mode: string; level?: string }) => void} onStartChallenge
 */

/** @type {RoadmapUiDeps | null} */
let deps = null;

/** @type {number | null} */
let selectedLevel = null;

/** @type {"picker" | "detail"} */
let albumView = "picker";

/** @type {string | null} */
let selectedAlbumWeek = null;

/** @type {{ pendingId: string; weekId: string; slug: string; ghost: HTMLElement; offsetX: number; offsetY: number; pointerId: number; sourceEl: HTMLElement; lastClientY: number } | null} */
let activeDrag = null;

/** @type {number | null} */
let dragScrollRaf = null;

/** @type {HTMLElement | null} */
let roadmapDragLayer = null;

const roadmapDialog = document.querySelector("#roadmapDialog");
const roadmapMapEl = document.querySelector("#roadmapMap");
const roadmapAlbumPickerEl = document.querySelector("#roadmapAlbumPicker");
const roadmapAlbumDetailEl = document.querySelector("#roadmapAlbumDetail");
const roadmapAlbumBackBtn = document.querySelector("#roadmapAlbumBack");
const roadmapAlbumDetailTitleEl = document.querySelector("#roadmapAlbumDetailTitle");
const roadmapAlbumDetailHintEl = document.querySelector("#roadmapAlbumDetailHint");
const roadmapAlbumSlotsEl = document.querySelector("#roadmapAlbumSlots");
const roadmapAlbumTrayEl = document.querySelector("#roadmapAlbumTray");
const roadmapTitleEl = document.querySelector("#roadmapTitle");
const roadmapSubtitleEl = document.querySelector("#roadmapSubtitle");
const roadmapCloseBtn = document.querySelector("#closeRoadmap");
const roadmapStartBtn = document.querySelector("#roadmapStartChallenge");
const quickNavAdventureBtn = document.querySelector("#quickNavAdventure");
const quickNavAlbumBtn = document.querySelector("#quickNavAlbum");
const roadmapProgressPill = document.querySelector("#roadmapProgressPill");
const roadmapLevelPopover = document.querySelector("#roadmapLevelPopover");
const roadmapDevCompleteBtn = document.querySelector("#roadmapDevComplete");
const roadmapTabMap = document.querySelector("#roadmapTabMap");
const roadmapTabAlbum = document.querySelector("#roadmapTabAlbum");
const roadmapPanelMap = document.querySelector("#roadmapPanelMap");
const roadmapPanelAlbum = document.querySelector("#roadmapPanelAlbum");

const roadmapRewardDialog = document.querySelector("#roadmapRewardDialog");
const roadmapRewardTitleEl = document.querySelector("#roadmapRewardTitle");
const roadmapRewardStickerEl = document.querySelector("#roadmapRewardSticker");
const roadmapRewardBodyEl = document.querySelector("#roadmapRewardBody");
const roadmapRewardStartBtn = document.querySelector("#roadmapRewardStartNext");
const roadmapRewardCloseBtn = document.querySelector("#roadmapRewardClose");

/** @type {{ level: number; nextLevel: number | null; preset?: { mode: string; level?: string }; albumWeek?: string } | null} */
let pendingReward = null;

const TRAIL_ROWS = [
  { levels: [1], down: "center" },
  { levels: [2, 3], down: "end" },
  { levels: [4, 5], down: "end" },
  { levels: [6, 7], down: "center" },
  { levels: [8, 9], down: "end" },
  { levels: [10, 11], down: "end" },
  { levels: [12], down: null },
];

function closeSettingsMenu() {
  const menu = document.querySelector("#settingsMenu");
  const btn = document.querySelector("#settingsMenuBtn");
  if (menu instanceof HTMLElement) menu.hidden = true;
  if (btn instanceof HTMLButtonElement) btn.setAttribute("aria-expanded", "false");
}

function syncRoadmapDevBtn(isMap = roadmapTabMap?.classList.contains("is-active")) {
  if (!roadmapDevCompleteBtn) return;
  roadmapDevCompleteBtn.hidden = !isMap || !isDevTesterSession();
}

function syncRoadmapStartButton() {
  if (!roadmapStartBtn || !deps) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const inProgress = summary.progress > 0 && summary.progress < summary.target;
  roadmapStartBtn.textContent = deps.t(
    inProgress ? "roadmapContinueChallenge" : "roadmapStartChallenge",
  );
}

function getDragScrollContainer() {
  if (roadmapPanelAlbum?.hidden) return null;
  return roadmapPanelAlbum;
}

/** @param {number} clientY */
function applyDragEdgeScroll(clientY) {
  const scrollEl = getDragScrollContainer();
  if (!scrollEl || scrollEl.scrollHeight <= scrollEl.clientHeight) return;

  const rect = scrollEl.getBoundingClientRect();
  const edge = 84;
  const maxStep = 18;

  if (clientY < rect.top + edge) {
    const intensity = 1 - Math.max(0, clientY - rect.top) / edge;
    scrollEl.scrollTop -= maxStep * intensity;
  } else if (clientY > rect.bottom - edge) {
    const intensity = 1 - Math.max(0, rect.bottom - clientY) / edge;
    scrollEl.scrollTop += maxStep * intensity;
  }
}

function dragAutoScrollTick() {
  if (!activeDrag) {
    stopDragAutoScroll();
    return;
  }
  applyDragEdgeScroll(activeDrag.lastClientY);
  dragScrollRaf = requestAnimationFrame(dragAutoScrollTick);
}

function startDragAutoScroll() {
  stopDragAutoScroll();
  dragScrollRaf = requestAnimationFrame(dragAutoScrollTick);
}

function stopDragAutoScroll() {
  if (dragScrollRaf !== null) {
    cancelAnimationFrame(dragScrollRaf);
    dragScrollRaf = null;
  }
}

function setRoadmapTab(tab) {
  const isMap = tab === "map";
  roadmapTabMap?.classList.toggle("is-active", isMap);
  roadmapTabAlbum?.classList.toggle("is-active", !isMap);
  roadmapTabMap?.setAttribute("aria-selected", isMap ? "true" : "false");
  roadmapTabAlbum?.setAttribute("aria-selected", !isMap ? "true" : "false");
  if (roadmapPanelMap) roadmapPanelMap.hidden = !isMap;
  if (roadmapPanelAlbum) roadmapPanelAlbum.hidden = isMap;
  if (roadmapStartBtn) roadmapStartBtn.hidden = !isMap;
  syncRoadmapDevBtn(isMap);
}

function showAlbumPicker() {
  albumView = "picker";
  selectedAlbumWeek = null;
  if (roadmapAlbumPickerEl) roadmapAlbumPickerEl.hidden = false;
  if (roadmapAlbumDetailEl) roadmapAlbumDetailEl.hidden = true;
  renderAlbumPicker();
}

function openAlbumDetail(weekId) {
  albumView = "detail";
  selectedAlbumWeek = weekId;
  if (roadmapAlbumPickerEl) roadmapAlbumPickerEl.hidden = true;
  if (roadmapAlbumDetailEl) roadmapAlbumDetailEl.hidden = false;
  renderAlbumDetail();
}

/**
 * @param {RoadmapUiDeps} d
 */
function ensureRoadmapDragLayer() {
  if (!roadmapDialog) return null;
  if (!roadmapDragLayer) {
    roadmapDragLayer = document.createElement("div");
    roadmapDragLayer.className = "roadmap-drag-layer";
    roadmapDragLayer.setAttribute("aria-hidden", "true");
    roadmapDialog.append(roadmapDragLayer);
  }
  return roadmapDragLayer;
}

export function initRoadmapUi(d) {
  deps = d;
  ensureRoadmapDragLayer();

  quickNavAdventureBtn?.addEventListener("click", () => openRoadmapDialog());
  quickNavAlbumBtn?.addEventListener("click", () => openRoadmapAlbum());
  roadmapCloseBtn?.addEventListener("click", closeRoadmapDialog);
  roadmapDialog?.addEventListener("click", (e) => {
    if (e.target === roadmapDialog) closeRoadmapDialog();
  });

  roadmapTabMap?.addEventListener("click", () => setRoadmapTab("map"));
  roadmapTabAlbum?.addEventListener("click", () => {
    setRoadmapTab("album");
    showAlbumPicker();
  });

  roadmapAlbumBackBtn?.addEventListener("click", showAlbumPicker);

  roadmapStartBtn?.addEventListener("click", () => {
    const slug = deps?.getCurrentUserSlug() ?? null;
    const summary = getRoadmapSummary(slug);
    const preset = summary.current?.preset;
    if (preset && deps) {
      deps.onStartChallenge(preset);
      closeRoadmapDialog();
    }
  });

  roadmapDevCompleteBtn?.addEventListener("click", () => {
    const slug = deps?.getCurrentUserSlug() ?? null;
    if (!slug) return;
    const result = devCompleteCurrentLevel(slug);
    if (result.completed) showRoadmapReward(result);
    else renderRoadmapDialog();
  });

  roadmapRewardCloseBtn?.addEventListener("click", closeRoadmapReward);
  roadmapRewardDialog?.addEventListener("click", (e) => {
    if (e.target === roadmapRewardDialog) closeRoadmapReward();
  });
  roadmapRewardStartBtn?.addEventListener("click", () => {
    if (pendingReward?.preset && deps) {
      deps.onStartChallenge(pendingReward.preset);
    }
    closeRoadmapReward();
    closeRoadmapDialog();
  });

  roadmapProgressPill?.addEventListener("click", openRoadmapDialog);
}

function clearSlotHovers() {
  roadmapAlbumSlotsEl?.querySelectorAll(".album-slot--hover").forEach((el) => {
    el.classList.remove("album-slot--hover");
  });
}

/** @param {number} clientX @param {number} clientY */
function slotAtPoint(clientX, clientY) {
  const hits = document.elementsFromPoint(clientX, clientY);
  for (const el of hits) {
    if (!(el instanceof Element)) continue;
    const slot = el.closest(".album-slot--missing");
    if (slot instanceof HTMLElement) return slot;
  }
  return null;
}

/** @param {number} clientX @param {number} clientY */
function positionDragGhost(clientX, clientY) {
  if (!activeDrag) return;
  const x = clientX - activeDrag.offsetX;
  const y = clientY - activeDrag.offsetY;
  activeDrag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.08)`;
}

const dragMoveOpts = { capture: true, passive: false };
const dragEndOpts = { capture: true };

function attachDragListeners() {
  window.addEventListener("pointermove", onDragPointerMove, dragMoveOpts);
  window.addEventListener("pointerup", finishDragPointer, dragEndOpts);
  window.addEventListener("pointercancel", finishDragPointer, dragEndOpts);
}

function detachDragListeners() {
  window.removeEventListener("pointermove", onDragPointerMove, dragMoveOpts);
  window.removeEventListener("pointerup", finishDragPointer, dragEndOpts);
  window.removeEventListener("pointercancel", finishDragPointer, dragEndOpts);
}

function cancelActiveDrag() {
  if (!activeDrag) return;
  detachDragListeners();
  activeDrag.ghost.remove();
  activeDrag.sourceEl.classList.remove("album-tray__item--dragging");
  roadmapDialog?.classList.remove("is-dragging-sticker");
  activeDrag = null;
  clearSlotHovers();
}

/** @param {PointerEvent} e */
function onDragPointerMove(e) {
  if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
  e.preventDefault();
  activeDrag.lastClientY = e.clientY;
  positionDragGhost(e.clientX, e.clientY);
  applyDragEdgeScroll(e.clientY);
  clearSlotHovers();
  slotAtPoint(e.clientX, e.clientY)?.classList.add("album-slot--hover");
}

/** @param {PointerEvent} e */
function finishDragPointer(e) {
  if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
  const { pendingId, weekId, slug, ghost, sourceEl } = activeDrag;
  const slotEl = slotAtPoint(e.clientX, e.clientY);
  clearSlotHovers();
  detachDragListeners();
  stopDragAutoScroll();
  ghost.remove();
  sourceEl.classList.remove("album-tray__item--dragging");
  roadmapDialog?.classList.remove("is-dragging-sticker");
  activeDrag = null;

  if (slotEl && slug) {
    const slot = Number(slotEl.dataset.slot);
    if (!Number.isNaN(slot)) tryPlacePending(slug, pendingId, weekId, slot);
  }
}

export function refreshRoadmapLabels() {
  if (!deps) return;
  const { t } = deps;
  if (quickNavAdventureBtn) {
    const label = quickNavAdventureBtn.querySelector(".quick-nav__label");
    if (label) label.textContent = t("quickNavAdventure");
    quickNavAdventureBtn.setAttribute("aria-label", t("ariaRoadmap"));
  }
  if (quickNavAlbumBtn) {
    const label = quickNavAlbumBtn.querySelector(".quick-nav__label");
    if (label) label.textContent = t("quickNavAlbum");
    quickNavAlbumBtn.setAttribute("aria-label", t("ariaAlbum"));
  }
  if (roadmapTitleEl) roadmapTitleEl.textContent = t("roadmapTitle");
  if (roadmapSubtitleEl) roadmapSubtitleEl.textContent = t("roadmapSubtitle");
  if (roadmapCloseBtn) roadmapCloseBtn.textContent = t("roadmapClose");
  syncRoadmapStartButton();
  if (roadmapRewardCloseBtn) roadmapRewardCloseBtn.textContent = t("roadmapClose");
  if (roadmapTabMap) roadmapTabMap.textContent = t("roadmapTabMap");
  if (roadmapTabAlbum) roadmapTabAlbum.textContent = t("roadmapTabAlbum");
  if (roadmapDevCompleteBtn) roadmapDevCompleteBtn.textContent = t("roadmapDevComplete");
  syncRoadmapDevBtn();
  if (roadmapAlbumBackBtn) roadmapAlbumBackBtn.textContent = t("roadmapAlbumBack");
}

export function refreshRoadmapProgressPill() {
  if (!deps) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  syncRoadmapStartButton();
  if (!roadmapProgressPill) return;

  roadmapProgressPill.hidden = false;
  roadmapProgressPill.textContent = `L${summary.current.level} · ${summary.progress}/${summary.target}`;
  roadmapProgressPill.setAttribute(
    "aria-label",
    deps.t("roadmapPillAria", {
      progress: String(summary.progress),
      target: String(summary.target),
      level: String(summary.current.level),
    }),
  );
}

function createProgressRing(progress, target) {
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  ring.setAttribute("viewBox", "0 0 80 80");
  ring.setAttribute("class", "adventure-node__ring");
  ring.setAttribute("aria-hidden", "true");
  const pct = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
  const c = 2 * Math.PI * 34;
  ring.innerHTML = `
    <circle cx="40" cy="40" r="34" class="adventure-node__ring-track"/>
    <circle cx="40" cy="40" r="34" class="adventure-node__ring-fill"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
  `;
  return ring;
}

/**
 * @param {import("./roadmap.js").RoadmapLevel} challenge
 * @param {{ isDone: boolean; isCurrent: boolean; isLocked: boolean; progress: number; target: number; showAvatar: boolean; avatarId: string }} meta
 */
function createLevelNode(challenge, meta) {
  const { t } = /** @type {RoadmapUiDeps} */ (deps);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "adventure-node";
  btn.dataset.level = String(challenge.level);
  if (meta.isDone) btn.classList.add("adventure-node--done");
  if (meta.isCurrent) btn.classList.add("adventure-node--current");
  if (meta.isLocked) btn.classList.add("adventure-node--locked");
  if (selectedLevel === challenge.level) btn.classList.add("adventure-node--selected");

  btn.setAttribute("aria-label", t("roadmapLevelLabel", { level: String(challenge.level) }));

  if (meta.isCurrent) btn.append(createProgressRing(meta.progress, meta.target));

  const core = document.createElement("span");
  core.className = "adventure-node__core";
  core.textContent = meta.isDone ? "✓" : String(challenge.level);
  btn.append(core);

  if (meta.showAvatar) {
    const avatar = createAvatarElement(meta.avatarId, t);
    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      const slug = deps?.getCurrentUserSlug();
      if (!slug) return;
      const next = getNextAvatarId(getAvatarId(slug));
      setAvatarId(slug, next);
      renderRoadmapMap();
    });
    btn.append(avatar);
  }

  btn.addEventListener("click", () => {
    if (meta.isLocked) {
      btn.classList.add("adventure-node--shake");
      window.setTimeout(() => btn.classList.remove("adventure-node--shake"), 450);
      return;
    }
    selectedLevel = selectedLevel === challenge.level ? null : challenge.level;
    renderLevelPopover();
    renderRoadmapMap();
  });

  return btn;
}

function createHConnector() {
  const el = document.createElement("div");
  el.className = "adventure-link adventure-link--h";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="adventure-link__dots"></span><span class="adventure-link__arrow">→</span>';
  return el;
}

/** @param {"center" | "end"} anchor */
function createVConnector(anchor) {
  const el = document.createElement("div");
  el.className = `adventure-link adventure-link--v adventure-link--v-${anchor}`;
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="adventure-link__stem"></span><span class="adventure-link__arrow-down">↓</span>';
  return el;
}

function renderLevelPopover() {
  if (!deps || !roadmapLevelPopover) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const { state } = summary;

  if (!selectedLevel) {
    roadmapLevelPopover.hidden = true;
    roadmapLevelPopover.replaceChildren();
    return;
  }

  const challenge = getLevelChallenge(selectedLevel);
  const isCurrent = state.currentLevel === selectedLevel;
  const isDone = state.completedLevels.includes(selectedLevel);
  const isLocked = !isCurrent && !isDone;

  roadmapLevelPopover.hidden = false;
  roadmapLevelPopover.replaceChildren();

  const title = document.createElement("h3");
  title.className = "adventure-popover__title";
  title.textContent = formatChallengeTitle(challenge, deps.t);

  const desc = document.createElement("p");
  desc.className = "adventure-popover__desc";
  desc.textContent = formatChallengeDesc(challenge, deps.t);

  roadmapLevelPopover.append(title, desc);

  if (isCurrent) {
    const prog = document.createElement("p");
    prog.className = "adventure-popover__progress";
    prog.textContent = deps.t("roadmapProgressLabel", {
      progress: String(summary.progress),
      target: String(summary.target),
    });
    roadmapLevelPopover.append(prog);
  } else if (isDone) {
    const done = document.createElement("p");
    done.className = "adventure-popover__done";
    done.textContent = deps.t("roadmapDone");
    roadmapLevelPopover.append(done);
  } else if (isLocked) {
    const lock = document.createElement("p");
    lock.className = "adventure-popover__locked";
    lock.textContent = deps.t("roadmapLocked");
    roadmapLevelPopover.append(lock);
  }
}

function renderRoadmapMap() {
  if (!deps || !roadmapMapEl) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const { state } = summary;
  const visibleMax = getVisibleLevelCount(slug);
  const avatarId = getAvatarId(slug);

  roadmapMapEl.replaceChildren();

  const scene = document.createElement("div");
  scene.className = "adventure-scene";
  scene.innerHTML = `
    <div class="adventure-scene__backdrop" aria-hidden="true">
      <img class="adventure-scene__backdrop-img" src="${roadmapMapArt}" alt="" decoding="async" />
    </div>
    <div class="adventure-scene__sky" aria-hidden="true"></div>
    <div class="adventure-scene__hills" aria-hidden="true"></div>
    <div class="adventure-scene__cloud adventure-scene__cloud--a" aria-hidden="true"></div>
    <div class="adventure-scene__cloud adventure-scene__cloud--b" aria-hidden="true"></div>
  `;

  const trail = document.createElement("div");
  trail.className = "adventure-trail";

  for (const rowDef of TRAIL_ROWS) {
    const levelsInRow = rowDef.levels.filter((l) => l <= visibleMax);
    if (!levelsInRow.length) continue;

    const row = document.createElement("div");
    row.className = "adventure-row";
    if (levelsInRow.length === 1) row.classList.add("adventure-row--solo");

    for (let i = 0; i < levelsInRow.length; i += 1) {
      const level = levelsInRow[i];
      const challenge = getLevelChallenge(level);
      const isDone = state.completedLevels.includes(level);
      const isCurrent = state.currentLevel === level;
      const isLocked = !isDone && !isCurrent;

      row.append(
        createLevelNode(challenge, {
          isDone,
          isCurrent,
          isLocked,
          progress: isCurrent ? summary.progress : 0,
          target: isCurrent ? summary.target : challenge.goal.count,
          showAvatar: isCurrent,
          avatarId,
        }),
      );

      if (i < levelsInRow.length - 1) row.append(createHConnector());
    }

    trail.append(row);
    if (rowDef.down && levelsInRow.length) trail.append(createVConnector(rowDef.down));
  }

  scene.append(trail);
  roadmapMapEl.append(scene);
  renderLevelPopover();
}

function renderAlbumPicker() {
  if (!deps || !roadmapAlbumPickerEl) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const currentPeriod = getAlbumPeriodId();
  const weeks = listSelectableAlbumWeeks(
    summary.state.placedStickers,
    summary.state.pendingStickers,
    currentPeriod,
  );

  roadmapAlbumPickerEl.replaceChildren();

  const heading = document.createElement("h3");
  heading.className = "album-picker__heading";
  heading.textContent = deps.t("roadmapAlbumPick");
  roadmapAlbumPickerEl.append(heading);

  const grid = document.createElement("div");
  grid.className = "album-picker__grid";

  for (const periodId of weeks) {
    const placed = countAlbumPlaced(summary.state.placedStickers, periodId);
    const pending = summary.state.pendingStickers.filter((p) => p.albumWeek === periodId).length;
    const themeName = deps.t(getAlbumThemeKey(periodId));
    const category = getAlbumDominantCategory(periodId);

    const card = document.createElement("button");
    card.type = "button";
    card.className = `album-picker__card album-picker__card--${category}`;
    if (periodId === currentPeriod) card.classList.add("album-picker__card--current");

    const art = document.createElement("span");
    art.className = "album-picker__art";
    art.setAttribute("aria-hidden", "true");

    const shine = document.createElement("span");
    shine.className = "album-picker__shine";

    const coverUrl = getAlbumCoverUrl(category);
    if (coverUrl) {
      const cover = document.createElement("img");
      cover.className = "album-picker__cover";
      cover.src = coverUrl;
      cover.alt = "";
      cover.decoding = "async";
      art.append(shine, cover);
    } else {
      const emoji = document.createElement("span");
      emoji.className = "album-picker__emoji";
      emoji.textContent = getAlbumThemeEmoji(periodId);
      art.append(shine, emoji);
    }

    const content = document.createElement("span");
    content.className = "album-picker__content";

    const title = document.createElement("span");
    title.className = "album-picker__title";
    title.textContent = themeName;

    const stats = document.createElement("span");
    stats.className = "album-picker__stats";
    stats.textContent = deps.t("roadmapAlbumCount", {
      placed: String(placed),
      total: String(ALBUM_SIZE),
    });
    if (pending > 0) {
      stats.textContent += ` · ${deps.t("roadmapAlbumPending", { count: String(pending) })}`;
    }

    content.append(title, stats);
    card.append(art, content);
    card.addEventListener("click", () => openAlbumDetail(periodId));
    grid.append(card);
  }

  roadmapAlbumPickerEl.append(grid);
}

/**
 * @param {string} pendingId
 * @param {string} stickerId
 * @param {string} weekId
 * @param {string} slug
 */
function createDraggablePending(pendingId, stickerId, weekId, slug) {
  const wrap = document.createElement("div");
  wrap.className = "album-tray__item";
  wrap.dataset.pendingId = pendingId;
  wrap.dataset.stickerId = stickerId;

  const sticker = createStickerElement(stickerId, {
    size: "lg",
    title: getStickerLabel(stickerId),
    tilt: -6,
  });
  wrap.append(sticker);

  const beginDrag = (e) => {
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    cancelActiveDrag();

    const rect = wrap.getBoundingClientRect();
    const ghost = sticker.cloneNode(true);
    if (!(ghost instanceof HTMLElement)) return;
    ghost.classList.remove("mm-sticker--md", "mm-sticker--lg");
    ghost.classList.add("mm-sticker--xl", "album-drag-ghost");
    ghost.style.width = `${rect.width * 1.15}px`;
    ghost.style.height = `${rect.height * 1.15}px`;
    const dragLayer = ensureRoadmapDragLayer() ?? roadmapDialog ?? document.body;
    dragLayer.append(ghost);

    activeDrag = {
      pendingId,
      weekId,
      slug,
      ghost,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      pointerId: e.pointerId,
      sourceEl: wrap,
      lastClientY: e.clientY,
    };
    positionDragGhost(e.clientX, e.clientY);
    wrap.classList.add("album-tray__item--dragging");
    roadmapDialog?.classList.add("is-dragging-sticker");
    attachDragListeners();
    startDragAutoScroll();
  };

  wrap.addEventListener("pointerdown", beginDrag);
  sticker.addEventListener("pointerdown", beginDrag);

  return wrap;
}

function renderAlbumDetail() {
  if (!deps || !selectedAlbumWeek || !roadmapAlbumSlotsEl || !roadmapAlbumTrayEl) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const weekId = selectedAlbumWeek;
  const album = getWeeklyAlbum(weekId);
  const themeName = deps.t(getAlbumThemeKey(weekId));

  if (roadmapAlbumDetailTitleEl) {
    roadmapAlbumDetailTitleEl.textContent = themeName;
  }
  if (roadmapAlbumDetailHintEl) {
    roadmapAlbumDetailHintEl.textContent = deps.t("roadmapAlbumDragHint");
  }

  roadmapAlbumSlotsEl.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "album-slots__grid";

  for (const slotDef of album.slots) {
    const placed = isSlotPlaced(summary.state.placedStickers, weekId, slotDef.slot);
    const slot = document.createElement("div");
    slot.className = "album-slot";
    slot.dataset.slot = String(slotDef.slot);
    slot.dataset.stickerId = slotDef.stickerId;
    if (placed) slot.classList.add("album-slot--placed");
    else slot.classList.add("album-slot--missing");

    if (placed) {
      const sticker = createStickerElement(slotDef.stickerId, {
        size: "lg",
        title: getStickerLabel(slotDef.stickerId),
        tilt: (slotDef.slot % 4) * 3 - 4,
      });
      slot.append(sticker);
    } else {
      const ghost = createStickerElement(slotDef.stickerId, {
        size: "lg",
        locked: true,
      });
      ghost.classList.add("album-slot__ghost");
      slot.append(ghost);
    }

    grid.append(slot);
  }

  roadmapAlbumSlotsEl.append(grid);

  roadmapAlbumTrayEl.replaceChildren();
  const trayHead = document.createElement("p");
  trayHead.className = "album-tray__title";
  trayHead.textContent = deps.t("roadmapAlbumTray");
  roadmapAlbumTrayEl.append(trayHead);

  const pendingForWeek = summary.state.pendingStickers.filter((p) => p.albumWeek === weekId);
  if (!pendingForWeek.length) {
    const empty = document.createElement("p");
    empty.className = "album-tray__empty";
    empty.textContent = deps.t("roadmapAlbumTrayEmpty");
    roadmapAlbumTrayEl.append(empty);
  } else {
    const row = document.createElement("div");
    row.className = "album-tray__row";
    for (const p of pendingForWeek) {
      row.append(createDraggablePending(p.id, p.stickerId, weekId, slug));
    }
    roadmapAlbumTrayEl.append(row);
  }
}

/**
 * @param {string} slug
 * @param {string} pendingId
 * @param {string} weekId
 * @param {number} slot
 */
function tryPlacePending(slug, pendingId, weekId, slot) {
  const result = placePendingSticker(slug, pendingId, weekId, slot);
  if (result.ok) {
    renderAlbumDetail();
    refreshRoadmapProgressPill();
  } else {
    const slotEl = roadmapAlbumSlotsEl?.querySelector(`[data-slot="${slot}"]`);
    slotEl?.classList.add("album-slot--reject");
    window.setTimeout(() => slotEl?.classList.remove("album-slot--reject"), 400);
  }
}

function renderAlbumView() {
  if (albumView === "detail" && selectedAlbumWeek) renderAlbumDetail();
  else showAlbumPicker();
}

export function renderRoadmapDialog() {
  renderRoadmapMap();
  if (!roadmapPanelAlbum?.hidden) renderAlbumView();
  refreshRoadmapProgressPill();
  syncRoadmapStartButton();
}

export function openRoadmapDialog() {
  refreshRoadmapLabels();
  selectedLevel = null;
  albumView = "picker";
  selectedAlbumWeek = null;
  setRoadmapTab("map");
  renderRoadmapDialog();
  roadmapDialog?.showModal();
}

export function openRoadmapAlbum() {
  refreshRoadmapLabels();
  selectedLevel = null;
  albumView = "picker";
  selectedAlbumWeek = null;
  setRoadmapTab("album");
  showAlbumPicker();
  renderRoadmapDialog();
  roadmapDialog?.showModal();
}

export function closeRoadmapDialog() {
  cancelActiveDrag();
  selectedLevel = null;
  if (roadmapLevelPopover) roadmapLevelPopover.hidden = true;
  roadmapDialog?.close();
}

/**
 * @param {import("./roadmap.js").RoadmapEventResult} result
 */
export function showRoadmapReward(result) {
  if (!deps || !result.completed || !result.level || !result.stickerId) return;

  try {
    celebrateWin();
  } catch (e) {
    console.warn("[roadmap-ui] celebrate:", e);
  }

  const nextChallenge = result.nextLevel ? getLevelChallenge(result.nextLevel) : null;
  const albumTheme = result.albumWeek ? deps.t(getAlbumThemeKey(result.albumWeek)) : "";

  pendingReward = {
    level: result.level,
    nextLevel: result.nextLevel ?? null,
    preset: nextChallenge?.preset,
    albumWeek: result.albumWeek,
  };

  if (roadmapRewardTitleEl) {
    roadmapRewardTitleEl.textContent = deps.t("roadmapRewardTitle", {
      level: String(result.level),
    });
  }
  if (roadmapRewardStickerEl) {
    roadmapRewardStickerEl.replaceChildren();
    const sticker = createStickerElement(result.stickerId, {
      size: "xl",
      pop: true,
      title: getStickerLabel(result.stickerId),
    });
    roadmapRewardStickerEl.append(sticker);
  }
  if (roadmapRewardBodyEl) {
    roadmapRewardBodyEl.textContent = `${deps.t("roadmapRewardBody", {
      sticker: result.stickerLabel ?? getStickerLabel(result.stickerId),
      album: albumTheme,
    })} ${deps.t("roadmapRewardPlace")}`;
  }
  if (roadmapRewardStartBtn) {
    if (result.nextLevel && nextChallenge) {
      roadmapRewardStartBtn.hidden = false;
      roadmapRewardStartBtn.textContent = deps.t("roadmapStartNextLevel", {
        level: String(result.nextLevel),
      });
    } else {
      roadmapRewardStartBtn.hidden = true;
    }
  }

  renderRoadmapDialog();
  roadmapRewardDialog?.showModal();
}

function closeRoadmapReward() {
  const week = pendingReward?.albumWeek ?? null;
  roadmapRewardDialog?.close();
  pendingReward = null;
  if (week) {
    setRoadmapTab("album");
    openAlbumDetail(week);
  }
}
