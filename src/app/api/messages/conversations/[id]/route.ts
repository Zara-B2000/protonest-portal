import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile, isAdminProfile } from "@/services/auth";

// GET — Fetch all messages for a conversation
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: conversationId } = await params;
  const supabase = createServiceClient();

  // Verify the user owns this conversation or is admin
  const { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (conv.customer_id !== profile.id && !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Mark messages from the OTHER party as read
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", profile.id)
    .eq("is_read", false);

  // Fetch all messages ordered oldest → newest
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*, profiles(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(messages);
}
