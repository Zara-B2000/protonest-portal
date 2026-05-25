"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, formatLKR } from "@/lib/utils";
import {
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import type { QuoteStatus } from "@/types";

type ClientQuote = {
  id: string;
  amount_lkr: number;
  valid_until: string;
  status: QuoteStatus;
  created_at: string;
  orders: {
    id: string;
    order_number: string;
    project_name: string;
    customer_id: string;
  };
  payments?: { id: string; status: string; amount_lkr: number }[] | null;
};

interface Props {
  initialQuotes: ClientQuote[];
}

type TabType = "all" | "pending" | "accepted" | "expired";

function QuoteStatusBadge({ status, payments }: { status: QuoteStatus, payments?: ClientQuote['payments'] }) {
  const isPaid = payments?.some((p) => p.status === "completed");

  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </span>
    );
  }

  switch (status) {
    case "sent":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    case "accepted":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
          <CheckCircle2 className="w-3 h-3" /> Accepted
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" /> Expired
        </span>
      );
    case "revised":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">
          <FileText className="w-3 h-3" /> Revised
        </span>
      );
    case "draft":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
          Draft
        </span>
      );
  }
}

export default function QuotesClientPage({ initialQuotes }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Filtering Logic
  const filteredQuotes = initialQuotes.filter((quote) => {
    // Search match
    const searchMatch =
      quote.orders.project_name.toLowerCase().includes(search.toLowerCase()) ||
      quote.orders.order_number.toLowerCase().includes(search.toLowerCase());

    if (!searchMatch) return false;

    // Tab match
    if (activeTab === "all") return true;
    if (activeTab === "pending") {
      return quote.status === "sent" || quote.status === "revised";
    }
    if (activeTab === "accepted") {
      return quote.status === "accepted";
    }
    if (activeTab === "expired") {
      return quote.status === "expired";
    }
    return true;
  });

  // Calculate counts for filters
  const counts = {
    all: initialQuotes.length,
    pending: initialQuotes.filter((q) => ["sent", "revised"].includes(q.status)).length,
    accepted: initialQuotes.filter((q) => q.status === "accepted").length,
    expired: initialQuotes.filter((q) => q.status === "expired").length,
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* Breadcrumb / Back Link */}
      <div className="mb-2">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quotes & Invoices</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review, accept, and manage quotes for your PCB assembly orders
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 p-4 rounded-2xl shadow-lg">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#05060f]/60 p-1 rounded-xl border border-purple-950/25">
          {[
            { id: "all", label: "All Quotes", count: counts.all, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: "pending", label: "Pending", count: counts.pending, icon: <Clock className="w-3.5 h-3.5" /> },
            { id: "accepted", label: "Accepted", count: counts.accepted, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { id: "expired", label: "Expired", count: counts.expired, icon: <XCircle className="w-3.5 h-3.5" /> },
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

      {/* Quotes Output */}
      <div className="bg-[#0b0f19]/60 backdrop-blur-md border border-purple-950/20 rounded-2xl overflow-hidden shadow-lg">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-20 px-6">
            <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-300 mb-1">No quotes found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              We couldn&apos;t find any quotes matching your filters. Try adjusting your search term.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-purple-950/20 bg-slate-950/30 text-slate-400">
                    {["Order ID", "Project Name", "Amount (LKR)", "Status", "Valid Until", "Date Received", ""].map((th, i) => (
                      <th
                        key={i}
                        className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 ${
                          th === "" ? "w-10" : ""
                        }`}
                      >
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/10">
                  {filteredQuotes.map((quote) => {
                    const isPaid = quote.payments?.some((p) => p.status === "completed");
                    return (
                      <tr key={quote.id} className="hover:bg-slate-900/15 transition-colors group">
                        <td className="px-5 py-4 font-mono font-bold text-[#9D82F8] whitespace-nowrap">
                          <Link href={`/orders/${quote.orders.id}`} className="hover:underline">
                            {quote.orders.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-slate-200 font-medium max-w-[200px] truncate">
                          {quote.orders.project_name}
                        </td>
                        <td className="px-5 py-4 text-emerald-400 font-semibold whitespace-nowrap">
                          {formatLKR(quote.amount_lkr)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <QuoteStatusBadge status={quote.status} payments={quote.payments} />
                        </td>
                        <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                          {formatDate(quote.valid_until)}
                        </td>
                        <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                          {formatDate(quote.created_at)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/orders/${quote.orders.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors shadow shadow-black/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            {quote.status === "sent" ? "Review" : (quote.status === "accepted" && !isPaid ? "Pay Now" : "View")}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-purple-950/10">
              {filteredQuotes.map((quote) => {
                const isPaid = quote.payments?.some((p) => p.status === "completed");
                return (
                  <Link
                    key={quote.id}
                    href={`/orders/${quote.orders.id}`}
                    className="block p-5 hover:bg-slate-900/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-[#9D82F8]">{quote.orders.order_number}</span>
                      <QuoteStatusBadge status={quote.status} payments={quote.payments} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">{quote.orders.project_name}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                      <span className="text-emerald-400 font-medium">{formatLKR(quote.amount_lkr)}</span>
                      <span>Expires {formatDate(quote.valid_until)}</span>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                       <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9D82F8]">
                         {quote.status === "sent" ? "Review Quote" : (quote.status === "accepted" && !isPaid ? "Proceed to Payment" : "View Order")}
                         <ArrowRight className="w-3.5 h-3.5" />
                       </span>
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
