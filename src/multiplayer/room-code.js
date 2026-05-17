/** @returns {string} Six-character room code (no ambiguous chars). */
export function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function normalizeRoomCode(raw) {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length >= 4 && code.length <= 8 ? code : null;
}

/** @param {string} roomCode */
export function buildInviteUrl(roomCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  url.hash = "";
  return url.toString();
}

/** @returns {string | null} */
export function roomCodeFromLocation() {
  return normalizeRoomCode(new URLSearchParams(window.location.search).get("room"));
}
