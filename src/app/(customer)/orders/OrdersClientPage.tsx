"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatLKR } from "@/lib/utils";
import {
  Search,
  PlusCircle,
  ArrowRight,
  Inbox,
  Clock,
  CheckCircle2,
  TrendingUp,
  Layers
} from "lucide-react";
import type { OrderStatus } from "@/types";

type ClientOrder = {
  id: string;
  order_number: string;
  project_name: string;
  units: number;
  assembly_type: string;
  status: OrderStatus;
  expected_delivery: string | null;
  created_at: string;
  quotes?: { amount_lkr: number; status: string }[] | null;
  payments?: { status: string; amount_lkr: number }[] | null;
};

interface Props {
  initialOrders: ClientOrder[];
}

type TabType = "all" | "active" | "pending" | "completed";

export default function OrdersClientPage({ initialOrders }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Filtering Logic
  const filteredOrders = initialOrders.filter((order) => {
    // Search match
    const searchMatch =
      order.project_name.toLowerCase().includes(search.toLowerCase()) ||
      order.order_number.toLowerCase().includes(search.toLowerCase());

    if (!searchMatch) return false;

    // Tab match
    if (activeTab === "all") return true;
    if (activeTab === "active") {
      return ["payment_completed", "components_received", "in_assembly", "inspection", "ready_for_delivery"].includes(order.status);
    }
    if (activeTab === "pending") {
      return ["quote_pending", "quote_ready"].includes(order.status);
    }
    if (activeTab === "completed") {
      return order.status === "delivered";
    }
    return true;
  });

  // Calculate counts for filters
  const counts = {
    all: initialOrders.length,
    active: initialOrders.filter((o) =>
      ["payment_completed", "components_received", "in_assembly", "inspection", "ready_for_delivery"].includes(o.status)
    ).length,
    pending: initialOrders.filter((o) =>
      ["quote_pending", "quote_ready"].includes(o.status)
    ).length,
    completed: initialOrders.filter((o) => o.status === "delivered").length,
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Orders</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track, search, and manage your PCB assembly requests
          </p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B5CF6] to-[#4530C8] hover:from-[#8d72f8] hover:to-[#553ed4] text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-200"
        >
          <PlusCircle className="w-4 h-4" /> Place New Order
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 p-4 rounded-2xl shadow-lg">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#05060f]/60 p-1 rounded-xl border border-purple-950/25">
          {[
            { id: "all", label: "All Orders", count: counts.all, icon: <Layers className="w-3.5 h-3.5" /> },
            { id: "pending", label: "Pending", count: counts.pending, icon: <Clock className="w-3.5 h-3.5" /> },
            { id: "active", label: "Active", count: counts.active, icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: "completed", label: "Completed", count: counts.completed, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#7B5CF6] text-white shadow-md shadow-purple-900/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.25 rounded-md ${
                  isActive ? "bg-purple-950/40 text-purple-200" : "bg-purple-950/15 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search by project or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9.5 pl-9 pr-4 bg-[#05060f]/50 border border-purple-950/30 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500/40 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-50% transform -translate-y-50% pointer-events-none" />
        </div>
      </div>

      {/* Orders Output */}
      <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl overflow-hidden shadow-lg">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 px-6">
            <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-300 mb-1">No orders found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              We couldn&apos;t find any orders matching your filters. Try adjusting your search term.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-purple-950/20 bg-slate-950/30 text-slate-400">
                    {["Order ID", "Project Name", "Units", "Status", "Quote", "Est. Delivery", "Placed Date"].map((th) => (
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
                  {filteredOrders.map((order) => {
                    const activeQuote = order.quotes?.[order.quotes.length - 1];
                    return (
                      <tr key={order.id} className="hover:bg-slate-900/15 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-[#9D82F8] whitespace-nowrap">
                          <Link href={`/orders/${order.id}`} className="hover:underline">
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-slate-200 font-medium max-w-[200px] truncate">
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
                            <span className="text-slate-500 italic text-xs">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                          {formatDate(order.expected_delivery)}
                        </td>
                        <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-purple-950/10">
              {filteredOrders.map((order) => {
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
                      <span>Placed {formatDate(order.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
