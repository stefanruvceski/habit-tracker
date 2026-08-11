"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Card } from "./ui";

/** Email → magic sign-in link (registers on first use). */
export function SignIn() {
  const { sendMagicLink, continueAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await sendMagicLink(email);
    setBusy(false);
    if (error) setError(error);
    else setSent(true);
  }

  return (
    <div className="min-h-[80vh] grid place-items-center px-4">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🌱</div>
          <h1 className="text-xl font-bold">Habit Tracker</h1>
          <p className="text-sm text-text-dim mt-1">
            {sent
              ? `We sent a sign-in link to ${email}. Open it on this device to sign in.`
              : "Sign in with your email — we'll send you a link."}
          </p>
        </div>

        {sent ? (
          <button
            onClick={() => {
              setSent(false);
              setError(null);
            }}
            className="w-full text-sm text-text-faint py-1"
          >
            ‹ Use a different email
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@email.com"
              className="w-full bg-bg-elev-2 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={submit}
              disabled={busy || !email.trim()}
              className="w-full rounded-xl bg-accent text-bg font-semibold py-2.5 disabled:opacity-40"
            >
              {busy ? "Sending…" : "Send sign-in link"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-400 mt-3 text-center">{error}</p>}

        <div className="mt-5 pt-4 border-t border-border">
          <button
            onClick={continueAsGuest}
            className="w-full text-sm text-text-dim py-1.5 hover:text-text transition-colors"
          >
            Continue as guest
          </button>
          <p className="text-[11px] text-text-faint text-center mt-1">
            No sign-in — saved on this device only.
          </p>
        </div>
      </Card>
    </div>
  );
}
