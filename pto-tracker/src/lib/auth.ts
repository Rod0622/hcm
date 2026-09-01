/* Accounts are username + password. Supabase Auth requires an email, so we
   store username@<AUTH_EMAIL_DOMAIN> — never a real mailbox. Password resets
   therefore happen through the admin (Supabase dashboard), not email. */

export const AUTH_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN ?? "pto.internal";

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}
