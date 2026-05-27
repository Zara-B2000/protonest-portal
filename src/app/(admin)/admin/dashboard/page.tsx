import { createServiceClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { formatDate, formatLKR } from "@/utils";
import type { OrderStatus } from "@/types";
import { getCurrentProfile, isAdminProfile } from "@/services/auth";
import { AlertTriangle, Clock, Package, CheckSquare } from "lucide-react";

type OrderProfile = { full_name: string | null; email: string };
type AdminOrder = {
  id: string;
  order_number: string;
  project_name: string;
  units: number;
  status: OrderStatus;
  expected_delivery: string | null;
  created_at: string;
  profiles: OrderProfile | OrderProfile[] | null;
  quotes: { amount_lkr: number; status: string }[] | null;
  payments: { status: string }[] | null;
};

function orderCustomer(profiles: OrderProfile | OrderProfile[] | null | undefined): OrderProfile | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

export default async function AdminDashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isAdminProfile(profile)) redirect("/dashboard");

  const adminSupabase = createServiceClient();

  // Fetch all orders with related data
  const { data: rawOrders, error: ordersError } = await adminSupabase
    .from("orders")
    .select(`
      id, order_number, project_name, units, status,
      expected_delivery, created_at,
      profiles(full_name, email),
      quotes(amount_lkr, status),
      payments(status)
    `)
    .order("created_at", { ascending: false });

  if (ordersError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5">
        <h1 className="text-lg font-bold mb-2">Admin Dashboard Error</h1>
        <p className="text-sm">{ordersError.message}</p>
      </div>
    );
  }
  const orders = (rawOrders ?? []) as AdminOrder[];

  const today = new Date();
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(today.getDate() + 2);

  const panels = {
    new_requests: orders.filter((o) => o.status === "quote_pending"),
    pending_quotes: orders.filter((o) => o.status === "quote_ready"),
    active: orders.filter((o) =>
      ["payment_completed", "components_received", "in_assembly", "inspection"].includes(o.status)
    ),
    near_deadline: orders.filter((o) => {
      if (!o.expected_delivery || o.status === "delivered") return false;
      const d = new Date(o.expected_delivery);
      return d >= today && d <= twoDaysFromNow;
    }),
    delayed: orders.filter((o) => {
      if (!o.expected_delivery || o.status === "delivered") return false;
      return new Date(o.expected_delivery) < today;
    }),
  };

  const summaryCards = [
    { label: "New Requests",    value: panels.new_requests.length,   color: "bg-amber-50 border-amber-200 text-amber-700",  icon: <Clock className="w-5 h-5" /> },
    { label: "Awaiting Payment",value: panels.pending_quotes.length, color: "bg-blue-50 border-blue-200 text-blue-700",    icon: <CheckSquare className="w-5 h-5" /> },
    { label: "Active Orders",   value: panels.active.length,         color: "bg-purple-50 border-purple-200 text-purple-700", icon: <Package className="w-5 h-5" /> },
    { label: "Need Attention",  value: panels.near_deadline.length + panels.delayed.length, color: "bg-red-50 border-red-200 text-red-700", icon: <AlertTriangle className="w-5 h-5" /> },
  ];

  function OrderTable({ items, emptyMsg }: {
    items: AdminOrder[];
    emptyMsg: string;
  }) {
    if (!items || items.length === 0) {
      return <p className="text-sm text-slate-400 py-4 text-center">{emptyMsg}</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {["Order ID", "Customer", "Project", "Units", "Status", "Quote", "Payment", "Deadline"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((o) => {
              const quote = o.quotes?.[o.quotes.length - 1];
              const payment = o.payments?.[0];
              const customer = orderCustomer(o.profiles as OrderProfile | OrderProfile[] | null);
              const isDelayed = o.expected_delivery && new Date(o.expected_delivery) < today && o.status !== "delivered";
              return (
                <tr key={o.id} className={`hover:bg-slate-50 ${isDelayed ? "bg-red-50/40" : ""}`}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-brand-700 font-semibold hover:underline whitespace-nowrap">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-[120px] truncate">
                    {customer?.full_name || customer?.email}
                  </td>
                  <td className="px-3 py-2 text-slate-900 max-w-[160px] truncate">{o.project_name}</td>
                  <td className="px-3 py-2 text-slate-600">{o.units}</td>
                  <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-3 py-2">
                    {quote ? <span className="text-emerald-700 font-medium">{formatLKR(quote.amount_lkr)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {payment?.status === "completed"
                      ? <span className="text-emerald-700 font-medium">Paid</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isDelayed ? "text-red-600 font-medium" : "text-slate-500"}`}>
                    {formatDate(o.expected_delivery)}
                    {isDelayed && " ⚠"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className={`border rounded-xl p-5 flex items-center gap-3 ${c.color}`}>
            {c.icon}
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs font-medium">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Panels */}
      {[
        { title: "🆕 New Requests — Needs Quote",     items: panels.new_requests,   empty: "No new requests" },
        { title: "⏳ Quote Sent — Awaiting Payment",  items: panels.pending_quotes, empty: "No pending quotes" },
        { title: "⚙️  Active Orders",                 items: panels.active,         empty: "No active orders" },
        { title: "⚠️  Near Deadline / Delayed",        items: [...panels.near_deadline, ...panels.delayed], empty: "No deadline issues" },
      ].map((panel) => (
        <div key={panel.title} className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{panel.title}</h2>
          <OrderTable items={panel.items} emptyMsg={panel.empty} />
        </div>
      ))}
    </div>
  );
}
