"use client";

import { createClient } from "@/services/supabase/client";
import { useRouter } from "next/navigation";

export default function UnifiedSignOutButton({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase signout error:", err);
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={handleSignOut} className={className} title={title}>
      {children}
    </button>
  );
}
