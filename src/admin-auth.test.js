import { describe, expect, it } from "vitest";
import { normalizeAdminPassword } from "./admin-auth.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

function sha256HexUtf8(text) {
  return bytesToHex(sha256(new TextEncoder().encode(text)));
}

describe("normalizeAdminPassword", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeAdminPassword("  secret  ")).toBe("secret");
  });

  it("normalizes Unicode to NFC", () => {
    const composed = "café";
    const decomposed = "café";
    expect(normalizeAdminPassword(decomposed)).toBe(normalizeAdminPassword(composed));
  });
});

describe("admin password hash", () => {
  it("uses the same noble SHA-256 path as unlock", async () => {
    const { ADMIN_PASSWORD_SHA256_HEX } = await import("./user-config.js");
    expect(ADMIN_PASSWORD_SHA256_HEX).toMatch(/^[0-9a-f]{64}$/i);
    expect(sha256HexUtf8("")).not.toBe(ADMIN_PASSWORD_SHA256_HEX.toLowerCase());
  });
});
