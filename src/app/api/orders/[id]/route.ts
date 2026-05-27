import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { requireCurrentProfile } from "@/services/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await requireCurrentProfile();
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, quotes(id, amount_lkr, valid_until, status)")
    .eq("id", id)
    .eq("customer_id", profile.id)
    .single();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activeQuote = order.quotes
    ?.filter((q: { status: string }) => q.status !== "expired" && q.status !== "draft")
    .sort((a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null;

  return NextResponse.json({ order, activeQuote });
}
