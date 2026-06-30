/**
 * DateField.tsx — a clean date control.
 *
 * What:        Shows the chosen date as a formatted button ("Jun 30, 2026") or a
 *              muted "Set date". Clicking opens a custom calendar popover (not
 *              the native date picker). A small clear button removes the date.
 * Where used:  The quote editor's "Valid until" field.
 * Notes:       Value is an ISO date string ("YYYY-MM-DD") or "". Parsed at local
 *              midnight so the displayed day can't drift across time zones.
 */
"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/Calendar";

function formatPretty(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function DateField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background py-0 pr-7 pl-2.5 text-sm whitespace-nowrap transition-colors hover:border-ring/70 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 data-popup-open:border-ring">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {value ? (
            <span className="text-foreground tabular-nums">{formatPretty(value)}</span>
          ) : (
            <span className="text-muted-foreground">Set date</span>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="end" className="isolate z-50">
            <Popover.Popup className="rounded-xl border bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/5 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              <Calendar
                value={value}
                onSelect={(iso) => {
                  onChange(iso);
                  setOpen(false);
                }}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {value && (
        <button
          type="button"
          aria-label="Clear date"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
