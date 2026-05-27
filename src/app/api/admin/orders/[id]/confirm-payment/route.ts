import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/services/auth";
import { createServiceClient } from "@/services/supabase/server";
import { triggerNotifications } from "@/services/notifications";

/** Admin confirms a pending bank-transfer payment. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
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

  const service = createServiceClient();

  const { data: order } = await service
    .from("orders").select("*, profiles(*)").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "quote_ready") {
    return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 400 });
  }

  const { data: payment } = await service
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .eq("gateway", "bank_transfer")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "No pending bank transfer payment found" }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ success: true, already_completed: true });
  }

  await service.from("payments")
    .update({
      status: "completed",
      ipn_verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  await service.from("orders")
    .update({ status: "payment_completed" })
    .eq("id", orderId);

  await service.from("status_history").insert({
    order_id: orderId,
    changed_by: adminProfile.id,
    old_status: "quote_ready",
    new_status: "payment_completed",
    note: "Bank transfer confirmed by admin",
  });

  if (payment.quote_id) {
    await service.from("quotes")
      .update({ status: "accepted" })
      .eq("id", payment.quote_id);
  }

  const customer = order.profiles;
  const { data: quote } = payment.quote_id
    ? await service.from("quotes").select("*").eq("id", payment.quote_id).single()
    : { data: null };

  if (customer) {
    await triggerNotifications({
      order: { ...order, status: "payment_completed" },
      customer,
      status: "payment_completed",
      quote: quote ?? undefined,
    });
  }

  return NextResponse.json({ success: true });
}
