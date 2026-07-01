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
  onFinalize: () => void;
  onExport: () => void;
  onSend: () => void;
};

export function QuoteTotalsBar({
  status,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  saving,
  statusPending,
  onFinalize,
  onExport,
  onSend,
}: Props) {
  return (
    <div className="fixed right-0 bottom-0 left-60 z-20 border-t bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-8 py-3">
        <div className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          <span>
            Subtotal{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatCents(subtotalCents)}
            </span>
          </span>
          {discountCents > 0 && (
            <span>
              Disc{" "}
              <span className="font-medium text-foreground tabular-nums">
                −{formatCents(discountCents)}
              </span>
            </span>
          )}
          <span>
            Tax{" "}
            <span className="font-medium text-foreground tabular-nums">{formatCents(taxCents)}</span>
          </span>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right leading-none">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Total
            </div>
            <div
              data-testid="grand-total"
              className="mt-1 text-2xl font-light text-primary tabular-nums transition-all"
            >
              {formatCents(totalCents)}
            </div>
          </div>
          {status === "draft" && (
            <Tooltip>
              <TooltipTrigger
                render={<Button size="lg" disabled={saving || statusPending} onClick={onFinalize} />}
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
  );
}
