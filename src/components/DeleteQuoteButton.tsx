/**
 * DeleteQuoteButton.tsx — delete a quote, with confirmation.
 *
 * What:        A trash trigger that opens a confirm dialog and, once confirmed,
 *              deletes the quote via the server action. Renders icon-only by
 *              default, or with a label when `label` is passed.
 * Where used:  The quote editor header (redirects after delete) and the quotes
 *              list rows (refreshes after delete).
 * Notes:       Deleting is irreversible, so it always confirms first. The
 *              trigger stops click propagation so it works inside clickable rows.
 */
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteQuote } from "@/actions/quotes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  id: string;
  number: string;
  afterDelete: () => void;
  label?: string;
};

export function DeleteQuoteButton({ id, number, afterDelete, label }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startDelete] = useTransition();

  function confirm() {
    startDelete(async () => {
      const res = await deleteQuote(id);
      if (res.ok) {
        toast.success(`Deleted ${number}`);
        setOpen(false);
        afterDelete();
      } else {
        toast.error(res.error);
      }
    });
  }

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      {label ? (
        <Button variant="destructive" size="sm" onClick={(e) => { stop(e); setOpen(true); }}>
          <Trash2 className="size-4" />
          {label}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${number}`}
          className="text-muted-foreground hover:text-destructive"
          onClick={(e) => { stop(e); setOpen(true); }}
        >
          <Trash2 className="size-4" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>Delete {number}?</DialogTitle>
            <DialogDescription>
              This permanently removes the quote and its line items. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              <Trash2 className="size-4" />
              {pending ? "Deleting…" : "Delete quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
