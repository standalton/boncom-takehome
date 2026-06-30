/**
 * ClientPicker.tsx — searchable customer selector with inline "add new".
 *
 * What:        A select-style trigger showing the chosen company. Opening it
 *              reveals a search box that filters customers by company or contact,
 *              plus a pinned "Add new customer" action.
 * Where used:  The quote editor's Client field and the new-quote starter.
 * Notes:       Built on Base UI's Combobox. The closed state is a button (not a
 *              text input), so there's no blinking caret on the selected value;
 *              the search input lives inside the popup and only shows when open.
 */
"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, Search, UserPlus } from "lucide-react";
import type { Client } from "@/lib/types";
import type { ClientOption } from "@/lib/client-option";
import { NewClientDialog } from "@/components/NewClientDialog";

type Item = { value: string; label: string; company: string };

type Props = {
  clients: ClientOption[];
  value: string;
  onChange: (id: string) => void;
  onClientAdded: (client: Client) => void;
};

export function ClientPicker({ clients, value, onChange, onClientAdded }: Props) {
  const items = useMemo<Item[]>(
    () =>
      clients.map((c) => ({
        value: c.id,
        // label drives filtering, so include the contact name as well as company.
        label: c.contactName ? `${c.company} ${c.contactName}` : c.company,
        company: c.company,
      })),
    [clients],
  );
  const selected = items.find((i) => i.value === value) ?? null;

  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

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
        <Combobox.Trigger className="group/trigger flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-ring/60 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 data-popup-open:border-ring data-popup-open:ring-[3px] data-popup-open:ring-ring/30">
          <Combobox.Value>
            {(val: Item | null) =>
              val ? (
                <span className="line-clamp-1">{val.company}</span>
              ) : (
                <span className="text-muted-foreground">Select a customer…</span>
              )
            }
          </Combobox.Value>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/trigger:text-foreground" />
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="isolate z-50 w-(--anchor-width)">
            <Combobox.Popup className="w-full overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
              <div className="flex items-center gap-2 border-b px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Combobox.Input
                  placeholder="Search customers…"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="max-h-64 overflow-y-auto p-1">
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
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors select-none hover:bg-accent data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      <span className="line-clamp-1">{item.company}</span>
                      <Combobox.ItemIndicator>
                        <Check className="size-4 shrink-0 text-primary" />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </div>

              <div className="border-t p-1">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
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
        initialCompany={query.trim()}
        onCreated={(client) => {
          onClientAdded(client);
          onChange(client.id);
        }}
      />
    </>
  );
}
