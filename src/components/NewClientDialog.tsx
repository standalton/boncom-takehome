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

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClientRecord, updateClient } from "@/actions/clients";
import { formatPhoneInput, isCompletePhone, PHONE_MAX_LENGTH } from "@/lib/field-helpers";
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
  // the typed-in company when creating. Done during render on the open
  // transition (not in an effect) to avoid a cascading re-render.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCompany(client?.company ?? initialCompany);
      setContactName(client?.contact_name ?? "");
      setEmail(client?.email ?? "");
      // Re-mask any stored value so legacy/unformatted numbers land in-format.
      setPhone(formatPhoneInput(client?.phone ?? ""));
      setError(null);
    }
  }

  const effectiveDescription =
    description ??
    (isEdit ? "Update this customer's details." : "Add a customer to reuse across your quotes.");

  // Phone is optional, but if provided it must be a complete (123) 456-7890
  // number. The masked input can't produce anything else; this guards the
  // partially-typed case (e.g. "(123) 45") before submit.
  const phoneInvalid = phone !== "" && !isCompletePhone(phone);

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
                inputMode="tel"
                maxLength={PHONE_MAX_LENGTH}
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                placeholder="(555) 123-4567"
                aria-invalid={phoneInvalid || undefined}
                aria-describedby={phoneInvalid ? "client-phone-error" : undefined}
              />
              {phoneInvalid && (
                <p id="client-phone-error" className="text-sm text-destructive">
                  Enter a full number: (123) 456-7890
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !company.trim() || phoneInvalid}>
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
