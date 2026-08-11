"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Card } from "./ui";

/** Email → 6-digit code sign-in (registers on first use). */
export function SignIn() {
  const { sendCode, verifyCode, continueAsGuest } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await sendCode(email);
    setBusy(false);
    if (error) setError(error);
    else setStep("code");
  }

  async function submitCode() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await verifyCode(email, code);
    setBusy(false);
    if (error) setError(error);
    // On success, the auth listener swaps this screen for the app.
  }

  return (
    <div className="min-h-[80vh] grid place-items-center px-4">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🌱</div>
          <h1 className="text-xl font-bold">Habit Tracker</h1>
          <p className="text-sm text-text-dim mt-1">
            {step === "email"
              ? "Sign in with your email — we'll send a code."
              : `Enter the code we sent to ${email}.`}
          </p>
        </div>

        {step === "email" ? (
          <div className="space-y-3">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitEmail()}
              placeholder="you@email.com"
              className="w-full bg-bg-elev-2 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={submitEmail}
              disabled={busy || !email.trim()}
              className="w-full rounded-xl bg-accent text-bg font-semibold py-2.5 disabled:opacity-40"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && submitCode()}
              placeholder="123456"
              className="w-full text-center tracking-[0.5em] text-lg bg-bg-elev-2 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={submitCode}
              disabled={busy || code.length < 6}
              className="w-full rounded-xl bg-accent text-bg font-semibold py-2.5 disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-sm text-text-faint py-1"
            >
              ‹ Use a different email
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
