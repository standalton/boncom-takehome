/**
 * ClientActionsMenu.tsx — a client's "more actions" menu.
 *
 * What:        A three-dot menu with Edit (opens NewClientDialog in edit mode)
 *              and Delete (confirmation dialog, then removes the client).
 * Where used:  Each row of the clients table (ClientList).
 * Notes:       Clicks are stopped from bubbling so opening the menu doesn't also
 *              toggle the row's inline quote history. Delete is refused server-
 *              side when the client still has quotes.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteClient } from "@/actions/clients";
import type { Client } from "@/lib/types";
import { NewClientDialog } from "@/components/NewClientDialog";
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

export function ClientActionsMenu({ client }: { client: Client }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirmDelete() {
    start(async () => {
      const res = await deleteClient(client.id);
      if (res.ok) {
        toast.success(`Deleted ${client.company}`);
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  // Stop row-level click handlers (which toggle the quote history) from firing
  // when interacting with this menu or its dialogs.
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" aria-label="Client actions" className="size-8 p-0" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewClientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        onSaved={() => router.refresh()}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {client.company}?</DialogTitle>
            <DialogDescription>
              This removes the client. Clients that already have quotes can&apos;t
              be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              <Trash2 className="size-4" />
              {pending ? "Deleting…" : "Delete client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
