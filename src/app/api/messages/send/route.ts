import { NextResponse } from "next/server";
import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile, isAdminProfile } from "@/services/auth";

// POST — Send a message
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversation_id, body } = await req.json();

  if (!conversation_id || !body?.trim()) {
    return NextResponse.json({ error: "Missing conversation_id or body" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify conversation exists and user has access
  const { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversation_id)
    .single();

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  if (conv.customer_id !== profile.id && !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Insert the message
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id,
      sender_id: profile.id,
      body: body.trim(),
    })
    .select("*, profiles(*)")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(message);
}
