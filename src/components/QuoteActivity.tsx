/**
 * QuoteActivity.tsx — read-only history timeline for a quote.
 *
 * What:        Renders the append-only activity_log for a quote as a vertical
 *              timeline (created / edited / status changes), each with the actor
 *              and a timestamp. Just the list — the container (dialog title,
 *              scroll area) is supplied by the caller.
 * Where used:  QuoteActionsMenu, inside the "View history" dialog.
 * Notes:       Timestamps are formatted manually in UTC from raw Date getters —
 *              NOT via toLocaleString. Intl output can differ between the Node
 *              server and the browser (e.g. the "at" connector) even with a fixed
 *              locale/timezone, which breaks hydration; a hand-built string is
 *              identical everywhere. Presentation only; data is fetched server-side.
 */
"use client";

import { statusMeta } from "@/components/StatusSelect";
import type { QuoteStatus } from "@/lib/types";
import type { ActivityEntry } from "@/lib/activity";

export type { ActivityEntry } from "@/lib/activity";

const NEUTRAL = "#9ca3af";
const BRAND = "#65c6d9";

// Map a raw log entry to a human label, a dot colour, and (for a multi-change
// save) the specific changes to list beneath it.
function describe(entry: ActivityEntry): { label: string; dot: string; details?: string[] } {
  if (entry.action === "created") {
    return entry.detail?.duplicated_from
      ? { label: "Duplicated from another quote", dot: BRAND }
      : { label: "Quote created", dot: BRAND };
  }
  if (entry.action === "saved") {
    const changes = Array.isArray(entry.detail?.changes)
      ? (entry.detail.changes as string[])
      : [];
    if (changes.length === 1) return { label: changes[0], dot: NEUTRAL };
    if (changes.length > 1) {
      return { label: `Saved ${changes.length} changes`, dot: NEUTRAL, details: changes };
    }
    return { label: "Edits saved", dot: NEUTRAL }; // legacy entries without a diff
  }
  if (entry.action === "status_changed") {
    const status = entry.detail?.status as QuoteStatus | undefined;
    const meta = status ? statusMeta[status] : undefined;
    return { label: `Marked ${meta?.label ?? status ?? "updated"}`, dot: meta?.dot ?? NEUTRAL };
  }
  return { label: entry.action, dot: NEUTRAL };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Deterministic UTC format built from raw Date getters (no Intl) so the string
// is byte-identical on the server and in the browser. e.g. "Jun 30, 2026, 8:19 PM UTC".
function formatAt(iso: string) {
  const d = new Date(iso);
  const hours24 = d.getUTCHours();
  const hour12 = hours24 % 12 || 12;
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${hour12}:${minute} ${period} UTC`;
}

export function QuoteActivity({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }
  return (
    <ol>
      {entries.map((entry, idx) => {
        const { label, dot, details } = describe(entry);
        const isLast = idx === entries.length - 1;
        return (
          <li key={entry.id} className="flex gap-3">
            {/* Dot + connecting line form the timeline spine. */}
            <div className="flex flex-col items-center">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-background"
                style={{ background: dot }}
                aria-hidden
              />
              {!isLast && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
            </div>
            <div className={`min-w-0 ${isLast ? "" : "pb-5"}`}>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {entry.actor ?? "Someone"}
                <span aria-hidden> · </span>
                <time dateTime={entry.at}>{formatAt(entry.at)}</time>
              </div>
              {details && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {details.map((d, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span aria-hidden className="text-muted-foreground/50">
                        –
                      </span>
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
