import Link from "next/link";
import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile } from "@/services/auth";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { formatDate, formatLKR } from "@/utils";
import { PlusCircle, PackageOpen } from "lucide-react";
import type { OrderStatus, PaymentStatus, QuoteStatus } from "@/types";
import { redirect } from "next/navigation";

type DashboardOrder = {
  id: string;
  order_number: string;
  project_name: string;
  units: number;
  assembly_type: string;
  status: OrderStatus;
  expected_delivery: string | null;
  created_at: string;
  quotes?: { amount_lkr: number; status: QuoteStatus }[] | null;
  payments?: { status: PaymentStatus }[] | null;
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = createServiceClient();

  const { data: ordersData } = await supabase
    .from("orders")
    .select(`
      id, order_number, project_name, units, assembly_type,
      status, expected_delivery, created_at,
      quotes(amount_lkr, status),
      payments(status)
    `)
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false });
  const orders = (ordersData ?? []) as DashboardOrder[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {orders.length} order{orders.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/orders/new"
          className="flex items-center gap-2 bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-900 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
          <PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No orders yet</h3>
          <p className="text-sm text-slate-500 mb-6">
            Submit your first PCB assembly order and get a quote in 24 hours.
          </p>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 bg-brand-700 text-white text-sm font-medium px-6 py-2.5 rounded-md hover:bg-brand-900 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Place Your First Order
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Order ID", "Project", "Units", "Status", "Quote", "Payment", "Submitted", "Est. Delivery"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const activeQuote = order.quotes?.[order.quotes.length - 1];
                  const payment = order.payments?.[0];
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-semibold text-brand-700">
                        <Link href={`/orders/${order.id}`} className="hover:underline">
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-900 max-w-[180px] truncate">{order.project_name}</td>
                      <td className="px-4 py-3 text-slate-600">{order.units}</td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {activeQuote
                          ? <span className="text-emerald-700 font-medium">{formatLKR(activeQuote.amount_lkr)}</span>
                          : <span className="text-slate-400">Pending</span>}
                      </td>
                      <td className="px-4 py-3">
                        {payment?.status === "completed"
                          ? <span className="text-emerald-700 font-medium">Paid</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(order.expected_delivery)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {orders.map((order) => {
              const activeQuote = order.quotes?.[order.quotes.length - 1];
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-brand-700">{order.order_number}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">{order.project_name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{order.units} unit{order.units !== 1 ? "s" : ""}</span>
                    {activeQuote && <span className="text-emerald-700 font-medium">{formatLKR(activeQuote.amount_lkr)}</span>}
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
