/**
 * MoneyInput.test.tsx — the field tracks external value changes without
 * clobbering in-progress typing.
 */
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoneyInput } from "./MoneyInput";

describe("MoneyInput", () => {
  it("updates the field when the parent changes valueCents (e.g. a product pick fills the rate)", () => {
    const { rerender } = render(<MoneyInput aria-label="Rate" valueCents={0} onChangeCents={() => {}} />);
    const input = screen.getByLabelText("Rate") as HTMLInputElement;
    expect(input.value).toBe("");

    rerender(<MoneyInput aria-label="Rate" valueCents={5000} onChangeCents={() => {}} />);
    expect(input.value).toBe("50");
  });

  it("keeps in-progress input like '19.' when the parent echoes back the same cents", () => {
    function Harness() {
      const [cents, setCents] = useState(0);
      return <MoneyInput aria-label="Rate" valueCents={cents} onChangeCents={setCents} />;
    }
    render(<Harness />);
    const input = screen.getByLabelText("Rate") as HTMLInputElement;

    // "19." parses to 1900 cents; the parent echoes 1900 straight back, so the
    // trailing dot must survive (not be reformatted to "19").
    fireEvent.change(input, { target: { value: "19." } });
    expect(input.value).toBe("19.");
  });
});
