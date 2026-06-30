/**
 * SendQuoteDialog.tsx — confirm before marking a quote "Sent".
 *
 * What:        A modal that previews who the quote is going to (company +
 *              contact details) and asks the user to confirm or cancel. This is
 *              a simulated send — confirming just advances the status.
 * Where used:  The quote editor, when the status is changed to "Sent".
 * Notes:       Purely a confirmation step; no email is actually dispatched.
 */
"use client";

import { Mail, Phone, Building2, User, Download } from "lucide-react";
import type { ClientOption } from "@/lib/client-option";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteNumber: string;
  client: ClientOption | undefined;
  pending: boolean;
  onConfirm: () => void;
  onExport: () => void;
};

export function SendQuoteDialog({
  open,
  onOpenChange,
  quoteNumber,
  client,
  pending,
  onConfirm,
  onExport,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {quoteNumber}?</DialogTitle>
          <DialogDescription>
            This will mark the quote as sent and notify the recipient below.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Building2 className="size-4 text-muted-foreground" />
            {client?.company ?? "No client selected"}
          </div>
          <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {client?.contactName && (
              <div className="flex items-center gap-2">
                <User className="size-4" />
                {client.contactName}
              </div>
            )}
            {client?.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4" />
                {client.email}
              </div>
            )}
            {client?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4" />
                {client.phone}
              </div>
            )}
            {client && !client.email && !client.phone && (
              <p className="text-xs italic">No contact email or phone on file.</p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onExport} disabled={pending}>
            <Download className="size-4" />
            Export
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={pending || !client}>
              <Mail className="size-4" />
              {pending ? "Sending…" : "Send quote"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
