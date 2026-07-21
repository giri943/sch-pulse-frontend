/** The org email domain Schbang Pulse accepts for accounts (matches the backend). */
export const ALLOWED_EMAIL_DOMAIN = "schbang.com";

/** True for a well-formed address on the given org domain. */
export function isAllowedEmail(email: string, domain = ALLOWED_EMAIL_DOMAIN): boolean {
  return new RegExp(`^[^\\s@]+@${domain.replace(/\./g, "\\.")}$`, "i").test(email.trim());
}

/** Inline error shown when an off-domain email is entered (prod only). */
export const emailDomainError = (domain = ALLOWED_EMAIL_DOMAIN): string => `Use your @${domain} email address.`;
