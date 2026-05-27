import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { requireCurrentProfile } from "@/services/auth";
import { orderStep1Schema } from "@/schemas";
import { triggerNotifications } from "@/services/notifications";

function createOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  return `PN-ASM-${stamp}`;
}

export async function POST(request: Request) {
  try {
    const profile = await requireCurrentProfile();
    const service = createServiceClient();

    const body = await request.json();
    const parsed = orderStep1Schema.safeParse({
      ...body,
      units: Number(body.units),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      project_name, units, assembly_type, inspection_level,
      customer_notes, discount_token,
    } = parsed.data;

    // Validate discount token if provided
    let tokenId: string | null = null;
    if (discount_token) {
      const { data: token } = await service
        .from("discount_tokens")
        .select("id, valid_until, used, customer_id")
        .eq("token_code", discount_token.toUpperCase())
        .eq("customer_id", profile.id)
        .single();

      if (!token || token.used || new Date(token.valid_until) < new Date()) {
        return NextResponse.json(
          { error: "Invalid or expired discount token" },
          { status: 400 }
        );
      }
      tokenId = token.id;
    }

    // Create the order.
    const { data: order, error: orderError } = await service
      .from("orders")
      .insert({
        customer_id:      profile.id,
        order_number:     createOrderNumber(),
        project_name,
        units,
        assembly_type,
        inspection_level,
        customer_notes:   customer_notes ?? null,
        discount_token_used: tokenId,
        status:           "quote_pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("[Orders] Create error:", orderError);
      return NextResponse.json(
        { error: orderError?.message ?? "Failed to create order" },
        { status: 500 }
      );
    }

    // Log initial status in history. Do not block order creation if audit
    // logging permissions are not configured yet.
    const { error: statusHistoryError } = await service.from("status_history").insert({
      order_id:    order.id,
      changed_by:  profile.id,
      old_status:  null,
      new_status:  "quote_pending",
      note:        "Order submitted by customer",
    });
    if (statusHistoryError) {
      console.error("[Orders] Status history error:", statusHistoryError);
    }

    // Mark token as used
    if (tokenId) {
      await service.from("discount_tokens")
        .update({ used: true, used_at: new Date().toISOString(), used_on_order: order.id })
        .eq("id", tokenId);
    }

    // Trigger notifications (order confirmation)
    if (profile) {
      try {
        await triggerNotifications({ order, customer: profile, status: "quote_pending" });
      } catch (notificationError) {
        console.error("[Orders] Notification error:", notificationError);
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("[Orders] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
