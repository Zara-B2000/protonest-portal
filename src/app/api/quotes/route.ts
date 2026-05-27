import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/services/auth";
import { createServiceClient } from "@/services/supabase/server";
import { createQuoteSchema } from "@/schemas";
import { triggerNotifications } from "@/services/notifications";

export async function POST(request: Request) {
  let adminProfile;
  try {
    adminProfile = await requireAdminProfile();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }

  const body = await request.json();
  const parsed = createQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const { order_id, amount_lkr, customer_notes, admin_notes, valid_days } = parsed.data;
  const service = createServiceClient();

  // Verify order exists
  const { data: order } = await service
    .from("orders").select("*, profiles(*)").eq("id", order_id).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Expire any existing sent quotes
  await service
    .from("quotes")
    .update({ status: "revised" })
    .eq("order_id", order_id)
    .eq("status", "sent");

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + valid_days);

  const { data: quote, error: quoteError } = await service
    .from("quotes")
    .insert({
      order_id,
      admin_id:       adminProfile.id,
      amount_lkr,
      customer_notes: customer_notes ?? null,
      admin_notes:    admin_notes ?? null,
      valid_until:    validUntil.toISOString(),
      status:         "sent",
    })
    .select()
    .single();

  if (quoteError || !quote) {
    console.error("[Quotes] Insert error:", quoteError);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }

  // Move order to quote_ready
  await service.from("orders")
    .update({ status: "quote_ready" })
    .eq("id", order_id);

  // Log status change
  await service.from("status_history").insert({
    order_id,
    changed_by: adminProfile.id,
    old_status: order.status,
    new_status: "quote_ready",
    note:       `Quote created: LKR ${amount_lkr}`,
  });

  // Notify customer
  const customer = order.profiles;
  if (customer) {
    await triggerNotifications({
      order: { ...order, status: "quote_ready" },
      customer,
      status: "quote_ready",
      quote,
    });
  }

  return NextResponse.json({ quote }, { status: 201 });
}
