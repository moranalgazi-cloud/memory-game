import { isDevTesterSession } from "./auth.js";
import { celebrateWin } from "./celebrate.js";
import {
  getAlbumSlotCount,
  getLatestReleasedAlbumPeriodId,
  getMaxReleasedAlbumIndex,
  getAlbumPeriodId,
  getStickerDef,
  getWeeklyAlbum,
  getAlbumThemeKey,
  getAlbumThemeEmoji,
  getAlbumDominantCategory,
  listSelectableAlbumWeeks,
  countAlbumPlaced,
  isAlbumComplete,
  getDaysUntilNextAlbumPeriod,
  isSlotPlaced,
} from "./roadmap-albums.js";
import { createAvatarElement, getNextAvatarId } from "./roadmap-avatars.js";
import {
  devCompleteCurrentLevel,
  formatChallengeDesc,
  formatChallengeTitle,
  getLevelChallenge,
  getRoadmapSummary,
  getVisibleLevelRange,
  ensureDevAlbumTrayStickers,
  grantAllMissingAlbumStickers,
  placePendingSticker,
  setAvatarId,
  getAvatarId,
} from "./roadmap.js";
import { getAlbumCoverUrl, roadmapMapArt, preloadRoadmapMapArt } from "./adventure-art.js";
import {
  ROADMAP_LEVEL_SPOTS,
  ROADMAP_MAP_SIZE,
  ROADMAP_PATH_VERTICES,
  buildSvgPathFromVertices,
  getRoadmapDisplayPositionsForLevels,
} from "./roadmap-map-spots.js";
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

/** True when the player tapped a level node; false when following the active level. */
let userPickedLevel = false;

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
const albumDialog = document.querySelector("#albumDialog");
const roadmapMapEl = document.querySelector("#roadmapMap");
const roadmapAlbumPickerEl = document.querySelector("#roadmapAlbumPicker");
const roadmapAlbumDetailEl = document.querySelector("#roadmapAlbumDetail");
const roadmapAlbumBackBtn = document.querySelector("#roadmapAlbumBack");
const roadmapAlbumDetailTitleEl = document.querySelector("#roadmapAlbumDetailTitle");
const roadmapAlbumDetailHintEl = document.querySelector("#roadmapAlbumDetailHint");
const roadmapAlbumGrantAllBtn = document.querySelector("#roadmapAlbumGrantAll");
const roadmapAlbumSlotsEl = document.querySelector("#roadmapAlbumSlots");
const roadmapAlbumTrayEl = document.querySelector("#roadmapAlbumTray");
const roadmapTitleEl = document.querySelector("#roadmapTitle");
const roadmapSubtitleEl = document.querySelector("#roadmapSubtitle");
const albumTitleEl = document.querySelector("#albumTitle");
const albumSubtitleEl = document.querySelector("#albumSubtitle");
const roadmapCloseBtn = document.querySelector("#closeRoadmap");
const albumCloseBtn = document.querySelector("#closeAlbum");
const roadmapStartBtn = document.querySelector("#roadmapStartChallenge");
const quickNavAdventureBtn = document.querySelector("#quickNavAdventure");
const quickNavAlbumBtn = document.querySelector("#quickNavAlbum");
const roadmapProgressPill = document.querySelector("#roadmapProgressPill");
const roadmapLevelPopover = document.querySelector("#roadmapLevelPopover");
const roadmapDevCompleteBtn = document.querySelector("#roadmapDevComplete");
const albumPanel = document.querySelector("#albumPanel");

const roadmapRewardDialog = document.querySelector("#roadmapRewardDialog");
const roadmapRewardTitleEl = document.querySelector("#roadmapRewardTitle");
const roadmapRewardStickerEl = document.querySelector("#roadmapRewardSticker");
const roadmapRewardBodyEl = document.querySelector("#roadmapRewardBody");
const roadmapRewardStartBtn = document.querySelector("#roadmapRewardStartNext");
const roadmapRewardCloseBtn = document.querySelector("#roadmapRewardClose");

