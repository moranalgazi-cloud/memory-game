import { ADMIN_PASSWORD_SHA256_HEX } from "./user-config.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const SESSION_KEY = "memory-admin-unlocked-v1";

const expectedHex = ADMIN_PASSWORD_SHA256_HEX.trim().toLowerCase();

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
async function sha256HexUtf8(text) {
  const data = new TextEncoder().encode(text);
  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
    try {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(buf)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      /* e.g. non-secure context where subtle exists but digest rejects */
    }
  }
  /* LAN http://192.168… has no subtle — use pure JS (same digest as Node crypto for UTF-8). */
  return bytesToHex(sha256(data));
}

export function isAdminSessionUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/**
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function tryUnlockAdminSession(password) {
  let hex;
  try {
    hex = await sha256HexUtf8(String(password));
  } catch {
    return false;
  }
  if (hex === expectedHex) {
    sessionStorage.setItem(SESSION_KEY, "1");
    return true;
  }
  return false;
}

export function clearAdminSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
