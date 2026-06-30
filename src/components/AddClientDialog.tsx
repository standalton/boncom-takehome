/**
 * AddClientDialog.tsx — create a new client.
 *
 * What:        A dialog with a small form that creates a client via the
 *              createClientRecord server action.
 * Where used:  The clients page header (and reusable elsewhere).
 * Notes:       Uses the Base UI dialog `render` prop (not Radix `asChild`).
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClientRecord } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    start(async () => {
      const res = await createClientRecord({ name, company, email });
      if (res.ok) {
        toast.success("Client added");
        setOpen(false);
        setName("");
        setCompany("");
        setEmail("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Add client
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-company">Company</Label>
            <Input id="c-company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : "Save client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
