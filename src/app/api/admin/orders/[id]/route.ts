import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/services/auth";
import { createServiceClient } from "@/services/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  try {
    await requireAdminProfile();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }

  const service = createServiceClient();

  const { data: order } = await service
    .from("orders").select("*").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: customer } = await service
    .from("profiles").select("*").eq("id", order.customer_id).single();

  const { data: files } = await service
    .from("order_files").select("*").eq("order_id", orderId);

  const { data: sourcing } = await service
    .from("component_sourcing").select("*").eq("order_id", orderId).single();

  // Admin CAN see admin_notes column in quotes
  const { data: quotes } = await service
    .from("quotes").select("*, profiles(full_name, email)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const { data: payments } = await service
    .from("payments").select("*").eq("order_id", orderId);

  const { data: statusHistory } = await service
    .from("status_history")
    .select("*, profiles(full_name, email)")
    .eq("order_id", orderId)
    .order("changed_at", { ascending: true });

  // Admin notes — never returned to customers
  const { data: adminNotes } = await service
    .from("admin_notes")
    .select("*, profiles(full_name, email)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const { data: discountTokens } = await service
    .from("discount_tokens")
    .select("id, token_code, discount_type, discount_value, valid_until, used, created_at")
    .eq("source_order_id", orderId);

  return NextResponse.json({
    order,
    customer,
    files:         files ?? [],
    sourcing:      sourcing ?? null,
    quotes:        quotes ?? [],
    payments:      payments ?? [],
    statusHistory: statusHistory ?? [],
    adminNotes:    adminNotes ?? [],
    discountTokens: discountTokens ?? [],
  });
}
