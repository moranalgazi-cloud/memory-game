import { hasAcceptedDisclaimer, setDisclaimerAccepted } from "./disclaimer.js";

/** @typedef {'view' | 'accept'} DisclaimerDialogMode */

/**
 * @typedef {Object} DisclaimerUiDeps
 * @property {(key: string, vars?: Record<string, string>) => string} t
 * @property {() => void} [onAccepted]
 * @property {() => void} [onGateChange]
 */

/** @type {DisclaimerUiDeps | null} */
let deps = null;

const disclaimerDialog = document.querySelector("#disclaimerDialog");
const disclaimerBody = document.querySelector("#disclaimerBody");
const disclaimerAcceptBlock = document.querySelector("#disclaimerAcceptBlock");
const disclaimerAcceptCheckbox = document.querySelector("#disclaimerAcceptCheckbox");
const disclaimerAcceptBtn = document.querySelector("#disclaimerAcceptBtn");
const disclaimerCloseBtn = document.querySelector("#disclaimerCloseBtn");
const openDisclaimerSettingsBtn = document.querySelector("#openDisclaimer");

/** @type {DisclaimerDialogMode} */
let dialogMode = "view";

/**
 * @param {DisclaimerUiDeps} d
 */
export function initDisclaimerUi(d) {
  deps = d;

  disclaimerAcceptCheckbox?.addEventListener("change", syncDisclaimerAcceptButton);
  disclaimerAcceptBtn?.addEventListener("click", () => void confirmDisclaimerAccept());
  disclaimerCloseBtn?.addEventListener("click", () => disclaimerDialog?.close());
  openDisclaimerSettingsBtn?.addEventListener("click", () => {
    closeSettingsMenuForDisclaimer();
    openDisclaimerDialog("view");
  });

  disclaimerDialog?.addEventListener("close", () => {
    if (disclaimerAcceptCheckbox instanceof HTMLInputElement) {
      disclaimerAcceptCheckbox.checked = hasAcceptedDisclaimer();
    }
    syncDisclaimerAcceptButton();
  });

  disclaimerDialog?.addEventListener("cancel", (e) => {
    if (dialogMode === "accept" && !hasAcceptedDisclaimer()) {
      e.preventDefault();
    }
  });
}

function closeSettingsMenuForDisclaimer() {
  const menu = document.querySelector("#settingsMenu");
  const btn = document.querySelector("#settingsMenuBtn");
  if (menu instanceof HTMLElement) menu.hidden = true;
  if (btn instanceof HTMLButtonElement) btn.setAttribute("aria-expanded", "false");
}

/**
 * @param {(key: string, vars?: Record<string, string>) => string} t
 * @param {HTMLElement} container
 */
function renderDisclaimerBody(t, container) {
  container.replaceChildren();

  const updated = document.createElement("p");
  updated.className = "disclaimer-dialog__updated";
  updated.textContent = t("disclaimerUpdated");
  container.append(updated);

  const intro = document.createElement("p");
  intro.className = "disclaimer-dialog__intro";
  intro.textContent = t("disclaimerIntro");
  container.append(intro);

  /** @type {[string, string][]} */
  const sections = [
    ["disclaimerSecWarrantyTitle", "disclaimerSecWarrantyBody"],
    ["disclaimerSecAvailabilityTitle", "disclaimerSecAvailabilityBody"],
    ["disclaimerSecLiabilityTitle", "disclaimerSecLiabilityBody"],
    ["disclaimerSecResponsibilityTitle", "disclaimerSecResponsibilityBody"],
    ["disclaimerSecThirdPartyTitle", "disclaimerSecThirdPartyBody"],
    ["disclaimerSecChangesTitle", "disclaimerSecChangesBody"],
    ["disclaimerSecContactTitle", "disclaimerSecContactBody"],
  ];

  for (const [titleKey, bodyKey] of sections) {
    const h = document.createElement("h3");
    h.className = "disclaimer-dialog__heading";
    h.textContent = t(titleKey);
    const body = document.createElement("div");
    body.className = "disclaimer-dialog__section-body";
    for (const line of t(bodyKey).split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("•")) {
        const li = document.createElement("p");
        li.className = "disclaimer-dialog__bullet";
        li.textContent = trimmed.replace(/^•\s*/, "");
        body.append(li);
      } else {
        const p = document.createElement("p");
        p.textContent = trimmed;
        body.append(p);
      }
    }
    container.append(h, body);
  }
}

function syncDisclaimerAcceptButton() {
  if (!(disclaimerAcceptBtn instanceof HTMLButtonElement)) return;
  const checked =
    disclaimerAcceptCheckbox instanceof HTMLInputElement && disclaimerAcceptCheckbox.checked;
  disclaimerAcceptBtn.disabled = !checked;
}

async function confirmDisclaimerAccept() {
  if (!(disclaimerAcceptCheckbox instanceof HTMLInputElement) || !disclaimerAcceptCheckbox.checked) {
    return;
  }
  if (!setDisclaimerAccepted()) return;
  deps?.onAccepted?.();
  deps?.onGateChange?.();
  disclaimerDialog?.close();
}

/**
 * @param {DisclaimerDialogMode} mode
 */
export function openDisclaimerDialog(mode = "view") {
  if (!disclaimerDialog || !deps || !disclaimerBody) return;
  dialogMode = mode;
  const t = deps.t;
  const accepted = hasAcceptedDisclaimer();
  const requireAccept = mode === "accept" || !accepted;

  renderDisclaimerBody(t, disclaimerBody);

  const title = document.querySelector("#disclaimerDialogTitle");
  if (title) title.textContent = t("disclaimerTitle");

  const label = document.querySelector("#disclaimerAcceptLabel");
  if (label) label.textContent = t("disclaimerAcceptLabel");

  if (disclaimerAcceptBtn) disclaimerAcceptBtn.textContent = t("disclaimerAcceptBtn");
  if (disclaimerCloseBtn) disclaimerCloseBtn.textContent = t("disclaimerCloseBtn");

  if (disclaimerAcceptBlock instanceof HTMLElement) {
    disclaimerAcceptBlock.hidden = !requireAccept;
  }
  if (disclaimerCloseBtn instanceof HTMLButtonElement) {
    disclaimerCloseBtn.classList.toggle("is-hidden", requireAccept && !accepted);
  }
  if (disclaimerAcceptCheckbox instanceof HTMLInputElement) {
    disclaimerAcceptCheckbox.checked = accepted;
  }
  syncDisclaimerAcceptButton();
  disclaimerDialog.showModal();
}

export function refreshDisclaimerLabels() {
  if (!deps) return;
  const t = deps.t;
  if (openDisclaimerSettingsBtn) {
    openDisclaimerSettingsBtn.textContent = t("disclaimerMenu");
  }
  const fromUser = document.querySelector("#openDisclaimerFromUser");
  if (fromUser) fromUser.textContent = t("disclaimerReadBtn");
  const hint = document.querySelector("#disclaimerRequiredHint");
  if (hint) hint.textContent = t("disclaimerRequiredHint");
}

export { hasAcceptedDisclaimer };
