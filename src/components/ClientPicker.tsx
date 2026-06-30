/**
 * ClientPicker.tsx — searchable customer selector with inline "add new".
 *
 * What:        A combobox that filters clients as you type and selects one. A
 *              pinned footer action opens the New customer dialog; the created
 *              client is added to the list and selected immediately.
 * Where used:  The quote editor's Client field.
 * Notes:       Built on Base UI's Combobox (filtering is built in). Item values
 *              are { value, label } objects, so the label shows in the input and
 *              the id is what we report via onChange.
 */
"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import type { Client } from "@/lib/types";
import { NewClientDialog } from "@/components/NewClientDialog";

export type ClientOption = { id: string; name: string; company: string | null };

type Item = { value: string; label: string };

function labelFor(c: ClientOption) {
  return c.company ? `${c.name} — ${c.company}` : c.name;
}

type Props = {
  clients: ClientOption[];
  value: string;
  onChange: (id: string) => void;
  onClientAdded: (client: Client) => void;
};

export function ClientPicker({ clients, value, onChange, onClientAdded }: Props) {
  const items = useMemo<Item[]>(
    () => clients.map((c) => ({ value: c.id, label: labelFor(c) })),
    [clients],
  );
  const selected = items.find((i) => i.value === value) ?? null;

  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function openAdd() {
    setAddOpen(true);
  }

  return (
    <>
      <Combobox.Root
        items={items}
        value={selected}
        onValueChange={(item: Item | null) => {
          if (item) onChange(item.value);
        }}
        onInputValueChange={(text) => setQuery(text)}
      >
        <div className="relative">
          <Combobox.Input
            placeholder="Search customers…"
            className="h-10 w-full rounded-lg border border-input bg-transparent pr-9 pl-3 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
          <Combobox.Icon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
            <ChevronsUpDown className="size-4" />
          </Combobox.Icon>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="isolate z-50 w-(--anchor-width)">
            <Combobox.Popup className="max-h-72 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
              {/* Stays mounted for screen-reader announcements; padding lives on
                  the inner node so the block collapses when there are matches. */}
              <Combobox.Empty className="text-center text-sm text-muted-foreground">
                <div className="px-3 py-6">No customers match “{query}”.</div>
              </Combobox.Empty>

              <Combobox.List>
                {(item: Item) => (
                  <Combobox.Item
                    key={item.value}
                    value={item}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <span className="line-clamp-1">{item.label}</span>
                    <Combobox.ItemIndicator>
                      <Check className="size-4 text-primary" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>

              <div className="mt-1 border-t pt-1">
                <button
                  type="button"
                  onClick={openAdd}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary outline-none transition-colors hover:bg-accent"
                >
                  <UserPlus className="size-4" />
                  {query.trim() ? `Add “${query.trim()}” as a customer` : "Add new customer"}
                </button>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      <NewClientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={query.trim()}
        onCreated={(client) => {
          onClientAdded(client);
          onChange(client.id);
        }}
      />
    </>
  );
}
