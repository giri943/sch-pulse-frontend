/** The only email domain Schbang Pulse accepts for accounts (matches the backend). */
export const ALLOWED_EMAIL_DOMAIN = "schbang.com";

const SCHBANG_EMAIL = new RegExp(`^[^\\s@]+@${ALLOWED_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i");

/** True only for a well-formed @schbang.com address. */
export function isSchbangEmail(email: string): boolean {
  return SCHBANG_EMAIL.test(email.trim());
}

export const EMAIL_DOMAIN_ERROR = `Use your @${ALLOWED_EMAIL_DOMAIN} email address.`;
