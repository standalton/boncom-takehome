/**
 * ProductDialog.tsx — create or edit a catalog product.
 *
 * What:        A controlled dialog with the product form (name, description,
 *              default rate, unit). Creates via createProduct when no `product`
 *              is passed, otherwise edits it via updateProduct.
 * Where used:  AddProductDialog (create) and ProductActionsMenu (edit).
 * Notes:       Fields reset from `product` each time the dialog opens, so edit
 *              shows current values and create starts blank after a prior edit.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/actions/products";
import { PRODUCT_UNITS } from "@/lib/product-units";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/MoneyInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode; omitted = create mode. */
  product?: Product;
};

export function ProductDialog({ open, onOpenChange, product }: Props) {
  const isEdit = Boolean(product);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rateCents, setRateCents] = useState(0);
  const [unit, setUnit] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  // Seed the form from the product each time the dialog opens. Done during
  // render on the open transition (not in an effect) to avoid a cascading
  // re-render.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(product?.name ?? "");
      setDescription(product?.description ?? "");
      setRateCents(product?.default_rate_cents ?? 0);
      setUnit(product?.unit ?? "");
    }
  }

  function submit() {
    start(async () => {
      const input = { name, description, defaultRateCents: rateCents, unit };
      const res = product
        ? await updateProduct(product.id, input)
        : await createProduct(input);
      if (res.ok) {
        toast.success(isEdit ? "Product updated" : "Product added");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
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
            <Textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included, deliverables, assumptions…"
              className="max-h-72 min-h-24 resize-y overflow-y-auto"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-rate">Default rate</Label>
              <MoneyInput id="p-rate" valueCents={rateCents} onChangeCents={setRateCents} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-unit">Unit</Label>
              <Select
                items={PRODUCT_UNITS}
                value={unit || null}
                onValueChange={(value) => setUnit((value as string) ?? "")}
              >
                <SelectTrigger id="p-unit" className="h-8 w-full cursor-pointer">
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value} className="cursor-pointer">
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Save product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
