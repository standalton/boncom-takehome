/**
 * QuoteTotalsBar.tsx — the sticky bottom summary + primary action.
 *
 * What:        Pinned bar showing the Subtotal / Discount / Tax breakdown and
 *              the grand total, plus the contextual action for the quote's
 *              stage: Finalize (draft), Export + Send (finalized), or Export
 *              (sent and beyond).
 * Where used:  QuoteEditor.
 */
"use client";

import type { ReactNode } from "react";
import { Send, Download, CheckCircle2 } from "lucide-react";
import { formatCents } from "@/lib/money";
import { helpText } from "@/lib/help-text";
import type { QuoteStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  status: QuoteStatus;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  saving: boolean;
  statusPending: boolean;
  finalizeDisabled?: boolean;
  // A status strip pinned directly above the totals row (part of the sticky footer).
  banner?: ReactNode;
  onFinalize: () => void;
  onExport: () => void;
  onSend: () => void;
};

// One label-over-value column in the breakdown group.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function QuoteTotalsBar({
  status,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  saving,
  statusPending,
  finalizeDisabled,
  banner,
  onFinalize,
  onExport,
  onSend,
}: Props) {
  return (
    <div className="fixed right-0 bottom-0 left-60 z-20 shadow-[0_-10px_30px_-16px_rgba(0,32,66,0.28)]">
      {banner}
      <div className="border-t bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-8 pt-3.5 pb-5">
          <dl className="hidden items-center gap-7 sm:flex">
            <Stat label="Subtotal" value={formatCents(subtotalCents)} />
            {discountCents > 0 && <Stat label="Discount" value={`−${formatCents(discountCents)}`} />}
            <Stat label="Tax" value={formatCents(taxCents)} />
          </dl>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-0.5 sm:border-l sm:border-border sm:pl-6">
              <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Total
              </span>
              <span
                data-testid="grand-total"
                className="text-[28px] leading-none font-semibold text-primary tabular-nums"
              >
                {formatCents(totalCents)}
              </span>
            </div>
            {status === "draft" && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="lg"
                    disabled={saving || statusPending || finalizeDisabled}
                    onClick={onFinalize}
                  />
                }
              >
                <CheckCircle2 className="size-4" />
                Finalize
              </TooltipTrigger>
              <TooltipContent>{helpText.finalize}</TooltipContent>
            </Tooltip>
          )}
          {status === "finalized" && (
            <>
              <Button size="lg" variant="outline" onClick={onExport}>
                <Download className="size-4" />
                Export
              </Button>
              <Button size="lg" disabled={statusPending} onClick={onSend}>
                <Send className="size-4" />
                Send
              </Button>
            </>
          )}
          {status !== "draft" && status !== "finalized" && (
            <Button size="lg" variant="outline" onClick={onExport}>
              <Download className="size-4" />
              Export
            </Button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
