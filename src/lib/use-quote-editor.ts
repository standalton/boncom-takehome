/**
 * use-quote-editor.ts — state + persistence for the quote editor.
 *
 * What:        Owns all editing state (client, lines, discount, tax, notes,
 *              status, validity), derives live totals from lib/pricing, and
 *              exposes the save / finalize / status / export / duplicate-safe
 *              handlers. Keeps QuoteEditor a thin composition of UI pieces.
 * Where used:  QuoteEditor.
 * Notes:       Handlers that mutate the quote also flip the dirty flag; totals
 *              use the same computeTotals the server uses so they can't diverge.
 */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { computeTotals } from "@/lib/pricing";
import { saveQuote, setStatus } from "@/actions/quotes";
import type { Client, DiscountType, QuoteStatus } from "@/lib/types";
import { toClientOption, type ClientOption } from "@/lib/client-option";
import { exportQuoteFromEditor } from "@/lib/export-quote";
import type { LineItemPatch } from "@/components/LineItemRow";
import type { EditorLine } from "@/components/QuoteEditorForm";

export type QuoteEditorInit = {
  id: string;
  number: string;
  status: QuoteStatus;
  updatedAt: string;
  clientId: string;
  clients: ClientOption[];
  taxRatePercent: number;
  orderDiscountType: DiscountType;
  orderDiscountValue: number;
  notes: string;
  validUntil: string;
  lines: Omit<EditorLine, "key">[];
};

let keyCounter = 0;
const newKey = () => `line-${keyCounter++}`;

export function useQuoteEditor(init: QuoteEditorInit) {
  const [clients, setClients] = useState<ClientOption[]>(init.clients);
  const [clientId, setClientId] = useState(init.clientId);
  const [status, setStatusState] = useState<QuoteStatus>(init.status);
  const [sendOpen, setSendOpen] = useState(false);
  const [validUntil, setValidUntil] = useState(init.validUntil);
  const [taxRatePercent, setTaxRatePercent] = useState(init.taxRatePercent);
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType>(init.orderDiscountType);
  const [orderDiscountValue, setOrderDiscountValue] = useState(init.orderDiscountValue);
  const [notes, setNotes] = useState(init.notes);
  const [lines, setLines] = useState<EditorLine[]>(init.lines.map((l) => ({ ...l, key: newKey() })));
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(init.updatedAt);
  // Format lastSaved only after mount to avoid a UTC/local hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [saving, startSave] = useTransition();
  const [statusPending, startStatus] = useTransition();

  const selectedClient = clients.find((c) => c.id === clientId);
  const locked = status !== "draft";

  const totals = useMemo(
    () =>
      computeTotals({
        lineItems: lines.map((l) => ({
          quantity: l.quantity,
          rateCents: l.rateCents,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
        orderDiscountType,
        orderDiscountValue,
        taxRatePercent,
      }),
    [lines, orderDiscountType, orderDiscountValue, taxRatePercent],
  );

  const updateLine = (key: string, patch: LineItemPatch) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setDirty(true);
  };
  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { key: newKey(), description: "", quantity: 1, rateCents: 0, discountType: "none", discountValue: 0 },
    ]);
    setDirty(true);
  };
  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
    setDirty(true);
  };
  const addClient = (client: Client) => {
    setClients((prev) => [...prev, toClientOption(client)]);
    setDirty(true);
  };
  const changeClient = (id: string) => {
    setClientId(id);
    setDirty(true);
  };
  const changeValidUntil = (v: string) => {
    setValidUntil(v);
    setDirty(true);
  };
  const changeDiscount = (type: DiscountType, value: number) => {
    setOrderDiscountType(type);
    setOrderDiscountValue(value);
    setDirty(true);
  };
  const changeTax = (value: number) => {
    setTaxRatePercent(value);
    setDirty(true);
  };
  const changeNotes = (v: string) => {
    setNotes(v);
    setDirty(true);
  };

  function buildInput() {
    return {
      clientId,
      taxRatePercent,
      orderDiscountType,
      orderDiscountValue,
      notes,
      validUntil,
      lineItems: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        rateCents: l.rateCents,
        discountType: l.discountType,
        discountValue: l.discountValue,
      })),
    };
  }

  function save() {
    startSave(async () => {
      const res = await saveQuote(init.id, buildInput());
      if (res.ok) {
        toast.success("Saved");
        setDirty(false);
        setLastSavedAt(new Date().toISOString());
      } else {
        toast.error(res.error);
      }
    });
  }

  // Finalizing persists the current edits, then locks the quote for editing.
  function finalize() {
    startSave(async () => {
      const res = await saveQuote(init.id, buildInput());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDirty(false);
      setLastSavedAt(new Date().toISOString());
      const statusRes = await setStatus(init.id, "finalized");
      if (statusRes.ok) {
        setStatusState("finalized");
        toast.success("Quote finalized");
      } else {
        toast.error(statusRes.error);
      }
    });
  }

  async function exportPdf() {
    try {
      await exportQuoteFromEditor({
        number: init.number,
        status,
        validUntil,
        client: selectedClient,
        lines,
        lineNets: totals.lineNetsCents,
        taxRatePercent,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
      });
      toast.success(`Exported ${init.number}.pdf`);
    } catch {
      toast.error("Could not export the PDF.");
    }
  }

  // "Sent" opens a send confirmation; other transitions apply immediately.
  function applyStatus(next: QuoteStatus, onSent?: () => void) {
    if (next === status && next !== "sent") return;
    const previous = status;
    setStatusState(next);
    startStatus(async () => {
      const res = await setStatus(init.id, next);
      if (res.ok) {
        if (next === "sent") {
          toast.success(`Quote sent to ${selectedClient?.company ?? "the client"}`);
          onSent?.();
        } else {
          toast.success(`Marked ${next}`);
        }
      } else {
        toast.error(res.error);
        setStatusState(previous);
      }
    });
  }

  return {
    clients, clientId, status, validUntil, taxRatePercent,
    orderDiscountType, orderDiscountValue, notes, lines,
    dirty, lastSavedAt, mounted, saving, statusPending,
    sendOpen, setSendOpen, selectedClient, locked, totals,
    updateLine, addLine, removeLine, addClient, changeClient,
    changeValidUntil, changeDiscount, changeTax, changeNotes,
    save, finalize, exportPdf, applyStatus,
  };
}
