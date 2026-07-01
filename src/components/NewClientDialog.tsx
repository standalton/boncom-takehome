/**
 * NewClientDialog.tsx — create or edit a client without leaving the screen.
 *
 * What:        A small modal form (company, contact, email, phone). Creates a
 *              client via createClientRecord, or edits one via updateClient when
 *              a `client` is passed. Hands the resulting record back to the caller.
 * Where used:  The quote editor's customer picker ("Add new customer"), the
 *              clients-page "Add client" button, and the per-row edit menu.
 * Notes:       Surfaces validation/DB errors inline and via a toast — it never
 *              closes on a failed save, so the entered data is not lost.
 */
"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClientRecord, updateClient } from "@/actions/clients";
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
  onSaved: (client: Client) => void;
  initialCompany?: string;
  /** Present = edit mode; omitted = create mode. */
  client?: Client;
  /** Sub-title copy; defaults to a context-appropriate line. */
  description?: string;
};

export function NewClientDialog({
  open,
  onOpenChange,
  onSaved,
  initialCompany = "",
  client,
  description,
}: Props) {
  const isEdit = Boolean(client);
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startSave] = useTransition();

  // Seed the form each time the dialog opens: from the client in edit mode, or
  // the typed-in company when creating.
  useEffect(() => {
    if (!open) return;
    setCompany(client?.company ?? initialCompany);
    setContactName(client?.contact_name ?? "");
    setEmail(client?.email ?? "");
    setPhone(client?.phone ?? "");
    setError(null);
  }, [open, initialCompany, client]);

  const effectiveDescription =
    description ??
    (isEdit ? "Update this customer's details." : "Add a customer to reuse across your quotes.");

  function submit() {
    setError(null);
    startSave(async () => {
      const payload = { company, contactName, email, phone };
      const res = client
        ? await updateClient(client.id, payload)
        : await createClientRecord(payload);
      if (res.ok) {
        toast.success(`${isEdit ? "Updated" : "Added"} ${res.data.company}`);
        onSaved(res.data);
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
          <DialogTitle>{isEdit ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>{effectiveDescription}</DialogDescription>
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
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
