/**
 * QuoteEditorHeader.tsx — the quote editor's top bar.
 *
 * What:        Quote number + save state chip on the left; status indicator,
 *              valid-until date, Save/Edit button, and the actions menu on the
 *              right. Presentational — all handlers come from QuoteEditor.
 * Where used:  QuoteEditor, above the form / invoice view.
 */
"use client";

import { Pencil } from "lucide-react";
import { helpText } from "@/lib/help-text";
import type { QuoteStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/HelpHint";
import { DateField } from "@/components/DateField";
import { StatusSelect, StatusBadge } from "@/components/StatusSelect";
import { QuoteActionsMenu } from "@/components/QuoteActionsMenu";
import type { ActivityEntry } from "@/components/QuoteActivity";

const eyebrow =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

type Props = {
  // null before the quote is first saved (new-quote mode).
  id: string | null;
  number: string;
  activity: ActivityEntry[];
  status: QuoteStatus;
  locked: boolean;
  dirty: boolean;
  mounted: boolean;
  lastSavedAt: string;
  validUntil: string;
  onValidUntilChange: (value: string) => void;
  onStatusSelect: (status: QuoteStatus) => void;
  statusPending: boolean;
  saving: boolean;
  saveDisabled?: boolean;
  onSave: () => void;
  onEdit: () => void;
};

export function QuoteEditorHeader({
  id,
  number,
  activity,
  status,
  locked,
  dirty,
  mounted,
  lastSavedAt,
  validUntil,
  onValidUntilChange,
  onStatusSelect,
  statusPending,
  saving,
  saveDisabled,
  onSave,
  onEdit,
}: Props) {
  return (
    <div className="mx-auto mb-8 flex max-w-3xl items-start justify-between gap-6 border-b pb-6">
      <div className="min-w-0">
        <div className={eyebrow}>
          Quote <HelpHint text={helpText.quoteNumber} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <h1 className="text-3xl font-light tracking-tight break-all text-primary">
            {number || "New quote"}
          </h1>
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              Unsaved
            </span>
          ) : mounted && lastSavedAt ? (
            <span className="text-xs text-muted-foreground">
              Saved{" "}
              {new Date(lastSavedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-end gap-4">
        <div className="space-y-1.5">
          <label className={eyebrow}>
            Status <HelpHint text={helpText.status} />
          </label>
          <div className="flex items-center gap-2">
            {status === "draft" || status === "finalized" ? (
              <StatusBadge status={status} />
            ) : (
              <StatusSelect value={status} onSelect={onStatusSelect} disabled={statusPending} />
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={eyebrow}>
            Valid until <HelpHint text={helpText.validUntil} />
          </label>
          <DateField value={validUntil} disabled={locked} onChange={onValidUntilChange} />
        </div>
        <div className="flex items-center gap-2 self-end">
          {/* Draft can be saved; finalized can be reverted to draft to edit; once
              sent, the quote is a committed record (no Save/Edit) — duplicate it. */}
          {status === "draft" ? (
            <Button onClick={onSave} disabled={saving || saveDisabled} className="h-9 min-w-20">
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : status === "finalized" ? (
            <Button variant="outline" onClick={onEdit} disabled={statusPending} className="h-9 min-w-20">
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {/* Duplicate / delete / history only make sense once the quote exists. */}
          {id && <QuoteActionsMenu id={id} number={number} activity={activity} />}
        </div>
      </div>
    </div>
  );
}
