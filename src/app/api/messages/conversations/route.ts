import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile, isAdminProfile } from "@/services/auth";

// GET — Admin: list all conversations with last message & customer info
// POST — Customer: get-or-create their conversation
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminProfile(profile))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();

  // Fetch all conversations with customer profile info, ordered by most recent
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*, profiles!conversations_customer_id_fkey(*)")
    .order("updated_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // For each conversation, get the last message and unread count
  const enriched = await Promise.all(
    (conversations || []).map(async (conv: Record<string, unknown>) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("is_read", false)
        .neq("sender_id", profile.id);

      return {
        ...conv,
        last_message: lastMsg || null,
        unread_count: count || 0,
      };
    })
  );

  return NextResponse.json(enriched.filter((c) => c.last_message !== null));
}

export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Check if conversation already exists for this customer
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("customer_id", profile.id)
    .maybeSingle();

  if (existing) return NextResponse.json(existing);

  // Create a new conversation
  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({ customer_id: profile.id })
    .select("*")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(conversation);
}
