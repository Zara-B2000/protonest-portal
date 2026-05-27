import Link from "next/link";
import UnifiedSignOutButton from "@/components/shared/SignOutButton";
import { getCurrentProfile } from "@/services/auth";
import { redirect } from "next/navigation";
import { LogOut, LayoutDashboard, PlusCircle } from "lucide-react";
import CustomerChatWidget from "@/components/chat/CustomerChatWidget";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-brand-700">Protonest</Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                href="/orders/new"
                className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" /> New Order
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:block text-slate-500 truncate max-w-[160px]">
              {profile?.full_name || profile?.email}
            </span>

            <UnifiedSignOutButton
              className="flex items-center gap-1 text-slate-400 hover:text-slate-700"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </UnifiedSignOutButton>
          </div>
        </div>
        {/* Mobile nav strip */}
        <div className="sm:hidden border-t border-slate-100 flex">
          <Link href="/dashboard" className="flex-1 py-2.5 text-center text-xs text-slate-600 hover:bg-slate-50">
            Dashboard
          </Link>
          <Link href="/orders/new" className="flex-1 py-2.5 text-center text-xs text-slate-600 hover:bg-slate-50 border-l border-slate-100">
            + New Order
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
      <CustomerChatWidget profileId={profile.id} />
    </div>
  );
}
