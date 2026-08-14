"use client";

import { useEffect, useRef, useState } from "react";
import { initialsFromEmail } from "@habit/core";
import { useAuth } from "../lib/auth";

/**
 * Account entry for the bottom nav: an initials avatar + "Account" label that
 * opens an upward popover (email + Sign out; guests get Sign in to sync).
 * Renders nothing in local-only mode or on the sign-in screen.
 */
export function AccountMenu() {
  const { configured, session, email, guest, signOut, exitGuest } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!configured) return null;
  if (!session && !guest) return null;

  const isGuest = !session;
  const label = isGuest ? "?" : initialsFromEmail(email);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        className={`w-full flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
          open ? "text-accent" : "text-text-faint"
        }`}
      >
        <span
          className={`grid place-items-center w-[22px] h-[22px] rounded-full text-[10px] font-bold ${
            isGuest
              ? "bg-bg-elev-2 text-text-dim border border-border"
              : "bg-accent text-bg"
          }`}
        >
          {label}
        </span>
        Account
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-2 w-56 rounded-xl border border-border bg-bg-elev shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[11px] uppercase tracking-wide text-text-faint">
              {isGuest ? "Guest" : "Signed in"}
            </div>
            <div className="text-sm truncate mt-0.5">
              {isGuest ? "Saved on this device" : email}
            </div>
          </div>
          {isGuest ? (
            <button
              onClick={() => {
                exitGuest();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-accent hover:bg-bg-elev-2"
            >
              Sign in to sync
            </button>
          ) : (
            <button
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-bg-elev-2"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
