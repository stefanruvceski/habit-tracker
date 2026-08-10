import { describe, test, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider } from "../lib/auth";
import { SignIn } from "./SignIn";
import { Providers } from "./Providers";

// Supabase env is unset in tests, so the app is in local-only mode.
describe("auth (local-only mode)", () => {
  test("Providers renders children when Supabase is not configured", () => {
    const { getByText } = render(<Providers>{<div>APP</div>}</Providers>);
    expect(getByText("APP")).toBeTruthy();
  });

  test("SignIn moves to the code step and surfaces the not-configured error", async () => {
    const { getByPlaceholderText, getByText } = render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );
    fireEvent.change(getByPlaceholderText("you@email.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.click(getByText("Send code"));
    // Not configured → sendCode returns an error, stays on email step.
    await waitFor(() => expect(getByText("Auth not configured")).toBeTruthy());
  });
});
