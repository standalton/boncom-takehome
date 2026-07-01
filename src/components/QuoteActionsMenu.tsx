/**
 * QuoteActionsMenu.tsx — the quote's "more actions" menu.
 *
 * What:        A three-dot menu with Duplicate (clones the quote as a new draft
 *              and opens it) and Delete (opens a confirmation dialog, then
 *              removes the quote and returns to the list).
 * Where used:  The quote editor header, to the right of Save.
 * Notes:       Delete always confirms first — it's irreversible.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Copy, Trash2 } from "lucide-react";
import { duplicateQuote, deleteQuote } from "@/actions/quotes";
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

export function QuoteActionsMenu({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();

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
