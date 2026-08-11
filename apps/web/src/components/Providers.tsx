"use client";

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import { SignIn } from "./SignIn";
import { CloudSync } from "./CloudSync";

/**
 * Wraps the app in the auth provider. When Supabase is configured, it gates the
 * app behind sign-in; otherwise it renders the app as-is (local-only).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, session, guest } = useAuth();

  if (!configured) return <>{children}</>; // local-only mode
  if (loading) {
    return (
      <div className="min-h-[80vh] grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }
  if (session) {
    return (
      <>
        <CloudSync userId={session.user.id} />
        {children}
      </>
    );
  }
  // Guest: local-only, saved on this device, no cloud sync.
  if (guest) return <>{children}</>;
  return <SignIn />;
}
