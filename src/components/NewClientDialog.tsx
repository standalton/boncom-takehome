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
  initialCompany?: string;
};

export function NewClientDialog({ open, onOpenChange, onCreated, initialCompany = "" }: Props) {
  const [company, setCompany] = useState(initialCompany);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startCreate] = useTransition();

  // Reset the form each time the dialog opens (prefilling the typed-in company).
  useEffect(() => {
    if (open) {
      setCompany(initialCompany);
      setContactName("");
      setEmail("");
      setPhone("");
      setError(null);
    }
  }, [open, initialCompany]);

  function submit() {
    setError(null);
    startCreate(async () => {
      const res = await createClientRecord({ company, contactName, email, phone });
      if (res.ok) {
        toast.success(`Added ${res.data.company}`);
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
            <Label htmlFor="client-company">Company</Label>
            <Input
              id="client-company"
              autoFocus
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="client-contact">Contact name</Label>
            <Input
              id="client-contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Cooper (optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !company.trim()}>
              {pending ? "Adding…" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
