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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { computeTotals } from "@/lib/pricing";
import { finalizeBlockedReason } from "@/lib/quote-errors";
import { useQuoteValidation } from "@/lib/use-quote-validation";
import { createQuote, saveQuote, setStatus } from "@/actions/quotes";
import { listQuotesByClient } from "@/actions/quote-queries";
import type { Client, DiscountType, QuoteStatus } from "@/lib/types";
import { toClientOption, type ClientOption } from "@/lib/client-option";
import type { ProductOption } from "@/lib/product-option";
import { exportQuoteFromEditor } from "@/lib/export-quote";
import type { LineItemPatch } from "@/components/LineItemRow";
import type { EditorLine } from "@/components/QuoteEditorForm";

export type QuoteEditorInit = {
  // null while the quote is brand-new and not yet persisted; the DB row (and its
  // number) are created on the first save/finalize. See createQuote.
  id: string | null;
  number: string;
  status: QuoteStatus;
  updatedAt: string;
  clientId: string;
  clients: ClientOption[];
  products: ProductOption[];
  taxRatePercent: number;
  orderDiscountType: DiscountType;
  orderDiscountValue: number;
  notes: string;
  validUntil: string;
  lines: Omit<EditorLine, "key">[];
};

let keyCounter = 0;
const newKey = () => `line-${keyCounter++}`;

// A quote counts as "already out to the client" once it has been sent.
const SENT_STATUSES: QuoteStatus[] = ["sent", "accepted", "paid", "declined"];
export type SentSibling = { id: string; number: string; status: QuoteStatus };

export function useQuoteEditor(init: QuoteEditorInit) {
  const router = useRouter();
  // A brand-new quote has no persisted row yet; save/finalize create it.
  const isNew = init.id === null;
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

  // Warn when this client already has a quote that's been sent, so the user
  // doesn't send a second, competing quote by accident. Only relevant while the
  // current quote is still an editable draft; refetched when the client changes.
  const [sentSiblings, setSentSiblings] = useState<SentSibling[]>([]);
  useEffect(() => {
    if (status !== "draft" || !clientId) {
      setSentSiblings([]);
      return;
    }
    let active = true;
    listQuotesByClient(clientId).then((res) => {
      if (!active || !res.ok) return;
      const rows = res.data as unknown as { id: string; number: string; status: QuoteStatus }[];
      setSentSiblings(
        rows
          .filter((r) => r.id !== init.id && SENT_STATUSES.includes(r.status))
          .map((r) => ({ id: r.id, number: r.number, status: r.status })),
      );
    });
    return () => {
      active = false;
    };
  }, [clientId, status, init.id]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const locked = status !== "draft";
  // A quote is post-send once it has left the finalized stage.
  const alreadySent = status === "sent" || status === "accepted" || status === "paid" || status === "declined";

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

  // Live, per-field validation (blur-then-live timing + reveal-on-save). Mirrors
  // the server's Zod schema; the server re-checks authoritatively on save.
  const validation = useQuoteValidation({
    clientId,
    taxRatePercent,
    orderDiscountType,
    orderDiscountValue,
    notes,
    validUntil,
    lines,
    subtotalCents: totals.subtotalCents,
  });

  const updateLine = (key: string, patch: LineItemPatch) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setDirty(true);
  };
  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        description: "",
        quantity: 1,
        rateCents: 0,
        discountType: "none",
        discountValue: 0,
        productId: null,
      },
    ]);
    setDirty(true);
  };
  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
    validation.forgetLine(key);
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
        productId: l.productId,
      })),
    };
  }

  // Persist a brand-new quote: create the row, then hand off to its own editor
  // route (which reloads with the assigned number and a clean, saved state).
  // Returns the new id so a caller can chain a status change (e.g. finalize).
  async function createNewQuote(): Promise<string | null> {
    if (!clientId) {
      toast.error("Choose a client before saving.");
      return null;
    }
    const res = await createQuote(buildInput());
    if (!res.ok) {
      toast.error(res.error);
      return null;
    }
    return res.id;
  }

  function save() {
    if (validation.hasErrors) {
      validation.revealErrors();
      return;
    }
    if (isNew) {
      startSave(async () => {
        const id = await createNewQuote();
        if (!id) return;
        toast.success("Quote created");
        router.replace(`/quotes/${id}`);
      });
      return;
    }
    startSave(async () => {
      const res = await saveQuote(init.id!, buildInput());
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
    // An empty quote can't be finalized — there's nothing to commit. (The server
    // enforces this too; this is the immediate, no-round-trip feedback.)
    const blocked = finalizeBlockedReason(lines.length);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    if (validation.hasErrors) {
      validation.revealErrors();
      return;
    }
    if (isNew) {
      startSave(async () => {
        const id = await createNewQuote();
        if (!id) return;
        const statusRes = await setStatus(id, "finalized");
        if (statusRes.ok) toast.success("Quote finalized");
        else toast.error(statusRes.error);
        router.replace(`/quotes/${id}`);
      });
      return;
    }
    startSave(async () => {
      const res = await saveQuote(init.id!, buildInput());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDirty(false);
      setLastSavedAt(new Date().toISOString());
      const statusRes = await setStatus(init.id!, "finalized");
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
    // Status transitions only apply to a persisted quote; a new quote reaches
    // "finalized" via finalize() (which creates the row first).
    const id = init.id;
    if (id === null) return;
    if (next === status && next !== "sent") return;
    const previous = status;
    setStatusState(next);
    startStatus(async () => {
      const res = await setStatus(id, next);
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
    clients, products: init.products, clientId, status, validUntil, taxRatePercent,
    orderDiscountType, orderDiscountValue, notes, lines,
    dirty, lastSavedAt, mounted, saving, statusPending,
    sendOpen, setSendOpen, selectedClient, locked, alreadySent, sentSiblings, totals,
    fieldError: validation.fieldError, lineErrors: validation.lineErrors, markTouched: validation.markTouched,
    updateLine, addLine, removeLine, addClient, changeClient,
    changeValidUntil, changeDiscount, changeTax, changeNotes,
    save, finalize, exportPdf, applyStatus,
  };
}
