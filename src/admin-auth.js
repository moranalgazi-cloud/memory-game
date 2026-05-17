import { ADMIN_PASSWORD_SHA256_HEX } from "./user-config.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const SESSION_KEY = "memory-admin-unlocked-v1";

const expectedHex = ADMIN_PASSWORD_SHA256_HEX.trim().toLowerCase();

/**
 * @param {string} password
 * @returns {string}
 */
export function normalizeAdminPassword(password) {
  return String(password).normalize("NFC").trim();
}

/**
 * @param {string} text
 * @returns {string}
 */
function sha256HexUtf8(text) {
  const data = new TextEncoder().encode(text);
  /* Single path everywhere (desktop, phone, http LAN) — avoids subtle vs fallback mismatches. */
  return bytesToHex(sha256(data));
}

export function isAdminSessionUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function tryUnlockAdminSession(password) {
  if (expectedHex.length !== 64) {
    console.warn("[admin-auth] ADMIN_PASSWORD_SHA256_HEX is not configured");
    return false;
  }
  try {
    const normalized = normalizeAdminPassword(password);
    if (!normalized.length) return false;
    const hex = sha256HexUtf8(normalized);
    if (hex === expectedHex) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* unlocked for this page load even if storage is blocked */
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
