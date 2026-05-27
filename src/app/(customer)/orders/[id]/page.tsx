import { createServiceClient } from "@/services/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/services/auth";
import { StatusTimeline } from "@/components/shared/StatusTimeline";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import {
  formatDate, formatDateTime, formatLKR, formatFileSize
} from "@/utils";
import {
  ASSEMBLY_TYPE_LABELS, INSPECTION_LEVEL_LABELS, FILE_TYPE_LABELS
} from "@/types";
import { FileDown, CreditCard } from "lucide-react";
import Link from "next/link";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      order_files(*),
      component_sourcing(*),
      status_history(*, profiles(full_name, email)),
      quotes(id, amount_lkr, customer_notes, valid_until, status, created_at),
      payments(status, amount_lkr, gateway, created_at)
    `)
    .eq("id", id)
    .eq("customer_id", profile.id)
    .single();

  if (!order) notFound();

  const activeQuote = order.quotes
    ?.filter((q: { status: string }) => q.status !== "expired")
    .sort((a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

  const completedPayment = order.payments?.find(
    (p: { status: string }) => p.status === "completed"
  );

  const canPay =
    order.status === "quote_ready" &&
    activeQuote &&
    new Date(activeQuote.valid_until) > new Date() &&
    !completedPayment;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono text-brand-700">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-slate-600 mt-1">{order.project_name}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          ← My Orders
        </Link>
      </div>

      {/* ── Status Timeline ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-5">Order Progress</h2>
        <StatusTimeline currentStatus={order.status} history={order.status_history ?? []} />
        {order.expected_delivery && (
          <p className="mt-5 text-sm text-slate-500 text-center">
            Estimated delivery: <span className="font-semibold text-slate-800">{formatDate(order.expected_delivery)}</span>
          </p>
        )}
      </div>

      {/* ── Quote / Payment ──────────────────────────────────────────────── */}
      {activeQuote && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Quote</h2>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-3xl font-bold text-slate-900">{formatLKR(activeQuote.amount_lkr)}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Valid until: {formatDateTime(activeQuote.valid_until)}
              </p>
              {activeQuote.customer_notes && (
                <p className="text-sm text-slate-600 mt-2 p-3 bg-slate-50 rounded-md">
                  {activeQuote.customer_notes}
                </p>
              )}
            </div>
            {completedPayment ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md text-sm font-semibold">
                ✓ Paid
              </span>
            ) : canPay ? (
              <Link
                href={`/orders/${order.id}/pay`}
                className="flex items-center gap-2 bg-brand-700 text-white font-semibold px-6 py-3 rounded-md hover:bg-brand-900 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Accept &amp; Pay
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Order Details ────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Order Details</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ["Units",          `${order.units} unit${order.units !== 1 ? "s" : ""}`],
            ["Assembly Type",  ASSEMBLY_TYPE_LABELS[order.assembly_type as keyof typeof ASSEMBLY_TYPE_LABELS]],
            ["Inspection",     INSPECTION_LEVEL_LABELS[order.inspection_level as keyof typeof INSPECTION_LEVEL_LABELS]],
            ["Submitted",      formatDate(order.created_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
              <p className="font-medium text-slate-900 mt-0.5">{value}</p>
            </div>
          ))}
          {order.customer_notes && (
            <div className="col-span-2">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Your Notes</p>
              <p className="text-slate-700 mt-0.5">{order.customer_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Uploaded Files ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Uploaded Files</h2>
        {order.order_files?.length === 0 ? (
          <p className="text-sm text-slate-400">No files uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {order.order_files?.map((file: {
              id: string; file_type: string; original_name: string; file_size_bytes: number | null
            }) => (
              <div key={file.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {FILE_TYPE_LABELS[file.file_type as keyof typeof FILE_TYPE_LABELS]}
                  </p>
                  <p className="text-xs text-slate-400">
                    {file.original_name} · {formatFileSize(file.file_size_bytes)}
                  </p>
                </div>
                <a
                  href={`/api/files/${file.id}`}
                  className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileDown className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Support ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-500 text-center">
        Questions about this order? Call or WhatsApp us at{" "}
        <a href="tel:+94XXXXXXXXX" className="text-brand-500 hover:underline font-medium">
          +94 XX XXX XXXX
        </a>{" "}
        and quote your order ID: <span className="font-mono font-semibold text-slate-700">{order.order_number}</span>
      </div>
    </div>
  );
}
