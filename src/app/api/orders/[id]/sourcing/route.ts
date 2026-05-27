import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { requireCurrentProfile } from "@/services/auth";
import { orderStep3Schema } from "@/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const profile = await requireCurrentProfile();
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .eq("customer_id", profile.id)
    .single();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = orderStep3Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const sourcing = parsed.data;
  const { data, error } = await supabase
    .from("component_sourcing")
    .insert({
      order_id: orderId,
      sourcing_option: sourcing.sourcing_option,
      allow_equivalents: sourcing.allow_equivalents ?? true,
      customer_supplied_note: sourcing.customer_supplied_note?.trim() || null,
      ship_together: sourcing.sourcing_option === "customer" ? sourcing.ship_together ?? false : null,
      expected_arrival: sourcing.expected_arrival?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Sourcing] Insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sourcing: data }, { status: 201 });
}
