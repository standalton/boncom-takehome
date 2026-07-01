import { describe, it, expect } from "vitest";
import {
  parseSort,
  applySort,
  QUOTE_SORTS,
  QUOTE_SORT_DEFAULT,
  type SortSpec,
} from "@/lib/list-params";

describe("parseSort", () => {
  it("returns the fallback when no sort is given", () => {
    expect(parseSort(undefined, undefined, QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual(
      QUOTE_SORT_DEFAULT,
    );
  });

  it("returns the fallback for a column not in the allow-list", () => {
    expect(parseSort("password", "asc", QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual(
      QUOTE_SORT_DEFAULT,
    );
  });

  it("accepts an allow-listed column with an explicit direction", () => {
    expect(parseSort("total_cents", "asc", QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual({
      column: "total_cents",
      ascending: true,
    });
  });

  it("treats any non-'asc' direction as descending", () => {
    expect(parseSort("number", "garbage", QUOTE_SORTS, QUOTE_SORT_DEFAULT)).toEqual({
      column: "number",
      ascending: false,
    });
  });
});

describe("applySort", () => {
  it("calls .order with the column and direction and returns the query", () => {
    const calls: Array<[string, { ascending: boolean }]> = [];
    const fakeQuery = {
      order(column: string, options: { ascending: boolean }) {
        calls.push([column, options]);
        return this;
      },
    };
    const sort: SortSpec = { column: "name", ascending: true };
    const result = applySort(fakeQuery, sort);
    expect(calls).toEqual([["name", { ascending: true }]]);
    expect(result).toBe(fakeQuery);
  });
});
