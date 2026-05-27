import { createServiceClient } from "@/services/supabase/server";
import { getCurrentProfile, isAdminProfile } from "@/services/auth";
import { redirect } from "next/navigation";
import AdminMessagesPanel from "@/components/chat/AdminMessagesPanel";
import type { Conversation } from "@/types";

export default async function AdminMessagesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isAdminProfile(profile)) redirect("/dashboard");

  const supabase = createServiceClient();

  // Fetch all conversations with customer profile info, ordered by most recent
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, profiles!conversations_customer_id_fkey(*)")
    .order("updated_at", { ascending: false });

  // For each conversation, get the last message and unread count
  const enriched: Conversation[] = await Promise.all(
    (conversations || []).map(async (conv: any) => {
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
        last_message: lastMsg || undefined,
        unread_count: count || 0,
      } as Conversation;
    })
  );

  const activeConversations = enriched.filter((c) => c.last_message !== undefined);

  return (
    <div className="space-y-4">
      <AdminMessagesPanel profileId={profile.id} initialConversations={activeConversations} />
    </div>
  );
}
