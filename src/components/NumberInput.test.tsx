/**
 * NumberInput.test.tsx — the field tracks external value changes without
 * clobbering in-progress typing.
 */
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberInput } from "./NumberInput";

describe("NumberInput", () => {
  it("updates the field when the parent changes value", () => {
    const { rerender } = render(<NumberInput aria-label="Quantity" value={1} onChangeNumber={() => {}} />);
    const input = screen.getByLabelText("Quantity") as HTMLInputElement;
    expect(input.value).toBe("1");

    rerender(<NumberInput aria-label="Quantity" value={3} onChangeNumber={() => {}} />);
    expect(input.value).toBe("3");
  });

  it("keeps in-progress input like '2.' when the parent echoes back the same number", () => {
    function Harness() {
      const [qty, setQty] = useState(0);
      return <NumberInput aria-label="Quantity" value={qty} onChangeNumber={setQty} />;
    }
    render(<Harness />);
    const input = screen.getByLabelText("Quantity") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "2." } });
    expect(input.value).toBe("2.");
  });
});
