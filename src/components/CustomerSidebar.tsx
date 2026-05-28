"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import UnifiedSignOutButton from "@/components/shared/SignOutButton";
import { Menu, X } from "lucide-react";

interface Props {
  userName: string;
  userInitials: string;
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    match: (p: string) => p === "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}>
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "My Orders",
    match: (p: string) => p.startsWith("/orders") && !p.startsWith("/orders/new"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
        <line x1="16" y1="10" x2="8" y2="10" />
      </svg>
    ),
  },
  {
    href: "/orders/new",
    label: "New Order",
    match: (p: string) => p === "/orders/new",
    badge: "New",
    badgeVariant: "new" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: "/quotes",
    label: "Quotes & Invoices",
    match: (p: string) => p.startsWith("/quotes"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

const ACCOUNT_ITEMS = [
  {
    href: "/profile",
    label: "Profile",
    match: (p: string) => p === "/profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    match: (p: string) => p === "/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function CustomerSidebar({ userName, userInitials }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <style>{`
        @keyframes pn-sidebar-blink { 0%,100%{opacity:1;} 50%{opacity:.25;} }
        .pn-nav-item {
          display: flex; align-items: center; gap: 11px;
          padding: 10px 12px; border-radius: 10px;
          cursor: pointer; transition: background .18s, color .18s;
          color: #8896B8; font-size: 14px; font-weight: 500;
          position: relative; text-decoration: none;
          user-select: none;
        }
        .pn-nav-item:hover { background: rgba(91,66,232,.08); color: #EEF0FB; }
        .pn-nav-item.pn-active {
          background: rgba(91,66,232,.14); color: #9D82F8;
        }
        .pn-nav-item.pn-active::before {
          content: ''; position: absolute; left: 0; top: 25%; bottom: 25%;
          width: 3px; background: #7B5CF6; border-radius: 0 2px 2px 0;
        }
        .pn-nav-badge {
          margin-left: auto; font-size: 10.5px; font-weight: 600;
          background: rgba(91,66,232,.2); color: #9D82F8;
          border-radius: 20px; padding: 1px 7px;
          min-width: 20px; text-align: center;
        }
        .pn-nav-badge.pn-badge-new { background: rgba(251,191,36,.15); color: #FBBF24; }
        .pn-user-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          transition: background .18s;
        }
        .pn-user-row:hover { background: rgba(255,255,255,.04); }
        .pn-signout-btn {
          display: flex; align-items: center; gap: 11px;
          padding: 10px 12px; border-radius: 10px;
          color: rgba(248,113,113,.7); font-size: 14px; font-weight: 500;
          background: none; border: none; cursor: pointer;
          width: 100%; text-align: left;
          transition: background .18s, color .18s;
        }
        .pn-signout-btn:hover { background: rgba(248,113,113,.08); color: #F87171; }
      `}</style>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#090C1A] border-b border-purple-950/20 px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors focus:outline-none rounded-md hover:bg-slate-800/40"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#7B5CF6] to-[#4530C8] rounded-md flex items-center justify-center text-xs font-bold text-white shadow-md shadow-purple-900/30">
              P
            </div>
            <span className="font-bold text-white tracking-tight text-sm">Protonest</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B5CF6] to-[#4530C8] flex items-center justify-center text-xs font-bold text-white shadow-inner">
          {userInitials}
        </div>
      </header>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 w-[248px] bg-[#090C1A] border-r border-purple-950/20 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Ambient glow */}
        <div style={{ position: "absolute", width: 200, height: 200, background: "radial-gradient(circle, rgba(91,66,232,.12) 0%, transparent 70%)", bottom: -60, left: -40, pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ padding: "28px 24px 24px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(91,66,232,0.16)" }}>
          <div
            style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg,#7B5CF6,#4530C8)",
              borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "#fff",
              boxShadow: "0 4px 12px rgba(91,66,232,.45)",
              position: "relative", overflow: "hidden", flexShrink: 0,
            }}
          >
            P
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", background: "rgba(255,255,255,.15)" }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#EEF0FB", letterSpacing: -0.3 }}>Protonest</div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 8.5, fontWeight: 600, color: "#9D82F8",
              background: "rgba(91,66,232,.12)",
              border: "1px solid rgba(91,66,232,.28)",
              borderRadius: 4, padding: "2px 6px",
              textTransform: "uppercase", letterSpacing: "0.07em",
            }}
          >
            PCB
          </span>

          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white transition-colors focus:outline-none rounded-md hover:bg-slate-800/40 ml-auto"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {/* Section: Main */}
          <div style={{ fontSize: 10, fontWeight: 600, color: "#4A567A", textTransform: "uppercase", letterSpacing: "0.1em", padding: "12px 10px 6px" }}>
            Main
          </div>

          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pn-nav-item${active ? " pn-active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                {item.label}
                {item.badge && (
                  <span className={`pn-nav-badge${item.badgeVariant === "new" ? " pn-badge-new" : ""}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Section: Account */}
          <div style={{ fontSize: 10, fontWeight: 600, color: "#4A567A", textTransform: "uppercase", letterSpacing: "0.1em", padding: "12px 10px 6px" }}>
            Account
          </div>

          {ACCOUNT_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pn-nav-item${active ? " pn-active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}

          {/* Sign Out */}
          <div style={{ marginTop: "auto" }}>
            <UnifiedSignOutButton className="pn-signout-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </UnifiedSignOutButton>
          </div>
        </nav>

        {/* User footer */}
        <div style={{ padding: "16px 14px", borderTop: "1px solid rgba(91,66,232,0.16)" }}>
          <div className="pn-user-row">
            <div
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg,#7B5CF6,#4530C8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
                boxShadow: "0 0 0 2px rgba(91,66,232,.35)",
              }}
            >
              {userInitials}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#EEF0FB" }}>{userName}</div>
              <div style={{ fontSize: 11, color: "#4A567A" }}>Customer</div>
            </div>
            <svg style={{ marginLeft: "auto", color: "#4A567A" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </div>
        </div>
      </aside>
    </>
  );
}
