import Link from "next/link";
import UnifiedSignOutButton from "@/components/shared/SignOutButton";
import { getCurrentProfile, isAdminProfile } from "@/services/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isAdminProfile(profile)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-brand-900 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-white">Protonest</Link>
            <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded font-semibold">
              ADMIN
            </span>
            <div className="hidden sm:flex items-center gap-4 text-sm text-blue-100">
              <Link href="/admin/dashboard" className="hover:text-white">Dashboard</Link>
              <Link href="/admin/messages" className="hover:text-white">Messages</Link>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-blue-200">
            <span className="hidden sm:block">{profile?.full_name || profile?.email}</span>
            <UnifiedSignOutButton
              className="hover:text-white text-xs border border-white/20 px-2 py-1 rounded"
              title="Sign out"
            >
              Sign Out
            </UnifiedSignOutButton>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
