/**
 * ThemeToggle.test.tsx — interaction tests for the sidebar theme toggle.
 *
 * What:        Verifies the button flips to the opposite theme on click, in
 *              both directions (next-themes mocked).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const setTheme = vi.fn();
let currentTheme = "light";
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: currentTheme, setTheme }),
}));

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    currentTheme = "light";
  });

  it("switches to dark when the current theme is light", () => {
    currentTheme = "light";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches to light when the current theme is dark", () => {
    currentTheme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /switch to light mode/i }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
