/**
 * Magic-link sign-in on the phone.
 *
 * The email link goes to Supabase, which redirects to the static page
 * `/app-auth.html` on the web app (same host as the Supabase Site URL, so it's
 * allowed without extra dashboard setup). That page forwards the tokens into
 * this app as `streakli://auth?access_token=…&refresh_token=…`.
 */

/** Where Supabase sends the user after they tap the email link. */
export const AUTH_REDIRECT_URL = "https://streakli.vercel.app/app-auth.html";

export type AuthLinkResult =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "error"; message: string }
  | { kind: "none" };

/** Parse a deep link; returns tokens, an error, or "none" for unrelated URLs. */
export function parseAuthLink(url: string | null | undefined): AuthLinkResult {
  if (!url || !/^streakli:\/\/auth/i.test(url)) return { kind: "none" };
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  const parts = [
    q >= 0 ? url.slice(q + 1, h > q ? h : undefined) : "",
    h >= 0 ? url.slice(h + 1) : "",
  ].join("&");
  const params = new URLSearchParams(parts);
  const error = params.get("error_description") || params.get("error");
  if (error) return { kind: "error", message: error.replace(/\+/g, " ") };
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };
  return { kind: "none" };
}
