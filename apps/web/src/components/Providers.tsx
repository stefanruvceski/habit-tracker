"use client";

import { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";
import { AuthGate } from "./AuthGate";
// Import for side effect: registers the store with the sync layer so the
// cloud pull on sign-in can read/replace state.
import "../lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
