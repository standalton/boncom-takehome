/**
 * QuoteActionsMenu.tsx — the quote's "more actions" menu.
 *
 * What:        A three-dot menu with View history (opens the activity timeline in
 *              a dialog), Duplicate (clones the quote as a new draft and opens
 *              it), and Delete (opens a confirmation dialog, then removes the
 *              quote and returns to the list).
 * Where used:  The quote editor header, to the right of Save.
 * Notes:       Delete always confirms first — it's irreversible.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Copy, Trash2, History } from "lucide-react";
import { duplicateQuote, deleteQuote } from "@/actions/quotes";
import { listActivity } from "@/actions/quote-queries";
import { QuoteActivity, type ActivityEntry } from "@/components/QuoteActivity";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = { id: string; number: string; activity: ActivityEntry[] };

export function QuoteActionsMenu({ id, number, activity }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Seed from the server-rendered activity, then refetch on open so the timeline
  // always reflects edits made since the page loaded.
  const [entries, setEntries] = useState<ActivityEntry[]>(activity);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pending, start] = useTransition();

  function openHistory() {
    setHistoryOpen(true);
    setLoadingHistory(true);
    listActivity(id).then((res) => {
      setLoadingHistory(false);
      if (res.ok) setEntries(res.data);
      else toast.error(res.error);
    });
  }

  function duplicate() {
    start(async () => {
      const res = await duplicateQuote(id);
      if (res.ok) {
        toast.success(`Duplicated ${number}`);
        router.push(`/quotes/${res.id}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  function confirmDelete() {
    start(async () => {
      const res = await deleteQuote(id);
      if (res.ok) {
        toast.success(`Deleted ${number}`);
        setDeleteOpen(false);
        router.push("/quotes");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" aria-label="Quote actions" className="size-9 p-0" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={openHistory}>
            <History className="size-4" />
            View history
          </DropdownMenuItem>
          <DropdownMenuItem onClick={duplicate} disabled={pending}>
            <Copy className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle>History</DialogTitle>
            <DialogDescription>Everything that&apos;s happened to {number}, newest first.</DialogDescription>
          </DialogHeader>
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {loadingHistory && entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <QuoteActivity entries={entries} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {number}?</DialogTitle>
            <DialogDescription>
              This permanently removes the quote and its line items. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              <Trash2 className="size-4" />
              {pending ? "Deleting…" : "Delete quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
