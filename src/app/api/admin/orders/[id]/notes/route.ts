import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/services/auth";
import { createServiceClient } from "@/services/supabase/server";
import { z } from "zod";

const schema = z.object({
  note_text: z.string().min(1).max(2000),
});

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("admin_notes")
    .insert({ order_id: orderId, admin_id: adminProfile.id, note_text: parsed.data.note_text })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
