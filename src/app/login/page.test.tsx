/**
 * page.test.tsx (login) — the password field's show/hide toggle flips the
 * input type and its accessible label, so users can reveal what they typed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// The page is a client component that imports a server action + toast; stub
// both so the component renders in isolation (the toggle is pure UI).
vi.mock("@/actions/auth", () => ({ signIn: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import LoginPage from "./page";

describe("LoginPage password visibility toggle", () => {
  it("reveals and re-hides the password", () => {
    render(<LoginPage />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.type).toBe("password");
  });
});