const albumCompleteDialog = document.querySelector("#albumCompleteDialog");
const albumCompleteTitleEl = document.querySelector("#albumCompleteTitle");
const albumCompleteBodyEl = document.querySelector("#albumCompleteBody");
const albumCompleteCloseBtn = document.querySelector("#albumCompleteClose");

/** @type {{ level: number; nextLevel: number | null; preset?: { mode: string; level?: string }; albumWeek?: string } | null} */
let pendingReward = null;

const LEVEL_SPOTS = ROADMAP_LEVEL_SPOTS;

/** @type {(() => void) | null} */
let syncRoadmapSpotPositions = null;

/** @type {{ scene: HTMLDivElement; img: HTMLImageElement; markers: HTMLDivElement } | null} */
let roadmapMapShell = null;

/** @type {{ el: HTMLDivElement; spot: { level: number; x: number; y: number } }[] | null} */
let roadmapSpotAnchors = null;

/** @param {HTMLElement} scene @param {{ el: HTMLElement; spot: { x: number; y: number } }[]} spotAnchors */
function applyRoadmapSpotPositions(scene, spotAnchors) {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  if (!width || !height) return;

  for (const { el, spot } of spotAnchors) {
    el.style.left = `${(spot.x / ROADMAP_MAP_SIZE.w) * width}px`;
    el.style.top = `${(spot.y / ROADMAP_MAP_SIZE.h) * height}px`;
  }
}

function ensureRoadmapMapShell() {
  if (roadmapMapShell || !roadmapMapEl) return roadmapMapShell;

  const scene = document.createElement("div");
  scene.className = "adventure-scene adventure-scene--cosmic";

  const backdrop = document.createElement("div");
  backdrop.className = "adventure-scene__backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  const img = document.createElement("img");
  img.className = "adventure-scene__backdrop-img";
  img.src = roadmapMapArt;
  img.alt = "";
  img.width = ROADMAP_MAP_SIZE.w;
  img.height = ROADMAP_MAP_SIZE.h;
  img.decoding = "async";
  img.fetchPriority = "high";
  if (!img.complete) scene.classList.add("adventure-scene--loading");
  img.addEventListener(
    "load",
    () => {
      scene.classList.remove("adventure-scene--loading");
      queueRoadmapSpotRelayout();
    },
    { once: true },
  );

  const markers = document.createElement("div");
  markers.className = "adventure-scene__markers";

  backdrop.append(img, markers);
  scene.append(backdrop);
  roadmapMapEl.append(scene);

  const relayout = () => {
    if (roadmapSpotAnchors) applyRoadmapSpotPositions(scene, roadmapSpotAnchors);
  };
  syncRoadmapSpotPositions = relayout;

  if (typeof ResizeObserver !== "undefined") {
    let lastW = 0;
    let lastH = 0;
    /** @type {number | null} */
    let resizeRaf = null;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (Math.abs(width - lastW) < 2 && Math.abs(height - lastH) < 2) return;
      lastW = width;
      lastH = height;
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        relayout();
      });
    });
    ro.observe(roadmapMapEl);
  }

  roadmapMapShell = { scene, img, markers };
  return roadmapMapShell;
}

function queueRoadmapSpotRelayout() {
  const run = () => syncRoadmapSpotPositions?.();
  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });
  window.setTimeout(run, 0);
  window.setTimeout(run, 80);
  window.setTimeout(run, 240);
}

function closeSettingsMenu() {
  const menu = document.querySelector("#settingsMenu");
  const btn = document.querySelector("#settingsMenuBtn");
  if (menu instanceof HTMLElement) menu.hidden = true;
  if (btn instanceof HTMLButtonElement) btn.setAttribute("aria-expanded", "false");
}

function syncRoadmapDevBtn() {
  if (!roadmapDevCompleteBtn) return;
  roadmapDevCompleteBtn.hidden = !isDevTesterSession();
}

