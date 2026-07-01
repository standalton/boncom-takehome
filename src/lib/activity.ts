/**
 * activity.ts — the quote activity-log entry shape + row mapping.
 *
 * What:        `ActivityEntry` is the clean shape the UI renders; `toActivityEntries`
 *              maps raw activity_log rows (with the joined actor) into it.
 * Where used:  actions/quotes.listActivity returns mapped entries; QuoteActivity
 *              and the history dialog render them.
 * Notes:       Supabase types the joined profile as either a to-one object or an
 *              array depending on inference, so actorName normalises both.
 */
export type ActivityEntry = {
  id: string;
  action: string;
  detail: Record<string, unknown> | null;
  actor: string | null;
  at: string;
};

type ActivityRow = {
  id: string;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

function actorName(profiles: ActivityRow["profiles"]): string | null {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  return profile?.full_name ?? null;
}

export function toActivityEntries(rows: unknown[]): ActivityEntry[] {
  return (rows as ActivityRow[]).map((row) => ({
    id: row.id,
    action: row.action,
    detail: row.detail,
    actor: actorName(row.profiles),
    at: row.created_at,
  }));
}
