import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/services/auth";
import { createServiceClient } from "@/services/supabase/server";
import { issueDiscountTokenSchema } from "@/schemas";
import { generateTokenCode } from "@/utils";
import { sendDiscountToken } from "@/services/notifications/email";

/** Admin issues a reorder discount token after delivery. */
export async function POST(
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
  const parsed = issueDiscountTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { discount_type, discount_value, valid_days } = parsed.data;
  const service = createServiceClient();

  const { data: order } = await service
    .from("orders").select("id, order_number, status, customer_id, profiles(*)").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "delivered") {
    return NextResponse.json({ error: "Discount tokens can only be issued for delivered orders" }, { status: 400 });
  }

  const { data: existing } = await service
    .from("discount_tokens")
    .select("id, token_code")
    .eq("source_order_id", orderId)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "A discount token was already issued for this order", token_code: existing[0].token_code },
      { status: 409 }
    );
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + valid_days);

  let tokenCode = generateTokenCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: token, error } = await service
      .from("discount_tokens")
      .insert({
        source_order_id: orderId,
        customer_id: order.customer_id,
        token_code: tokenCode,
        discount_type,
        discount_value,
        valid_until: validUntil.toISOString(),
        created_by: adminProfile.id,
      })
      .select()
      .single();

    if (!error && token) {
      const customer = order.profiles as { email: string; full_name: string | null } | null;
      if (customer?.email) {
        await sendDiscountToken(
          {
            to: customer.email,
            customerName: customer.full_name ?? customer.email,
            orderNumber: order.order_number,
            projectName: "",
            orderId: order.id,
          },
          tokenCode,
          discount_type,
          discount_value,
          validUntil.toISOString()
        );
      }

      await service.from("notifications").insert({
        order_id: orderId,
        customer_id: order.customer_id,
        channel: "email",
        event_type: "discount_token_issued",
        recipient: customer?.email ?? "",
        status: "sent",
      });

      return NextResponse.json({ token }, { status: 201 });
    }

    if (error?.code === "23505") {
      tokenCode = generateTokenCode();
      continue;
    }
    return NextResponse.json({ error: "Failed to create discount token" }, { status: 500 });
  }

  return NextResponse.json({ error: "Failed to generate unique token" }, { status: 500 });
}
