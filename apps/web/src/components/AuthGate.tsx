"use client";

import { ReactNode, useState } from "react";
import { useAuth } from "../lib/auth";
import { NavBar } from "./NavBar";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }

  if (status === "signedOut") {
    return <SignIn />;
  }

  return (
    <>
      {status === "unconfigured" && <LocalOnlyBanner />}
      <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-5 pb-28 pt-4">
        {children}
      </div>
      <NavBar />
    </>
  );
}

function SignIn() {
  const { sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await sendCode(email);
    setBusy(false);
    if (error) setError(error);
    else setStep("code");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await verifyCode(email, code);
    setBusy(false);
    if (error) setError(error);
  }

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-2xl font-bold mb-1">Habit Tracker</h1>
        <p className="text-text-dim text-sm mb-6">
          {step === "email"
            ? "Sign in with your email to sync your habits across devices."
            : `Enter the 6-digit code we sent to ${email}.`}
        </p>

        {step === "email" ? (
          <form onSubmit={submitEmail} className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-bg-elev border border-border rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-accent text-bg font-semibold py-3 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full bg-bg-elev border border-border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-accent text-bg font-semibold py-3 disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="text-sm text-accent"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && <p className="text-sm text-danger mt-3">{error}</p>}

        <p className="text-xs text-text-faint mt-6">
          No password needed — you&apos;ll get a one-time code by email.
        </p>
      </div>
    </div>
  );
}

function LocalOnlyBanner() {
  return (
    <div className="bg-amber-500/15 text-amber-200 text-xs text-center px-3 py-1.5 border-b border-amber-500/20">
      Cloud sync not configured — running in local-only mode. See{" "}
      <span className="font-medium">README</span> to connect Supabase.
    </div>
  );
}
