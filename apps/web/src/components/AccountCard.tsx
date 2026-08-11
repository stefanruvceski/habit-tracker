"use client";

import { useAuth } from "../lib/auth";
import { Card } from "./ui";

/**
 * Shows the signed-in email + sign out, or (in guest mode) an invitation to
 * sign in and enable sync. Renders nothing in local-only mode.
 */
export function AccountCard() {
  const { configured, session, email, guest, signOut, exitGuest } = useAuth();
  if (!configured) return null;

  if (session) {
    return (
      <Card className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-text-faint">
            Account
          </div>
          <div className="text-sm truncate">{email}</div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm font-medium rounded-lg bg-bg-elev-2 border border-border px-3 py-1.5"
        >
          Sign out
        </button>
      </Card>
    );
  }

  if (guest) {
    return (
      <Card className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-text-faint">
            Account
          </div>
          <div className="text-sm truncate">Guest · saved on this device</div>
        </div>
        <button
          onClick={() => exitGuest()}
          className="text-sm font-medium rounded-lg bg-accent text-bg px-3 py-1.5"
        >
          Sign in to sync
        </button>
      </Card>
    );
  }

  return null;
}
