import { createClient as createServerSupabase, createServiceClient } from "@/services/supabase/server";
import type { Profile, UserRole } from "@/types";

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function roleForEmail(email: string): UserRole {
  return adminEmails().includes(email.toLowerCase()) ? "admin" : "customer";
}

export async function getCurrentProfile({ create = true } = {}) {
  const service = createServiceClient();

  try {
    const supabase = await createServerSupabase();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return null;

    const { data: existing, error: lookupError } = await service
      .from("profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);

    const email = supabaseUser.email ?? "";
    const expectedRole = roleForEmail(email);

    if (existing) {
      if (existing.role !== expectedRole) {
        const { data: updated } = await service
          .from("profiles")
          .update({ role: expectedRole })
          .eq("id", supabaseUser.id)
          .select("*")
          .single();
        if (updated) return updated as Profile;
      }
      return existing as Profile;
    }

    if (!create) return null;
    const fullName = supabaseUser.user_metadata?.full_name || null;

    const { data: profile, error: insertError } = await service
      .from("profiles")
      .insert({
        id: supabaseUser.id,
        email,
        full_name: fullName,
        role: expectedRole,
      })
      .select("*")
      .single();

    if (insertError) throw new Error(insertError.message);
    return profile as Profile;
  } catch (err) {
    console.error("Supabase user session check error:", err);
  }

  return null;
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");
  return profile;
}

export function isAdminProfile(profile: Pick<Profile, "role" | "email"> | null | undefined) {
  return profile?.role === "admin" || adminEmails().includes((profile?.email ?? "").toLowerCase());
}

export async function requireAdminProfile() {
  const profile = await requireCurrentProfile();
  if (!isAdminProfile(profile)) throw new Error("Forbidden");
  return profile;
}
