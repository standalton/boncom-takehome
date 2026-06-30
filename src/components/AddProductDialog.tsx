/**
 * AddProductDialog.tsx — create a catalog product.
 *
 * What:        Dialog to add a reusable product (name, description, default
 *              rate, unit) via the createProduct server action.
 * Where used:  The products page header.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/MoneyInput";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rateCents, setRateCents] = useState(0);
  const [unit, setUnit] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    start(async () => {
      const res = await createProduct({
        name,
        description,
        defaultRateCents: rateCents,
        unit,
      });
      if (res.ok) {
        toast.success("Product added");
        setOpen(false);
        setName("");
        setDescription("");
        setRateCents(0);
        setUnit("");
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
            Add product
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-desc">Description</Label>
            <Input id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-rate">Default rate</Label>
              <MoneyInput id="p-rate" valueCents={rateCents} onChangeCents={setRateCents} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-unit">Unit</Label>
              <Input
                id="p-unit"
                value={unit}
                placeholder="project / hour / month"
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : "Save product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
