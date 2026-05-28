import Link from "next/link";
import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile } from "@/services/auth";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { formatDate, formatLKR } from "@/utils";
import { PlusCircle, PackageOpen, Sparkles, ArrowRight, TrendingUp, Clock, Layers, CircleDollarSign, FileText, ShieldCheck } from "lucide-react";
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
  payments?: { status: PaymentStatus; amount_lkr: number }[] | null;
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
      payments(status, amount_lkr)
    `)
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false });
    
  const orders = (ordersData ?? []) as DashboardOrder[];

  // Calculate Metrics
  const totalOrders = orders.length;

  const activeOrdersCount = orders.filter((o) =>
    ["payment_completed", "components_received", "in_assembly", "inspection", "ready_for_delivery"].includes(o.status)
  ).length;

  const pendingQuotesCount = orders.filter((o) =>
    ["quote_pending", "quote_ready"].includes(o.status)
  ).length;

  const totalSpent = orders.reduce((sum, order) => {
    const completedPayments = order.payments?.filter((p) => p.status === "completed") ?? [];
    return sum + completedPayments.reduce((acc, p) => acc + (p.amount_lkr || 0), 0);
  }, 0);

  return (
    <div className="space-y-8 font-sans antialiased text-slate-100">
      
      {/* ── PCB Art Greeting Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-[#131130] to-[#1c1444] border border-purple-950/40 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-purple-950/10">
        {/* Glow circles */}
        <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex-1 space-y-4 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-800/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> High-Fidelity PCB Prototyping
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-200">{profile.full_name || "Customer"}</span>
          </h1>
          <p className="text-slate-300 max-w-lg text-sm md:text-base leading-relaxed">
            Manage your custom PCB assembly projects, view detailed quotes, and track production stages in real time.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            <Link
              href="/orders/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B5CF6] to-[#4530C8] hover:from-[#8d72f8] hover:to-[#553ed4] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" /> Place New Order
            </Link>
            <Link
              href="/quotes"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-sm font-semibold px-4 py-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 transition-all"
            >
              Quotes & Invoices <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* PCB Assembly Cover Image */}
        <div className="relative z-10 hidden md:block flex-shrink-0">
          <div className="relative w-[260px] h-[156px] rounded-xl overflow-hidden border border-purple-800/25 shadow-2xl shadow-purple-950/20 group transition-all duration-300 hover:border-purple-500/35">
            <img
              src="/pcb-assembly-process.jpg"
              alt="Protonest Manual Component Tweezers PCB Placement"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent opacity-80 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Statistics Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl p-5 hover:border-purple-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Active Projects</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">{activeOrdersCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">In assembly or quality inspection</p>
        </div>

        {/* Card 2: Pending Action */}
        <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl p-5 hover:border-purple-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Pending Actions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">{pendingQuotesCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting price quote or payment</p>
        </div>

        {/* Card 3: Total Orders */}
        <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl p-5 hover:border-purple-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Total Placed</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Layers className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">{totalOrders}</div>
          <p className="text-[11px] text-slate-500 mt-1">All historical PCB placements</p>
        </div>

        {/* Card 4: Total Spent */}
        <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl p-5 hover:border-purple-500/20 transition-all duration-300 group shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Total Investments</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CircleDollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-bold text-white truncate" title={formatLKR(totalSpent)}>
            {formatLKR(totalSpent)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Completed payment records</p>
        </div>
      </div>

      {/* ── Main Dashboard Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Span: Recent Orders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-purple-950/20 flex items-center justify-between bg-slate-950/20">
              <h2 className="text-base font-bold text-white tracking-tight">Recent Production Orders</h2>
              {orders.length > 0 && (
                <Link
                  href="/orders"
                  className="text-xs text-[#9D82F8] hover:text-[#b49ffd] font-semibold flex items-center gap-1 transition-colors"
                >
                  View All Orders <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 px-6">
                <PackageOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No orders placed yet</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                  Get your PCB prototype assembled by submitting your design files and details today.
                </p>
                <Link
                  href="/orders/new"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7B5CF6] to-[#4530C8] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:from-[#8d72f8] hover:to-[#553ed4] transition-all shadow-md shadow-purple-900/30"
                >
                  <PlusCircle className="w-4 h-4" /> Place Your First Order
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950/20 bg-slate-950/40 text-slate-400">
                        {["Order ID", "Project Name", "Units", "Status", "Quote", "Est. Delivery"].map((th) => (
                          <th
                            key={th}
                            className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400"
                          >
                            {th}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/10">
                      {orders.slice(0, 5).map((order) => {
                        const activeQuote = order.quotes?.[order.quotes.length - 1];
                        return (
                          <tr key={order.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="px-5 py-4 font-mono font-bold text-[#9D82F8] whitespace-nowrap">
                              <Link href={`/orders/${order.id}`} className="hover:underline">
                                {order.order_number}
                              </Link>
                            </td>
                            <td className="px-5 py-4 text-slate-200 font-medium max-w-[180px] truncate">
                              {order.project_name}
                            </td>
                            <td className="px-5 py-4 text-slate-400">{order.units}</td>
                            <td className="px-5 py-4">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-5 py-4 text-slate-300 font-semibold">
                              {activeQuote ? (
                                <span className="text-emerald-400 font-medium">
                                  {formatLKR(activeQuote.amount_lkr)}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-xs">Pending Quote</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                              {formatDate(order.expected_delivery)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="md:hidden divide-y divide-purple-950/10">
                  {orders.slice(0, 5).map((order) => {
                    const activeQuote = order.quotes?.[order.quotes.length - 1];
                    return (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block p-5 hover:bg-slate-900/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-mono text-sm font-bold text-[#9D82F8]">{order.order_number}</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-200 mb-1">{order.project_name}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                          <span>{order.units} unit{order.units !== 1 ? "s" : ""}</span>
                          {activeQuote && (
                            <span className="text-emerald-400 font-medium">{formatLKR(activeQuote.amount_lkr)}</span>
                          )}
                          <span>Created {formatDate(order.created_at)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Span: Side Panel Quick Actions / Info */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-4">Quick Resources</h3>
            <div className="space-y-3">
              <a
                href="/orders/new"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-purple-950/20 hover:border-purple-500/25 text-slate-300 hover:text-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">New Assembly Quote</div>
                    <div className="text-[10px] text-slate-500">Configure boards & upload BOM</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </a>

              <a
                href="/quotes"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-purple-950/20 hover:border-purple-500/25 text-slate-300 hover:text-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Invoices & Statements</div>
                    <div className="text-[10px] text-slate-500">Review outstanding payments</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
          </div>

          {/* Why Protonest Assembly Panel */}
          <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            {/* Soft decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-xs font-bold text-[#9D82F8] tracking-wider uppercase mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#9D82F8]" />
              Why Protonest Assembly?
            </h3>
            
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <span className="text-base select-none">⚡</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Quick quotes, no back-and-forth delays</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Instant online setup and automatic verification.</p>
                </div>
              </li>
              
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="text-base select-none">🔩</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">From bare board to assembled unit</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">End-to-end component sourcing, stencil & soldering.</p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <span className="text-base select-none">🧪</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Every board tested before dispatch</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Rigorous AOI and functional quality inspection.</p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <span className="text-base select-none">🤝</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Real humans behind every order</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Engaged technical review and engineering assistance.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* DFM Specifications Card */}
          <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 text-white mb-3">
              <ShieldCheck className="w-4.5 h-4.5 text-[#9D82F8]" />
              <h3 className="text-xs font-bold tracking-wider uppercase">DFM Production Guidelines</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-[#9D82F8] font-bold">•</span>
                <span>Minimum trace width / space: <strong>4mil / 4mil</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9D82F8] font-bold">•</span>
                <span>Supported copper weight: <strong>0.5oz to 3oz</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9D82F8] font-bold">•</span>
                <span>Standard FR4 Tg temperature: <strong>140°C / 170°C</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9D82F8] font-bold">•</span>
                <span>BOM formats: <strong>Excel (.xlsx) or CSV</strong> with manufacturer parts</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
