import { ensureAuthReady, getAuthUserId, signOutAuth } from "./auth.js";
import {
  deleteAllCloudPlayersForOwner,
  isCloudSyncEnabled,
  resetDeviceId,
} from "./cloud-sync.js";
import { clearAllLocalGameData } from "./user-store.js";

/**
 * Delete local game data and, when cloud sync is enabled, all cloud rows for the
 * current auth session. Signs out of Google when applicable.
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function deleteAllUserData() {
  let ownerId = getAuthUserId();
  if (isCloudSyncEnabled() && !ownerId) {
    ownerId = await ensureAuthReady();
  }

  if (isCloudSyncEnabled() && ownerId) {
    const cloud = await deleteAllCloudPlayersForOwner(ownerId);
    if (!cloud.ok && !cloud.skipped) {
      return { ok: false, error: cloud.error ?? "cloud_delete_failed" };
    }
  }

  clearAllLocalGameData();
  resetDeviceId();

  if (isCloudSyncEnabled()) {
    await signOutAuth();
  }

  return { ok: true };
}
