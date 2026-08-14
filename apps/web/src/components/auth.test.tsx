import { describe, test, expect } from "vitest";
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

  test("SignIn surfaces the not-configured error when requesting a link", async () => {
    const { getByPlaceholderText, getByText } = render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );
    fireEvent.change(getByPlaceholderText("you@email.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.click(getByText("Send sign-in link"));
    // Not configured → sendMagicLink returns an error, no "sent" confirmation.
    await waitFor(() => expect(getByText("Auth not configured")).toBeTruthy());
  });

  test("SignIn offers a guest option that doesn't crash when chosen", () => {
    const { getByText } = render(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );
    const guest = getByText("Continue as guest");
    expect(guest).toBeTruthy();
    fireEvent.click(guest);
  });
});
