import { deleteAllUserData } from "./user-data-delete.js";

/**
 * @typedef {Object} DeleteDataUiDeps
 * @property {(key: string, vars?: Record<string, string>) => string} t
 */

/** @type {DeleteDataUiDeps | null} */
let deps = null;

const openDeleteDataBtn = document.querySelector("#openDeleteData");
const deleteDataDialog = document.querySelector("#deleteDataDialog");
const deleteDataTitle = document.querySelector("#deleteDataTitle");
const deleteDataBody = document.querySelector("#deleteDataBody");
const deleteDataConfirmBtn = document.querySelector("#deleteDataConfirmBtn");
const deleteDataCancelBtn = document.querySelector("#deleteDataCancelBtn");
const deleteDataError = document.querySelector("#deleteDataError");

let deleting = false;

/**
 * @param {DeleteDataUiDeps} d
 */
export function initDeleteDataUi(d) {
  deps = d;

  openDeleteDataBtn?.addEventListener("click", () => {
    closeSettingsMenu();
    openDeleteDataDialog();
  });

  deleteDataCancelBtn?.addEventListener("click", () => deleteDataDialog?.close());
  deleteDataConfirmBtn?.addEventListener("click", () => void confirmDeleteData());
  deleteDataDialog?.addEventListener("close", () => {
    if (deleteDataError instanceof HTMLElement) {
      deleteDataError.textContent = "";
      deleteDataError.classList.add("is-hidden");
    }
    setDeleting(false);
  });
}

function closeSettingsMenu() {
  const menu = document.querySelector("#settingsMenu");
  const btn = document.querySelector("#settingsMenuBtn");
  if (menu instanceof HTMLElement) menu.hidden = true;
  if (btn instanceof HTMLButtonElement) btn.setAttribute("aria-expanded", "false");
}

function setDeleting(active) {
  deleting = active;
  if (deleteDataConfirmBtn instanceof HTMLButtonElement) {
    deleteDataConfirmBtn.disabled = active;
    deleteDataConfirmBtn.textContent = deps?.t(active ? "deleteDataDeleting" : "deleteDataConfirm") ?? "";
  }
  if (deleteDataCancelBtn instanceof HTMLButtonElement) {
    deleteDataCancelBtn.disabled = active;
  }
}

function openDeleteDataDialog() {
  if (!deleteDataDialog || !deps) return;
  if (deleteDataTitle) deleteDataTitle.textContent = deps.t("deleteDataTitle");
  if (deleteDataBody) deleteDataBody.textContent = deps.t("deleteDataBody");
  if (deleteDataConfirmBtn) deleteDataConfirmBtn.textContent = deps.t("deleteDataConfirm");
  if (deleteDataCancelBtn) deleteDataCancelBtn.textContent = deps.t("deleteDataCancel");
  if (deleteDataError instanceof HTMLElement) {
    deleteDataError.textContent = "";
    deleteDataError.classList.add("is-hidden");
  }
  setDeleting(false);
  deleteDataDialog.showModal();
}

async function confirmDeleteData() {
  if (!deps || deleting) return;
  setDeleting(true);
  if (deleteDataError instanceof HTMLElement) {
    deleteDataError.textContent = "";
    deleteDataError.classList.add("is-hidden");
  }

  const result = await deleteAllUserData();
  if (!result.ok) {
    if (deleteDataError instanceof HTMLElement) {
      deleteDataError.textContent = deps.t("deleteDataFailed");
      deleteDataError.classList.remove("is-hidden");
    }
    setDeleting(false);
    return;
  }

  deleteDataDialog?.close();
  window.location.reload();
}

export function refreshDeleteDataLabels() {
  if (!deps || !openDeleteDataBtn) return;
  openDeleteDataBtn.textContent = deps.t("deleteDataMenu");
}
