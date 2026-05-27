"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusTimeline } from "@/components/shared/StatusTimeline";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { formatDate, formatDateTime, formatLKR, formatFileSize } from "@/utils";
import {
  ASSEMBLY_TYPE_LABELS, INSPECTION_LEVEL_LABELS, FILE_TYPE_LABELS,
  ORDER_STATUS_STEPS, type OrderStatus
} from "@/types";
import { FileDown, Save, Send, ChevronRight, Loader2, Banknote, Gift } from "lucide-react";
import Link from "next/link";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  // Quote form
  const [quoteAmount, setQuoteAmount]   = useState("");
  const [quoteCustomerNotes, setQuoteCustomerNotes] = useState("");
  const [quoteAdminNotes,    setQuoteAdminNotes]    = useState("");
  const [quoteDays,          setQuoteDays]          = useState("7");
  const [savingQuote,        setSavingQuote]        = useState(false);
  const [quoteMsg,           setQuoteMsg]           = useState("");

  // Status control
  const [newStatus,      setNewStatus]      = useState<OrderStatus | "">("");
  const [statusNote,     setStatusNote]     = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMsg,      setStatusMsg]      = useState("");

  // Admin note
  const [noteText,    setNoteText]    = useState("");
  const [savingNote,  setSavingNote]  = useState(false);

  // Bank transfer confirm
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState("");

  // Discount token
  const [tokenType, setTokenType] = useState<"fixed" | "percentage">("fixed");
  const [tokenValue, setTokenValue] = useState("500");
  const [tokenDays, setTokenDays] = useState("90");
  const [issuingToken, setIssuingToken] = useState(false);
  const [tokenMsg, setTokenMsg] = useState("");

  async function loadOrder() {
    const res = await fetch(`/api/admin/orders/${id}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { loadOrder(); }, [id]);

  async function saveQuote() {
    if (!quoteAmount) return;
    setSavingQuote(true);
    setQuoteMsg("");
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: id,
        amount_lkr: parseFloat(quoteAmount),
        customer_notes: quoteCustomerNotes || null,
        admin_notes: quoteAdminNotes || null,
        valid_days: parseInt(quoteDays),
      }),
    });
    const result = await res.json();
    if (!res.ok) { setQuoteMsg("Error: " + (result.error ?? "Failed")); }
    else { setQuoteMsg("Quote saved and sent to customer!"); await loadOrder(); }
    setSavingQuote(false);
  }

  async function updateStatus() {
    if (!newStatus) return;
    setUpdatingStatus(true);
    setStatusMsg("");
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: id, new_status: newStatus,
        note: statusNote || null,
        expected_delivery: expectedDelivery || null,
      }),
    });
    const result = await res.json();
    if (!res.ok) { setStatusMsg("Error: " + (result.error ?? "Failed")); }
    else { setStatusMsg("Status updated!"); setNewStatus(""); setStatusNote(""); await loadOrder(); }
    setUpdatingStatus(false);
  }

  async function saveNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await fetch(`/api/admin/orders/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note_text: noteText }),
    });
    setNoteText("");
    await loadOrder();
    setSavingNote(false);
  }

  async function confirmBankTransfer() {
    setConfirmingPayment(true);
    setPaymentMsg("");
    const res = await fetch(`/api/admin/orders/${id}/confirm-payment`, { method: "POST" });
    const result = await res.json();
    if (!res.ok) setPaymentMsg("Error: " + (result.error ?? "Failed"));
    else { setPaymentMsg("Payment confirmed — customer notified."); await loadOrder(); }
    setConfirmingPayment(false);
  }

  async function issueDiscountToken() {
    setIssuingToken(true);
    setTokenMsg("");
    const res = await fetch(`/api/admin/orders/${id}/discount-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discount_type: tokenType,
        discount_value: parseFloat(tokenValue),
        valid_days: parseInt(tokenDays),
      }),
    });
    const result = await res.json();
    if (!res.ok) setTokenMsg("Error: " + (result.error ?? "Failed"));
    else setTokenMsg(`Token issued: ${result.token.token_code} — emailed to customer.`);
    await loadOrder();
    setIssuingToken(false);
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>;
  }

  const order = data?.order as Record<string, unknown>;
  const files = data?.files as Array<Record<string, unknown>> ?? [];
  const quotes = data?.quotes as Array<Record<string, unknown>> ?? [];
  const statusHistory = data?.statusHistory as Array<Record<string, unknown>> ?? [];
  const adminNotes = data?.adminNotes as Array<Record<string, unknown>> ?? [];
  const payments = data?.payments as Array<Record<string, unknown>> ?? [];
  const discountTokens = data?.discountTokens as Array<Record<string, unknown>> ?? [];
  const sourcing = data?.sourcing as Record<string, unknown> | null;

  const pendingBankTransfer = payments.find(
    (p) => p.gateway === "bank_transfer" && p.status === "pending"
  );

  const currentStatusIndex = ORDER_STATUS_STEPS.findIndex((s) => s.status === order?.status);
  const nextStatuses = ORDER_STATUS_STEPS.slice(currentStatusIndex + 1).map((s) => s.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold font-mono text-brand-700">
            {order?.order_number as string}
          </h1>
          <OrderStatusBadge status={order?.status as OrderStatus} />
        </div>
        <Link href="/admin/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          ← Dashboard
        </Link>
      </div>

      <StatusTimeline
        currentStatus={order?.status as OrderStatus}
        history={statusHistory as unknown as Parameters<typeof StatusTimeline>[0]["history"]}
      />

      {/* ── Customer + Order Info ────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Customer</h2>
          {(["full_name", "email", "phone", "company"] as const).map((k) => {
            const profile = data?.customer as Record<string, string | null>;
            return profile?.[k] ? (
              <div key={k} className="mb-1.5">
                <span className="text-xs text-slate-400 capitalize">{k.replace("_", " ")}: </span>
                <span className="text-sm text-slate-900">{profile[k]}</span>
              </div>
            ) : null;
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Order Details</h2>
          {[
            ["Project", order?.project_name],
            ["Units", order?.units],
            ["Assembly", ASSEMBLY_TYPE_LABELS[order?.assembly_type as keyof typeof ASSEMBLY_TYPE_LABELS]],
            ["Inspection", INSPECTION_LEVEL_LABELS[order?.inspection_level as keyof typeof INSPECTION_LEVEL_LABELS]],
            ["Submitted", formatDate(order?.created_at as string)],
          ].map(([l, v]) => (
            <div key={String(l)} className="flex justify-between mb-1.5 text-sm">
              <span className="text-slate-400">{String(l)}</span>
              <span className="text-slate-900 font-medium">{String(v)}</span>
            </div>
          ))}
          {typeof order?.customer_notes === "string" && order.customer_notes && (
            <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded p-2">
              {order.customer_notes}
            </p>
          )}
        </div>
      </div>

      {/* ── Files ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Uploaded Files</h2>
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id as string} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {FILE_TYPE_LABELS[f.file_type as keyof typeof FILE_TYPE_LABELS]}
                </p>
                <p className="text-xs text-slate-400">{f.original_name as string} · {formatFileSize(f.file_size_bytes as number | null)}</p>
              </div>
              <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
                <FileDown className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── Component Sourcing ───────────────────────────────────────────── */}
      {sourcing && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Component Sourcing</h2>
          <div className="text-sm space-y-1">
            <p><span className="text-slate-400">Option: </span>
              <span className="font-medium capitalize">{(sourcing.sourcing_option as string).replace("_", " ")}</span></p>
            {sourcing.sourcing_option === "protonest" && (
              <p><span className="text-slate-400">Allow equivalents: </span>
                <span className="font-medium">{sourcing.allow_equivalents ? "Yes" : "No"}</span></p>
            )}
            {typeof sourcing.customer_supplied_note === "string" && sourcing.customer_supplied_note && (
              <p><span className="text-slate-400">Notes: </span>{sourcing.customer_supplied_note}</p>
            )}
            {typeof sourcing.expected_arrival === "string" && sourcing.expected_arrival && (
              <p><span className="text-slate-400">Expected arrival: </span>{formatDate(sourcing.expected_arrival)}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Payments ─────────────────────────────────────────────────────── */}
      {payments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Payment</h2>
          {payments.map((p) => (
            <div key={p.id as string} className="text-sm flex flex-wrap gap-4">
              <span><span className="text-slate-400">Gateway: </span><span className="font-medium capitalize">{(p.gateway as string).replace("_", " ")}</span></span>
              <span><span className="text-slate-400">Amount: </span><span className="font-medium">{formatLKR(p.amount_lkr as number)}</span></span>
              <span><span className="text-slate-400">Status: </span>
                <span className={`font-medium ${p.status === "completed" ? "text-emerald-700" : "text-amber-600"}`}>
                  {p.status as string}
                </span>
              </span>
              {typeof p.gateway_reference === "string" && p.gateway_reference && (
                <span><span className="text-slate-400">Ref: </span><span className="font-mono">{p.gateway_reference}</span></span>
              )}
            </div>
          ))}
          {pendingBankTransfer && order?.status === "quote_ready" && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-amber-800 mb-3">
                Customer selected bank transfer. Confirm once funds are received.
              </p>
              {paymentMsg && (
                <p className={`text-sm mb-2 ${paymentMsg.startsWith("Error") ? "text-red-600" : "text-emerald-700"}`}>
                  {paymentMsg}
                </p>
              )}
              <button
                onClick={confirmBankTransfer}
                disabled={confirmingPayment}
                className="flex items-center gap-2 bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-md hover:bg-emerald-800 disabled:opacity-40 transition-colors"
              >
                {confirmingPayment
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
                  : <><Banknote className="w-4 h-4" /> Confirm Bank Transfer</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Reorder discount token (delivered orders) ──────────────────────── */}
      {order?.status === "delivered" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5" /> Reorder Discount Token
          </h2>
          {discountTokens.length > 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm">
              <p className="text-emerald-800 font-medium font-mono">{discountTokens[0].token_code as string}</p>
              <p className="text-emerald-600 text-xs mt-1">
                {(discountTokens[0].discount_type as string) === "fixed"
                  ? formatLKR(discountTokens[0].discount_value as number)
                  : `${discountTokens[0].discount_value}%`} off · valid until {formatDate(discountTokens[0].valid_until as string)}
                {discountTokens[0].used ? " · Used" : ""}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Issue a one-time reorder code for this customer (activity: issue discount token).
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select value={tokenType} onChange={(e) => setTokenType(e.target.value as "fixed" | "percentage")}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                    <option value="fixed">Fixed (LKR)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                  <input type="number" value={tokenValue} onChange={(e) => setTokenValue(e.target.value)}
                    min={1} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valid (days)</label>
                  <input type="number" value={tokenDays} onChange={(e) => setTokenDays(e.target.value)}
                    min={1} max={365} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {tokenMsg && (
                <p className={`mt-2 text-sm ${tokenMsg.startsWith("Error") ? "text-red-600" : "text-emerald-700"}`}>
                  {tokenMsg}
                </p>
              )}
              <button onClick={issueDiscountToken} disabled={issuingToken}
                className="mt-4 flex items-center gap-2 bg-brand-700 text-white text-sm font-semibold px-5 py-2 rounded-md hover:bg-brand-900 disabled:opacity-40 transition-colors">
                {issuingToken ? <><Loader2 className="w-4 h-4 animate-spin" /> Issuing…</> : <><Gift className="w-4 h-4" /> Issue Reorder Token</>}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Quote Section ────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
          {quotes.length > 0 ? "Quote (Revise)" : "Create Quote"}
        </h2>
        {quotes.length > 0 && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm">
            <p className="text-emerald-800 font-medium">Current quote: {formatLKR((quotes[quotes.length - 1].amount_lkr as number))}</p>
            <p className="text-emerald-600 text-xs mt-0.5">
              Valid until: {formatDateTime(quotes[quotes.length - 1].valid_until as string)} · Status: {quotes[quotes.length - 1].status as string}
            </p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount (LKR) *</label>
            <input type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)}
              placeholder="e.g. 25000" min={1}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valid for (days)</label>
            <input type="number" value={quoteDays} onChange={(e) => setQuoteDays(e.target.value)}
              min={1} max={30}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes for customer <span className="text-slate-400 font-normal">(visible to customer)</span></label>
            <textarea value={quoteCustomerNotes} onChange={(e) => setQuoteCustomerNotes(e.target.value)}
              rows={2} maxLength={1000}
              placeholder="Component notes, lead time details, any special instructions for the customer…"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Internal notes <span className="text-red-400 font-normal">(admin only — NEVER shown to customer)</span>
            </label>
            <textarea value={quoteAdminNotes} onChange={(e) => setQuoteAdminNotes(e.target.value)}
              rows={2} maxLength={2000}
              placeholder="Supplier costs, markup notes, internal calculations…"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none bg-amber-50"
            />
          </div>
        </div>
        {quoteMsg && (
          <p className={`mt-2 text-sm ${quoteMsg.startsWith("Error") ? "text-red-600" : "text-emerald-700"}`}>
            {quoteMsg}
          </p>
        )}
        <button onClick={saveQuote} disabled={savingQuote || !quoteAmount}
          className="mt-4 flex items-center gap-2 bg-brand-700 text-white text-sm font-semibold px-5 py-2 rounded-md hover:bg-brand-900 disabled:opacity-40 transition-colors"
        >
          {savingQuote ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Send className="w-4 h-4" /> Save &amp; Notify Customer</>}
        </button>
      </div>

      {/* ── Status Control ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Update Status</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Select next status —</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_STEPS.find((step) => step.status === s)?.label ?? s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expected Delivery Date (optional)</label>
            <input type="date" value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
            <input type="text" value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Reason or note for this status change…" maxLength={500}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        {statusMsg && (
          <p className={`mt-2 text-sm ${statusMsg.startsWith("Error") ? "text-red-600" : "text-emerald-700"}`}>
            {statusMsg}
          </p>
        )}
        <button onClick={updateStatus} disabled={updatingStatus || !newStatus}
          className="mt-4 flex items-center gap-2 bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-md hover:bg-emerald-800 disabled:opacity-40 transition-colors"
        >
          {updatingStatus ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : <><ChevronRight className="w-4 h-4" /> Update Status &amp; Notify</>}
        </button>
      </div>

      {/* ── Admin Notes ─────────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
          Internal Notes <span className="normal-case font-normal">(admin only — never shown to customer)</span>
        </h2>
        <div className="space-y-2 mb-4">
          {adminNotes.length === 0 && <p className="text-xs text-amber-600">No internal notes yet.</p>}
          {adminNotes.map((n) => (
            <div key={n.id as string} className="bg-white border border-amber-200 rounded-md p-3">
              <p className="text-sm text-slate-800">{n.note_text as string}</p>
              <p className="text-xs text-slate-400 mt-1">{(n.profiles as Record<string, string>)?.full_name ?? "Admin"} · {formatDateTime(n.created_at as string)}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
            rows={2} maxLength={500} placeholder="Add an internal note…"
            className="flex-1 border border-amber-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
          />
          <button onClick={saveNote} disabled={savingNote || !noteText.trim()}
            className="self-start flex items-center gap-1 bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-amber-700 disabled:opacity-40 transition-colors"
          >
            {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Status History ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Status History</h2>
        <div className="space-y-2">
          {statusHistory.length === 0 && <p className="text-xs text-slate-400">No history yet.</p>}
          {statusHistory.map((h) => (
            <div key={h.id as string} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-slate-900">
                  {h.old_status ? `${h.old_status} → ` : ""}{h.new_status as string}
                </span>
                {typeof h.note === "string" && h.note && <span className="text-slate-500"> — {h.note}</span>}
                <p className="text-xs text-slate-400">
                  {(h.profiles as Record<string, string>)?.full_name ?? "System"} · {formatDateTime(h.changed_at as string)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
