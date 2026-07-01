/**
 * AddClientDialog.tsx — "Add client" button for the clients page.
 *
 * What:        A trigger button that opens the shared NewClientDialog and
 *              refreshes the list once a client is created.
 * Where used:  The clients page header.
 * Notes:       The form itself lives in NewClientDialog so the create flow is
 *              identical here and in the quote editor's customer picker.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewClientDialog } from "@/components/NewClientDialog";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add client
      </Button>
      <NewClientDialog open={open} onOpenChange={setOpen} onSaved={() => router.refresh()} />
    </>
  );
}
