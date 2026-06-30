/**
 * NewClientDialog.tsx — create a client without leaving the current screen.
 *
 * What:        A small modal form (name, company, email) that creates a client
 *              via the server action and hands the new record back to the caller.
 * Where used:  The quote editor's customer picker ("Add new customer"). Reusable
 *              anywhere a client needs to be created inline.
 * Notes:       Surfaces validation/DB errors inline and via a toast — it never
 *              closes on a failed create, so the entered data is not lost.
 */
"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClientRecord } from "@/actions/clients";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: Client) => void;
  initialName?: string;
};

export function NewClientDialog({ open, onOpenChange, onCreated, initialName = "" }: Props) {
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startCreate] = useTransition();

  // Reset the form each time the dialog opens (prefilling the typed-in name).
  useEffect(() => {
    if (open) {
      setName(initialName);
      setCompany("");
      setEmail("");
      setError(null);
    }
  }, [open, initialName]);

  function submit() {
    setError(null);
    startCreate(async () => {
      const res = await createClientRecord({ name, company, email });
      if (res.ok) {
        toast.success(`Added ${res.data.name}`);
        onCreated(res.data);
        onOpenChange(false);
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>Add a client to bill this quote to.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Cooper"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="client-company">Company</Label>
            <Input
              id="client-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc. (optional)"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com (optional)"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Adding…" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
