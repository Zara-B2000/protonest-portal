"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatLKR } from "@/utils";
import { CreditCard, Building2, Loader2, ShieldCheck } from "lucide-react";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<{ order_number: string; project_name: string } | null>(null);
  const [quote, setQuote] = useState<{ id: string; amount_lkr: number } | null>(null);
  const [method, setMethod] = useState<"payhere" | "bank_transfer">("payhere");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data.order);
        setQuote(data.activeQuote);
        setLoading(false);
      });
  }, [id]);

  async function handlePayHere() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: id, gateway: "payhere" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initiate payment");

      // Build PayHere form and submit
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.checkout_url;
      Object.entries(data.params as Record<string, string>).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPaying(false);
    }
  }

  async function handleBankTransfer() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: id, gateway: "bank_transfer" }),
      });
      if (!res.ok) throw new Error("Failed to record bank transfer");
      router.push(`/orders/${id}?bank=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-md mx-auto text-center py-16 text-slate-500">
        No active quote found for this order.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Complete Payment</h1>
      <p className="text-sm text-slate-500 mb-6">
        {order?.order_number} — {order?.project_name}
      </p>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="text-center py-2">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Amount Due</p>
          <p className="text-4xl font-bold text-slate-900 mt-1">{formatLKR(quote.amount_lkr)}</p>
        </div>

        <div className="space-y-2">
          {[
            { value: "payhere",      icon: <CreditCard className="w-5 h-5" />, label: "Pay Online", desc: "Visa, Mastercard, Amex, Genie, FriMi, eZcash, mCash, internet banking" },
            { value: "bank_transfer", icon: <Building2 className="w-5 h-5" />,  label: "Bank Transfer", desc: "Manual EFT/TT — confirmation within 1 business day" },
          ].map((opt) => (
            <label key={opt.value}
              className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-all
              ${method === opt.value ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}
            >
              <input type="radio" name="method" value={opt.value}
                checked={method === opt.value}
                onChange={() => setMethod(opt.value as "payhere" | "bank_transfer")}
                className="sr-only"
              />
              <span className={method === opt.value ? "text-brand-600" : "text-slate-400"}>
                {opt.icon}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                <p className="text-xs text-slate-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {method === "bank_transfer" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Bank Transfer Details</p>
            <p>Bank: Commercial Bank of Ceylon</p>
            <p>Account: Protonest Technologies (Pvt) Ltd</p>
            <p>Account No: XXXX XXXX XXXX</p>
            <p>Branch: Colombo 03</p>
            <p className="pt-1">Reference: <strong>{order?.order_number}</strong></p>
            <p className="pt-1">After transfer, click confirm below. An admin will verify and update your order.</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={method === "payhere" ? handlePayHere : handleBankTransfer}
          disabled={paying}
          className="w-full bg-brand-700 text-white font-semibold py-3 rounded-md hover:bg-brand-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {paying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : method === "payhere" ? (
            "Pay Now"
          ) : (
            "I Have Made the Transfer"
          )}
        </button>

        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Secured by PayHere. Card details never stored by Protonest.
        </p>
      </div>
    </div>
  );
}
