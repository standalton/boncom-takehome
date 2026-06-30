/**
 * Calendar.tsx — a small month-grid date picker.
 *
 * What:        Renders a navigable month with selectable days. Reports the
 *              chosen day as an ISO date string ("YYYY-MM-DD").
 * Where used:  Inside DateField's popover (the quote editor's "Valid until").
 * Notes:       Pure and dependency-free. Dates are built/compared as local
 *              calendar days (no UTC conversion) so the highlighted day matches
 *              what the user clicks regardless of time zone.
 */
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

type Props = {
  value: string;
  onSelect: (iso: string) => void;
};

export function Calendar({ value, onSelect }: Props) {
  const today = new Date();
  const selected = value ? value.split("-").map(Number) : null;
  const [view, setView] = useState(() => {
    if (selected) return { y: selected[0], m: selected[1] - 1 };
    return { y: today.getFullYear(), m: today.getMonth() };
  });

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  }

  const isSelected = (d: number) =>
    selected && selected[0] === view.y && selected[1] - 1 === view.m && selected[2] === d;
  const isToday = (d: number) =>
    today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d;

  return (
    <div className="w-64 select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">
          {MONTHS[view.m]} {view.y}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`b-${i}`} />
          ) : (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(toIso(view.y, view.m, d))}
              className={`inline-flex size-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors ${
                isSelected(d)
                  ? "bg-primary font-medium text-primary-foreground"
                  : isToday(d)
                    ? "bg-accent font-medium text-foreground"
                    : "text-foreground hover:bg-accent"
              }`}
            >
              {d}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
