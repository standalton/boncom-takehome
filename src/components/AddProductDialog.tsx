/**
 * AddProductDialog.tsx — the "Add product" button + create dialog.
 *
 * What:        Header action that opens ProductDialog in create mode.
 * Where used:  The products page header.
 */
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductDialog } from "@/components/ProductDialog";

export function AddProductDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add product
      </Button>
      <ProductDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
