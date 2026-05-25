import Link from "next/link";
import UnifiedSignOutButton from "@/components/shared/SignOutButton";
import { getCurrentProfile } from "@/services/auth";
import { redirect } from "next/navigation";
import CustomerSidebar from "@/components/CustomerSidebar";
import CustomerChatWidget from "@/components/chat/CustomerChatWidget";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/dashboard");

  const name = profile.full_name || profile.email || "Customer";
  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col lg:flex-row">
      <CustomerSidebar userName={name} userInitials={initials} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[248px] pt-14 lg:pt-0">
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <CustomerChatWidget profileId={profile.id} />
    </div>
  );
}
