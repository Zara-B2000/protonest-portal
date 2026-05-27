import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { requireCurrentProfile } from "@/services/auth";
import {
  generatePayHereHash,
  formatAmount,
  getMerchantId,
  PAYHERE_CHECKOUT_URL,
} from "@/services/payments/payhere";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  const profile = await requireCurrentProfile();
  const service = createServiceClient();

  const body = await request.json();
  const { order_id, gateway } = body as { order_id: string; gateway: "payhere" | "bank_transfer" };

  if (!order_id || !["payhere", "bank_transfer"].includes(gateway)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: order } = await service
    .from("orders")
    .select("id, order_number, project_name, status, customer_id, profiles(full_name, email, phone)")
    .eq("id", order_id)
    .eq("customer_id", profile.id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "quote_ready") {
    return NextResponse.json({ error: "Order is not in a payable state" }, { status: 400 });
  }

  const { data: quotes } = await service
    .from("quotes")
    .select("id, amount_lkr, valid_until")
    .eq("order_id", order_id)
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1);

  const quote = quotes?.[0];
  if (!quote) return NextResponse.json({ error: "No active quote found" }, { status: 404 });

  if (new Date(quote.valid_until) < new Date()) {
    return NextResponse.json({ error: "Quote has expired" }, { status: 400 });
  }

  // Create payment record
  const { data: payment, error: payErr } = await service
    .from("payments")
    .insert({
      order_id,
      quote_id:          quote.id,
      gateway,
      amount_lkr:        quote.amount_lkr,
      status:            "pending",
      gateway_reference: order.order_number,
    })
    .select()
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "Failed to create payment record" }, { status: 500 });
  }

  // Bank transfer: just return success — admin confirms manually
  if (gateway === "bank_transfer") {
    return NextResponse.json({ success: true, payment_id: payment.id });
  }

  // PayHere: build checkout params
  const rawProfile = order.profiles;
  const customer = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as Record<string, string> | null;
  const nameParts = (customer?.full_name ?? "Customer").split(" ");
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(" ") || "-";
  const amount    = formatAmount(quote.amount_lkr);
  const currency  = "LKR";

  const hash = generatePayHereHash(payment.id, amount, currency);

  const params: Record<string, string> = {
    merchant_id:  getMerchantId(),
    return_url:   `${APP_URL}/orders/${order_id}?payment=success`,
    cancel_url:   `${APP_URL}/orders/${order_id}?payment=cancelled`,
    notify_url:   `${APP_URL}/api/payments/notify`,
    order_id:     payment.id,       // use payment record ID so IPN maps back exactly
    items:        `PCB Assembly: ${order.project_name}`,
    currency,
    amount,
    first_name:   firstName,
    last_name:    lastName,
    email:        customer?.email ?? profile.email ?? "",
    phone:        customer?.phone ?? "",
    address:      "N/A",
    city:         "Colombo",
    country:      "Sri Lanka",
    hash,
  };

  return NextResponse.json({ checkout_url: PAYHERE_CHECKOUT_URL, params });
}
