/**
 * StatusSelect.tsx — quote status badge + lifecycle dropdown.
 *
 * What:        `StatusBadge` renders a tinted status pill. `StatusSelect` is the
 *              same pill as a trigger that opens a custom popover menu of the
 *              statuses a quote can move to *after* it has been sent
 *              (Sent / Accepted / Paid / Declined). Draft → Sent is a separate
 *              "Send" action, so it is intentionally not in this menu.
 * Where used:  The quote editor header.
 * Notes:       Colour metadata lives in lib/status-meta (plain data, so server
 *              components can use it too) and is re-exported here for callers that
 *              already import it from this module.
 */
"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown } from "lucide-react";
import type { QuoteStatus } from "@/lib/types";
import { statusMeta } from "@/lib/status-meta";

export { statusMeta } from "@/lib/status-meta";

// Statuses reachable once a quote has been sent. (Draft and Sent are reached via
// the dedicated Send action, not this menu.)
const POST_SEND: QuoteStatus[] = ["sent", "accepted", "paid", "declined"];

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${m.pill}`}
    >
      <span className="size-2 rounded-full" style={{ background: m.dot }} aria-hidden />
      {m.label}
    </span>
  );
}

type Props = {
  value: QuoteStatus;
  onSelect: (status: QuoteStatus) => void;
  disabled?: boolean;
};

export function StatusSelect({ value, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const current = statusMeta[value];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border pr-2 pl-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-60 ${current.pill}`}
      >
        <span className="size-2 rounded-full" style={{ background: current.dot }} aria-hidden />
        {current.label}
        <ChevronDown className="size-3.5 opacity-70" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="isolate z-50">
          <Popover.Popup className="min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/5 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
            {POST_SEND.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelect(s);
                }}
                className="press flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: statusMeta[s].dot }}
                  aria-hidden
                />
                <span className="flex-1 text-left">{statusMeta[s].label}</span>
                {s === value && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
