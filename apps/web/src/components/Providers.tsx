"use client";

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import { SignIn } from "./SignIn";

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
  const { configured, loading, session } = useAuth();

  if (!configured) return <>{children}</>; // local-only mode
  if (loading) {
    return (
      <div className="min-h-[80vh] grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }
  if (!session) return <SignIn />;
  return <>{children}</>;
}
