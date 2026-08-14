/**
 * Up to two uppercase initials derived from an email, for account avatars.
 * Splits the local part on separators (`. _ - +`) and takes the first letter
 * of the first two chunks; with no separator it uses the first two letters.
 * Falls back to "?" when there's nothing usable.
 *
 * e.g. "ana.petrovic@x.com" → "AP", "stefanruvceski@x.com" → "ST".
 */
export function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[.\-_+]+/).filter(Boolean);
  let initials: string;
  if (parts.length >= 2) {
    initials = parts[0][0] + parts[1][0];
  } else {
    initials = (parts[0] ?? local).slice(0, 2);
  }
  return initials.toUpperCase() || "?";
}
