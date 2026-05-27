import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/services/auth";
import { createServiceClient } from "@/services/supabase/server";
import { updateStatusSchema } from "@/schemas";
import { triggerNotifications } from "@/services/notifications";
import type { OrderStatus } from "@/types";

// Valid forward-only transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  quote_pending:       ["quote_ready"],
  quote_ready:         ["payment_completed", "quote_pending"],
  payment_completed:   ["components_received"],
  components_received: ["in_assembly"],
  in_assembly:         ["inspection"],
  inspection:          ["ready_for_delivery"],
  ready_for_delivery:  ["delivered"],
  delivered:           [],
};

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const parsed = updateStatusSchema.safeParse({ ...body, order_id: orderId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { new_status, note, expected_delivery } = parsed.data;
  const service = createServiceClient();

  // Fetch current order
  const { data: order } = await service
    .from("orders").select("*, profiles(*)").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Validate transition
  const allowed = VALID_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (!allowed.includes(new_status as OrderStatus)) {
    return NextResponse.json(
      { error: `Cannot move from ${order.status} to ${new_status}` },
      { status: 400 }
    );
  }

  // Update order
  const updateData: Record<string, unknown> = { status: new_status };
  if (expected_delivery) updateData.expected_delivery = expected_delivery;

  const { error: updateError } = await service
    .from("orders").update(updateData).eq("id", orderId);
  if (updateError) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  // Log to status_history
  await service.from("status_history").insert({
    order_id:   orderId,
    changed_by: adminProfile.id,
    old_status: order.status,
    new_status,
    note:       note ?? null,
  });

  // Trigger notifications
  const customer = order.profiles;
  if (customer) {
    // Fetch active quote for payment notifications
    const { data: quotes } = await service
      .from("quotes")
      .select("*")
      .eq("order_id", orderId)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1);
    const activeQuote = quotes?.[0];

    await triggerNotifications({
      order: { ...order, status: new_status as OrderStatus },
      customer,
      status: new_status as OrderStatus,
      quote: activeQuote,
    });
  }

  return NextResponse.json({ success: true });
}
