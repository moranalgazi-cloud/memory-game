/** Public support inbox shown in About / Contact us. */
export const SUPPORT_EMAIL = "moranalgazi@gmail.com";

/**
 * Only these **display names** may open Admin (case-insensitive).
 * Unlock uses a password hash — see `ADMIN_PASSWORD_SHA256_HEX` below.
 */
export const ADMIN_USERNAMES = new Set(["moranal2589"]);

/**
 * SHA-256 (UTF-8 bytes of the password), lowercase hex, 64 chars.
 * The plain password is not stored in source. To change it, run in a terminal:
 *   node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PIN','utf8').digest('hex'))"
 * and paste the result here. (Client-only apps cannot hide secrets from a determined attacker.)
 */
export const ADMIN_PASSWORD_SHA256_HEX =
  "3f3523ac168330e6b429b23d2b25b6c6d7efaf564c1a9f1feaf5398d2bb45318";
