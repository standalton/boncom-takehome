import { describe, it, expect } from "vitest";
import {
  sanitizeDecimalInput,
  formatPhoneInput,
  isCompletePhone,
  PHONE_MAX_LENGTH,
} from "./field-helpers";

describe("sanitizeDecimalInput", () => {
  it("strips non-numeric characters", () => {
    expect(sanitizeDecimalInput("$1,299.50")).toBe("1299.50");
    expect(sanitizeDecimalInput("abc12")).toBe("12");
  });

  it("keeps only the first decimal point", () => {
    expect(sanitizeDecimalInput("1.2.3")).toBe("1.23");
  });

  it("allows partial input while typing", () => {
    expect(sanitizeDecimalInput("19.")).toBe("19.");
    expect(sanitizeDecimalInput("")).toBe("");
  });

  describe("with a two-decimal cap (money)", () => {
    it("truncates extra decimal places", () => {
      expect(sanitizeDecimalInput("19.999", 2)).toBe("19.99");
      expect(sanitizeDecimalInput("0.12345", 2)).toBe("0.12");
    });

    it("leaves values within the cap untouched", () => {
      expect(sanitizeDecimalInput("19.9", 2)).toBe("19.9");
      expect(sanitizeDecimalInput("1299", 2)).toBe("1299");
      expect(sanitizeDecimalInput("19.", 2)).toBe("19.");
    });

    it("does not round — it truncates", () => {
      // "19.999" becomes "19.99", not "20.00": entry is constrained, not rounded.
      expect(sanitizeDecimalInput("19.999", 2)).toBe("19.99");
    });
  });
});

describe("formatPhoneInput", () => {
  it("formats progressively as digits are typed", () => {
    expect(formatPhoneInput("")).toBe("");
    expect(formatPhoneInput("1")).toBe("(1");
    expect(formatPhoneInput("123")).toBe("(123");
    expect(formatPhoneInput("1234")).toBe("(123) 4");
    expect(formatPhoneInput("123456")).toBe("(123) 456");
    expect(formatPhoneInput("1234567")).toBe("(123) 456-7");
    expect(formatPhoneInput("1234567890")).toBe("(123) 456-7890");
  });

  it("strips non-digits so only the format's punctuation survives", () => {
    expect(formatPhoneInput("(123) 456-7890")).toBe("(123) 456-7890");
    expect(formatPhoneInput("123.456.7890")).toBe("(123) 456-7890");
    expect(formatPhoneInput("abc123def")).toBe("(123");
  });

  it("caps at 10 digits, dropping anything extra", () => {
    expect(formatPhoneInput("123456789012345")).toBe("(123) 456-7890");
  });

  it("reformats cleanly after a deletion (idempotent on its own output)", () => {
    // User backspaces "(123) 456-7890" down to "(123) 456-789".
    expect(formatPhoneInput("(123) 456-789")).toBe("(123) 456-789");
    // Deleting into a trailing separator leaves a re-derivable, stable value.
    expect(formatPhoneInput("(123) ")).toBe("(123");
    const full = formatPhoneInput("1234567890");
    expect(formatPhoneInput(full)).toBe(full);
  });
});

describe("isCompletePhone", () => {
  it("accepts only the fully-formatted shape", () => {
    expect(isCompletePhone("(123) 456-7890")).toBe(true);
  });

  it("rejects empty, partial, and differently-formatted values", () => {
    expect(isCompletePhone("")).toBe(false);
    expect(isCompletePhone("(123) 456-789")).toBe(false);
    expect(isCompletePhone("1234567890")).toBe(false);
    expect(isCompletePhone("123-456-7890")).toBe(false);
    expect(isCompletePhone("(123)456-7890")).toBe(false);
  });

  it("PHONE_MAX_LENGTH matches a complete number's length", () => {
    expect(PHONE_MAX_LENGTH).toBe("(123) 456-7890".length);
  });
});
