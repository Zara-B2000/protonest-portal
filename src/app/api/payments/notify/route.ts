import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import {
  verifyPayHereIPN,
  formatAmount,
  PAYHERE_STATUS,
} from "@/services/payments/payhere";
import type { PayHereIPN } from "@/types";
import { triggerNotifications } from "@/services/notifications";

/**
 * PayHere IPN (Instant Payment Notification) endpoint.
 *
 * SECURITY RULES (mandatory):
 * 1. Verify MD5 hash before touching any database record.
 * 2. Verify the amount matches our stored quote amount.
 * 3. Handle duplicate callbacks idempotently.
 * 4. Never return sensitive error details.
 * 5. This endpoint must be publicly reachable (not localhost).
 */
export async function POST(request: Request) {
  let rawBody: Record<string, string>;

  try {
    // PayHere sends application/x-www-form-urlencoded
    const text = await request.text();
    rawBody = Object.fromEntries(new URLSearchParams(text));
  } catch {
    console.error("[IPN] Failed to parse request body");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const ipn = rawBody as unknown as PayHereIPN;

  // ── Step 1: Verify MD5 hash ────────────────────────────────────────────
  const isValid = verifyPayHereIPN({
    merchant_id:      ipn.merchant_id,
    order_id:         ipn.order_id,
    payhere_amount:   ipn.payhere_amount,
    payhere_currency: ipn.payhere_currency,
    status_code:      ipn.status_code,
    md5sig:           ipn.md5sig,
  });

  if (!isValid) {
    console.warn("[IPN] Hash verification FAILED for order_id:", ipn.order_id);
    // Return 200 to PayHere so it doesn't keep retrying, but don't update anything
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const service = createServiceClient();

  // ── Step 2: Fetch payment record ──────────────────────────────────────
  const { data: payment } = await service
    .from("payments")
    .select("*, orders(*, profiles(*))")
    .eq("id", ipn.order_id)  // payment.id was used as PayHere order_id
    .single();

  if (!payment) {
    console.warn("[IPN] Payment record not found:", ipn.order_id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── Step 3: Idempotency — skip if already processed ───────────────────
  if (payment.status === "completed" && ipn.status_code === PAYHERE_STATUS.SUCCESS) {
    console.log("[IPN] Duplicate success callback ignored:", ipn.order_id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── Step 4: Verify amount matches ─────────────────────────────────────
  const expectedAmount = formatAmount(payment.amount_lkr);
  if (ipn.payhere_amount !== expectedAmount) {
    console.error(
      `[IPN] Amount mismatch! Expected: ${expectedAmount}, Got: ${ipn.payhere_amount}`
    );
    // Do NOT update payment. Log and alert admin.
    await service.from("notifications").insert({
      order_id:    payment.order_id,
      customer_id: null,
      channel:     "email",
      event_type:  "payment_amount_mismatch",
      recipient:   "admin@protonest.lk",
      status:      "failed",
      error_reason: `Amount mismatch: expected ${expectedAmount}, got ${ipn.payhere_amount}`,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── Step 5: Process based on status_code ──────────────────────────────
  if (ipn.status_code === PAYHERE_STATUS.SUCCESS) {
    // Update payment to completed
    await service.from("payments")
      .update({
        status:             "completed",
        payhere_payment_id: ipn.payment_id,
        ipn_verified:       true,
        verified_at:        new Date().toISOString(),
        raw_ipn:            rawBody,
      })
      .eq("id", payment.id);

    // Update order status
    const order = payment.orders as Record<string, unknown>;
    await service.from("orders")
      .update({ status: "payment_completed" })
      .eq("id", payment.order_id);

    // Log status history
    await service.from("status_history").insert({
      order_id:   payment.order_id,
      changed_by: (order.customer_id as string),
      old_status: "quote_ready",
      new_status: "payment_completed",
      note:       `PayHere payment verified. Payment ID: ${ipn.payment_id}`,
    });

    // Mark quote as accepted
    if (payment.quote_id) {
      await service.from("quotes")
        .update({ status: "accepted" })
        .eq("id", payment.quote_id);
    }

    // Notify customer
    const customer = (order.profiles as Record<string, unknown>);
    if (customer) {
      const { data: quoteData } = await service
        .from("quotes").select("*").eq("id", payment.quote_id).single();
      await triggerNotifications({
        order: { ...order, status: "payment_completed" } as Parameters<typeof triggerNotifications>[0]["order"],
        customer: customer as unknown as Parameters<typeof triggerNotifications>[0]["customer"],
        status: "payment_completed",
        quote: quoteData ?? undefined,
      });
    }

    console.log("[IPN] Payment SUCCESS processed:", ipn.order_id);
  } else {
    // Failed or cancelled
    const newStatus = (["-1", "-2"] as string[]).includes(ipn.status_code)
      ? "failed" : "failed";

    await service.from("payments")
      .update({ status: newStatus, raw_ipn: rawBody })
      .eq("id", payment.id);

    console.log("[IPN] Payment NOT successful. Status:", ipn.status_code, "Order:", ipn.order_id);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