function isAlbumAdminTester() {
  return isDevTesterSession();
}

function syncAlbumAdminControls() {
  if (!roadmapAlbumGrantAllBtn) return;
  const show = isAlbumAdminTester() && albumView === "detail";
  roadmapAlbumGrantAllBtn.hidden = !show;
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
  if (!albumDialog?.open) return null;
  return albumPanel;
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

function showAlbumPicker() {
  albumView = "picker";
  selectedAlbumWeek = null;
  if (roadmapAlbumPickerEl) roadmapAlbumPickerEl.hidden = false;
  if (roadmapAlbumDetailEl) roadmapAlbumDetailEl.hidden = true;
  syncAlbumAdminControls();
  renderAlbumPicker();
}

function openAlbumDetail(weekId) {
  albumView = "detail";
  selectedAlbumWeek = weekId;
  if (roadmapAlbumPickerEl) roadmapAlbumPickerEl.hidden = true;
  if (roadmapAlbumDetailEl) roadmapAlbumDetailEl.hidden = false;
  if (isDevTesterSession() && deps) {
    ensureDevAlbumTrayStickers(deps.getCurrentUserSlug(), weekId);
  }
  renderAlbumDetail();
  syncAlbumAdminControls();
}

function ensureAlbumDragLayer() {
  if (!albumDialog) return null;
  if (!roadmapDragLayer) {
    roadmapDragLayer = document.createElement("div");
    roadmapDragLayer.className = "roadmap-drag-layer";
    roadmapDragLayer.setAttribute("aria-hidden", "true");
    albumDialog.append(roadmapDragLayer);
  }
  return roadmapDragLayer;
}

export function initRoadmapUi(d) {
  deps = d;
  ensureAlbumDragLayer();
  preloadRoadmapMapArt().finally(() => ensureRoadmapMapShell());

  quickNavAdventureBtn?.addEventListener("click", () => openRoadmapDialog());
  quickNavAlbumBtn?.addEventListener("click", () => openRoadmapAlbum());
  roadmapCloseBtn?.addEventListener("click", closeRoadmapDialog);
  albumCloseBtn?.addEventListener("click", closeAlbumDialog);
  roadmapDialog?.addEventListener("click", (e) => {
    if (e.target === roadmapDialog) closeRoadmapDialog();
  });
  albumDialog?.addEventListener("click", (e) => {
    if (e.target === albumDialog) closeAlbumDialog();
  });
  roadmapDialog?.addEventListener("toggle", () => {
    if (roadmapDialog.open) queueRoadmapSpotRelayout();
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

  roadmapAlbumGrantAllBtn?.addEventListener("click", () => {
    const slug = deps?.getCurrentUserSlug() ?? null;
    if (!slug || !selectedAlbumWeek || !isAlbumAdminTester()) return;
    grantAllMissingAlbumStickers(slug, selectedAlbumWeek);
    renderAlbumDetail();
    refreshRoadmapProgressPill();
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

  albumCompleteCloseBtn?.addEventListener("click", () => albumCompleteDialog?.close());
  albumCompleteDialog?.addEventListener("click", (e) => {
    if (e.target === albumCompleteDialog) albumCompleteDialog.close();
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
  albumDialog?.classList.remove("is-dragging-sticker");
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
  albumDialog?.classList.remove("is-dragging-sticker");
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
  if (albumTitleEl) albumTitleEl.textContent = t("roadmapAlbumTitle");
  if (albumSubtitleEl) albumSubtitleEl.textContent = t("roadmapSubtitle");
  if (roadmapCloseBtn) roadmapCloseBtn.textContent = t("roadmapClose");
  if (albumCloseBtn) albumCloseBtn.textContent = t("roadmapClose");
  syncRoadmapStartButton();
  if (roadmapRewardCloseBtn) roadmapRewardCloseBtn.textContent = t("roadmapClose");
  if (roadmapDevCompleteBtn) roadmapDevCompleteBtn.textContent = t("roadmapDevComplete");
  syncRoadmapDevBtn();
  if (roadmapAlbumBackBtn) roadmapAlbumBackBtn.textContent = t("roadmapAlbumBack");
  if (roadmapAlbumGrantAllBtn) roadmapAlbumGrantAllBtn.textContent = t("roadmapAlbumGrantAll");
  if (albumCompleteTitleEl) albumCompleteTitleEl.textContent = t("roadmapAlbumCompleteTitle");
  if (albumCompleteCloseBtn) albumCompleteCloseBtn.textContent = t("roadmapAlbumCompleteClose");
  renderLevelPopover();
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

/** @param {number} level */
function getLevelZone(level) {
  if (level <= 11) return "nebula";
  if (level <= 23) return "comet";
  if (level <= 35) return "planet";
  if (level <= 47) return "galaxy";
  if (level <= 59) return "aurora";
  return "summit";
}

/**
 * @param {number} currentLevel
 * @param {number} visibleMin
 * @param {number} visibleMax
 */
function createStarTrailSvg(currentLevel, visibleMin, visibleMax) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "cosmic-trail");
  svg.setAttribute("viewBox", `0 0 ${ROADMAP_MAP_SIZE.w} ${ROADMAP_MAP_SIZE.h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const fullPath = buildSvgPathFromVertices(ROADMAP_PATH_VERTICES);
  const visibleCount = Math.max(1, visibleMax - visibleMin + 1);
  const progressIndex = Math.max(0, Math.min(visibleCount - 1, currentLevel - visibleMin));
  const progressFrac = visibleCount <= 1 ? 1 : progressIndex / (visibleCount - 1);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="trailGlow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ff9f1c"/>
      <stop offset="45%" stop-color="#7b5cff"/>
      <stop offset="100%" stop-color="#5edfff"/>
    </linearGradient>
    <filter id="trailBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;
  svg.append(defs);

  const track = document.createElementNS("http://www.w3.org/2000/svg", "path");
  track.setAttribute("class", "cosmic-trail__track");
  track.setAttribute("d", fullPath);
  svg.append(track);

  const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  glow.setAttribute("class", "cosmic-trail__glow");
  glow.setAttribute("d", fullPath);
  glow.setAttribute("filter", "url(#trailBlur)");
  svg.append(glow);

  const fill = document.createElementNS("http://www.w3.org/2000/svg", "path");
  fill.setAttribute("class", "cosmic-trail__fill");
  fill.setAttribute("d", fullPath);
  fill.setAttribute("pathLength", "1");
  fill.style.strokeDasharray = "1";
  fill.style.strokeDashoffset = String(1 - progressFrac);
  svg.append(fill);

  return svg;
}

function scrollToCurrentLevel() {
  /* Map fits on screen — no scroll needed. */
}

/**
 * @param {import("./roadmap.js").RoadmapLevel} challenge
 * @param {{ isDone: boolean; isCurrent: boolean; isLocked: boolean; progress: number; target: number; showAvatar: boolean; avatarId: string }} meta
 */
function createLevelNode(challenge, meta) {
  const { t } = /** @type {RoadmapUiDeps} */ (deps);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "adventure-node adventure-node--star";
  btn.dataset.level = String(challenge.level);
  btn.dataset.zone = getLevelZone(challenge.level);
  if (meta.isDone) btn.classList.add("adventure-node--done");
  if (meta.isCurrent) btn.classList.add("adventure-node--current");
  if (meta.isLocked) btn.classList.add("adventure-node--locked");
  if (selectedLevel === challenge.level) btn.classList.add("adventure-node--selected");

  btn.setAttribute("aria-label", t("roadmapLevelLabel", { level: String(challenge.level) }));

  const halo = document.createElement("span");
  halo.className = "adventure-node__halo adventure-node__halo--star";
  halo.setAttribute("aria-hidden", "true");
  btn.append(halo);

  const glow = document.createElement("span");
  glow.className = "adventure-node__glow";
  glow.setAttribute("aria-hidden", "true");
  btn.append(glow);

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
    userPickedLevel = true;
    selectedLevel = challenge.level;
    renderLevelPopover();
    renderRoadmapMap();
  });

  return btn;
}

function renderLevelPopover() {
  if (!deps || !roadmapLevelPopover) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const { state } = summary;
  const level = userPickedLevel ? (selectedLevel ?? state.currentLevel) : state.currentLevel;
  if (!userPickedLevel) selectedLevel = state.currentLevel;

  roadmapLevelPopover.hidden = false;
  roadmapLevelPopover.replaceChildren();

  const challenge = getLevelChallenge(level);
  const isCurrent = state.currentLevel === level;
  const isDone = state.completedLevels.includes(level);
  const isLocked = !isCurrent && !isDone;

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
  const shell = ensureRoadmapMapShell();
  if (!shell) return;

  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const { state } = summary;
  const { start: visibleMin, end: visibleMax } = getVisibleLevelRange(slug);
  const avatarId = getAvatarId(slug);

  shell.markers.replaceChildren();

  /** @type {{ el: HTMLDivElement; spot: { level: number; x: number; y: number } }[]} */
  const spotAnchors = [];
  /** @type {number[]} */
  const visibleLevels = [];
  for (let level = visibleMin; level <= visibleMax; level++) visibleLevels.push(level);
  const displayPositions = getRoadmapDisplayPositionsForLevels(visibleLevels);

  for (const spot of LEVEL_SPOTS) {
    if (spot.level < visibleMin || spot.level > visibleMax) continue;

    const displayPos = displayPositions.get(spot.level) ?? spot;
    const challenge = getLevelChallenge(spot.level);
    const isDone = state.completedLevels.includes(spot.level);
    const isCurrent = state.currentLevel === spot.level;
    const isLocked = !isDone && !isCurrent;

    const anchor = document.createElement("div");
    anchor.className = "adventure-spot";
    anchor.dataset.level = String(spot.level);
    anchor.style.setProperty("--spot-x", String(displayPos.x));
    anchor.style.setProperty("--spot-y", String(displayPos.y));
    anchor.append(
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
    spotAnchors.push({ el: anchor, spot: { ...spot, x: displayPos.x, y: displayPos.y } });
    shell.markers.append(anchor);
  }

  roadmapSpotAnchors = spotAnchors;
  syncRoadmapSpotPositions?.();
  scrollToCurrentLevel();
  renderLevelPopover();
}

function renderAlbumPicker() {
  if (!deps || !roadmapAlbumPickerEl) return;
  const slug = deps.getCurrentUserSlug();
  const summary = getRoadmapSummary(slug);
  const currentPeriod = getAlbumPeriodId();
  const latestReleased = getLatestReleasedAlbumPeriodId(currentPeriod);
  const weeks = listSelectableAlbumWeeks(
    summary.state.placedStickers,
    summary.state.pendingStickers,
    currentPeriod,
    { devPreview: isDevTesterSession() },
  );

  roadmapAlbumPickerEl.replaceChildren();

  const heading = document.createElement("h3");
  heading.className = "album-picker__heading";
  heading.textContent = deps.t("roadmapAlbumPick");
  roadmapAlbumPickerEl.append(heading);

  const grid = document.createElement("div");
  grid.className = "album-picker__grid";

  for (const periodId of weeks) {
    if (getAlbumSlotCount(periodId) <= 0) continue;

    const placed = countAlbumPlaced(summary.state.placedStickers, periodId);
    const pending = summary.state.pendingStickers.filter((p) => p.albumWeek === periodId).length;
    const done = isAlbumComplete(summary.state.placedStickers, periodId);
    const themeName = deps.t(getAlbumThemeKey(periodId));
    const category = getAlbumDominantCategory(periodId);

    const card = document.createElement("button");
    card.type = "button";
    card.className = `album-picker__card album-picker__card--${category}`;
    if (periodId === latestReleased) card.classList.add("album-picker__card--current");
    if (done) card.classList.add("album-picker__card--complete");

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
    if (done) {
      stats.textContent = deps.t("roadmapAlbumDone");
    } else {
      stats.textContent = deps.t("roadmapAlbumCount", {
        placed: String(placed),
        total: String(getAlbumSlotCount(periodId)),
      });
      if (pending > 0) {
        stats.textContent += ` · ${deps.t("roadmapAlbumPending", { count: String(pending) })}`;
      }
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
    const dragLayer = ensureAlbumDragLayer() ?? albumDialog ?? document.body;
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
    albumDialog?.classList.add("is-dragging-sticker");
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
    const done = isAlbumComplete(summary.state.placedStickers, weekId);
    const isCurrent = weekId === getAlbumPeriodId();
    if (done) {
      const days = String(getDaysUntilNextAlbumPeriod());
      const nextKey = isCurrent ? "roadmapAlbumCompleteNext" : "roadmapAlbumCompletePast";
      roadmapAlbumDetailHintEl.textContent = deps.t(nextKey, { days });
    } else {
      roadmapAlbumDetailHintEl.textContent = deps.t("roadmapAlbumDragHint");
    }
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

  syncAlbumAdminControls();
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
    if (isDevTesterSession()) {
      ensureDevAlbumTrayStickers(slug, weekId);
    }
    renderAlbumDetail();
    refreshRoadmapProgressPill();
    const summary = getRoadmapSummary(slug);
    if (isAlbumComplete(summary.state.placedStickers, weekId)) {
      showAlbumComplete(weekId, weekId === getAlbumPeriodId());
    }
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
  refreshRoadmapProgressPill();
  syncRoadmapStartButton();
}

export function renderAlbumDialog() {
  renderAlbumView();
}

export function openRoadmapDialog() {
  refreshRoadmapLabels();
  const slug = deps?.getCurrentUserSlug();
  userPickedLevel = false;
  selectedLevel = slug ? getRoadmapSummary(slug).state.currentLevel : null;
  roadmapDialog?.showModal();
  renderRoadmapDialog();
  queueRoadmapSpotRelayout();
}

export function openRoadmapAlbum() {
  refreshRoadmapLabels();
  selectedLevel = null;
  userPickedLevel = false;
  albumView = "picker";
  selectedAlbumWeek = null;
  showAlbumPicker();
  albumDialog?.showModal();
  renderAlbumDialog();
}

export function closeRoadmapDialog() {
  selectedLevel = null;
  userPickedLevel = false;
  if (roadmapLevelPopover) roadmapLevelPopover.hidden = true;
  roadmapDialog?.close();
}

export function closeAlbumDialog() {
  cancelActiveDrag();
  albumView = "picker";
  selectedAlbumWeek = null;
  albumDialog?.close();
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

  const slug = deps.getCurrentUserSlug();
  if (slug) {
    userPickedLevel = false;
    selectedLevel = result.nextLevel ?? getRoadmapSummary(slug).state.currentLevel;
  }

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
    openRoadmapAlbum();
    openAlbumDetail(week);
  }
}

/**
 * @param {string} weekId
 * @param {boolean} isCurrentPeriod
 */
function showAlbumComplete(weekId, isCurrentPeriod) {
  if (!deps || !albumCompleteDialog || !albumCompleteBodyEl) return;

  try {
    celebrateWin();
  } catch (e) {
    console.warn("[roadmap-ui] album complete celebrate:", e);
  }

  const themeName = deps.t(getAlbumThemeKey(weekId));
  const days = String(getDaysUntilNextAlbumPeriod());
  const nextKey = isCurrentPeriod ? "roadmapAlbumCompleteNext" : "roadmapAlbumCompletePast";
  albumCompleteBodyEl.textContent = `${deps.t("roadmapAlbumCompleteBody", { album: themeName })} ${deps.t(nextKey, { days })}`;
  albumCompleteDialog.showModal();
}
