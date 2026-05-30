"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/services/supabase/client";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/** After sign-in, redirect admins to /admin/dashboard and customers to /dashboard */
async function getRedirectPath(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin" ? "/admin/dashboard" : "/dashboard";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        const dest = await getRedirectPath(supabase);
        router.push(dest);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (googleError) {
        setError(googleError.message);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px) scale(0.975); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pn-card {
          animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .pn-input {
          width: 100%;
          height: 50px;
          background: #090C1A;
          border: 1px solid rgba(99,71,245,0.18);
          border-radius: 11px;
          padding: 0 44px 0 46px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14.5px;
          color: #EDF0F8;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .pn-input::placeholder { color: #4A5578; }
        .pn-input:focus {
          border-color: #7B5CF6;
          box-shadow: 0 0 0 3px rgba(99,71,245,0.15);
        }
        .pn-btn-primary {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #7B5CF6 0%, #4F35D4 100%);
          border: none; border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; font-weight: 600; color: white;
          cursor: pointer; letter-spacing: 0.02em;
          transition: transform 0.18s, box-shadow 0.18s;
          box-shadow: 0 4px 22px rgba(99,71,245,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
          margin-bottom: 18px;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          position: relative; overflow: hidden;
        }
        .pn-btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 55%);
          pointer-events: none;
        }
        .pn-btn-primary::after {
          content: '';
          position: absolute;
          width: 120%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          left: -120%;
          transition: left 0.5s;
        }
        .pn-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(99,71,245,0.55), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .pn-btn-primary:hover::after { left: 120%; }
        .pn-btn-primary:active { transform: translateY(0); }
        .pn-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .pn-btn-google {
          width: 100%; height: 50px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 500; color: #EDF0F8;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: border-color 0.2s, background 0.2s, transform 0.18s;
          margin-bottom: 28px;
        }
        .pn-btn-google:hover {
          border-color: rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.07);
          transform: translateY(-1px);
        }
        .pn-btn-google:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .sdot-inner {
          width: 8px; height: 8px; border-radius: 50%;
          background: #7B5CF6;
          box-shadow: 0 0 8px #7B5CF6;
          animation: blink 2.5s ease-in-out infinite;
          position: relative; z-index: 1;
        }
        .sdot-ring {
          position: absolute; top: 0; left: 0;
          width: 8px; height: 8px; border-radius: 50%;
          background: #7B5CF6;
          animation: pulse-ring 2.5s ease-out infinite;
        }
        .icard:hover { border-color: rgba(99,71,245,0.35) !important; }
      `}</style>

      {/* ── FULL BACKGROUND ── */}
      <div style={{ position: "fixed", inset: 0, background: "#05060F", zIndex: 0 }} />

      {/* Grid */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(99,71,245,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(99,71,245,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "fixed", zIndex: 0, pointerEvents: "none",
          width: 700, height: 700,
          background: "radial-gradient(circle, rgba(99,71,245,0.13) 0%, transparent 65%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -55%)",
        }}
      />
      <div
        style={{
          position: "fixed", zIndex: 0, pointerEvents: "none",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(99,71,245,0.07) 0%, transparent 70%)",
          bottom: -80, right: "10%",
        }}
      />



      {/* ── FULL SCREEN LAYOUT ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100vh",
          display: "flex",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* CONTAINER */}
        <div
          className="pn-card"
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            background: "rgba(9, 10, 20, 0.4)",
            backdropFilter: "blur(24px)",
            overflow: "hidden",
          }}
        >
          {/* ══════════ LEFT PANEL ══════════ */}
          <div
            style={{
              flex: 1,
              maxWidth: "46%",
              flexShrink: 0,
              background: "#060813",
              borderRight: "1px solid rgba(99,71,245,0.12)",
              padding: "50px 44px 40px 44px",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
            className="hidden lg:flex"
          >
            {/* Corner brackets */}
            <div style={{ position: "absolute", top: 18, left: 18, width: 22, height: 22, borderTop: "1.5px solid rgba(123,92,246,0.3)", borderLeft: "1.5px solid rgba(123,92,246,0.3)", borderRadius: "2px 0 0 0" }} />
            <div style={{ position: "absolute", bottom: 18, right: 18, width: 22, height: 22, borderBottom: "1.5px solid rgba(123,92,246,0.3)", borderRight: "1.5px solid rgba(123,92,246,0.3)", borderRadius: "0 0 2px 0" }} />

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
              <div
                style={{
                  width: 38, height: 38,
                  background: "linear-gradient(135deg,#7B5CF6,#4F35D4)",
                  borderRadius: 9,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, color: "white",
                  boxShadow: "0 4px 14px rgba(99,71,245,0.45)",
                  position: "relative", overflow: "hidden",
                }}
              >
                P
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", background: "rgba(255,255,255,0.15)" }} />
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#EDF0F8", letterSpacing: -0.3 }}>Protonest</span>
              <span
                style={{
                  fontSize: 9, fontWeight: 600, color: "#9D82F8",
                  background: "rgba(99,71,245,0.1)",
                  border: "1px solid rgba(99,71,245,0.22)",
                  borderRadius: 5, padding: "2px 8px",
                  letterSpacing: "0.07em", textTransform: "uppercase",
                  marginLeft: 4, alignSelf: "center",
                }}
              >
                PCB Portal
              </span>
            </div>

            {/* PCB Industry Cover Image */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", margin: "24px 0" }}>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1.77",
                  position: "relative",
                  borderRadius: "14px",
                  border: "1px solid rgba(99,71,245,0.22)",
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.45), 0 0 16px rgba(99, 71, 245, 0.12)",
                }}
              >
                <img
                  src="/pcb-industry-cover.jpg"
                  alt="Protonest PCB Assembly pick and place process"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* Soft overlay gradient matching the theme */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(6, 8, 19, 0.55) 0%, transparent 40%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 12 }}>
              {[
                { label: "Min. Order", val: "5 pcs",   sub: "Small batch ready" },
                { label: "Turnaround", val: "7 days",  sub: "Express available" },
                { label: "Delivery",   val: "LK-wide", sub: "Sri Lanka" },
                { label: "Support",    val: "24/7",    sub: "Engineer assist" },
              ].map((c) => (
                <div
                  key={c.label}
                  className="icard"
                  style={{
                    background: "rgba(99,71,245,0.04)",
                    border: "1px solid rgba(99,71,245,0.12)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#EDF0F8" }}>{c.val}</div>
                  <div style={{ fontSize: 10.5, color: "#475569", marginTop: 2 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Bottom Status bar on Left Panel */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 24, fontSize: 12, color: "#64748B" }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
              <span>System Online</span>
              <span style={{ color: "#334155" }}>·</span>
              <span>🇱🇰 Sri Lanka Portal</span>
            </div>
          </div>

          {/* ══════════ RIGHT PANEL ══════════ */}
          <div
            style={{
              flex: 1,
              padding: "50px 60px",
              display: "flex", flexDirection: "column", justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Soft decorative background glow blob matching screenshot */}
            <div
              style={{
                position: "absolute", top: 0, right: 0, width: "320px", height: "320px",
                background: "radial-gradient(circle, rgba(99,71,245,0.06) 0%, transparent 70%)",
                pointerEvents: "none", zIndex: 0,
              }}
            />

            {/* Corner brackets */}
            <div style={{ position: "absolute", top: 18, right: 18, width: 18, height: 18, borderTop: "1.5px solid rgba(99,71,245,0.18)", borderRight: "1.5px solid rgba(99,71,245,0.18)" }} />
            <div style={{ position: "absolute", bottom: 18, left: 18, width: 18, height: 18, borderBottom: "1.5px solid rgba(99,71,245,0.18)", borderLeft: "1.5px solid rgba(99,71,245,0.18)" }} />

            {/* Top Right Options/Menu Icon Button */}
            <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
              <button
                type="button"
                style={{
                  width: 36, height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#64748B", cursor: "pointer",
                  transition: "all 0.2s",
                }}
                className="hover:bg-white/10 hover:border-white/20 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="1.2" />
                  <circle cx="19" cy="12" r="1.2" />
                  <circle cx="5" cy="12" r="1.2" />
                </svg>
              </button>
            </div>

            {/* Header Content */}
            <div style={{ position: "relative", zIndex: 1, maxWidth: "440px", width: "100%", margin: "0 auto" }}>
              {/* Title */}
              <h1 style={{ fontSize: 32, fontWeight: 700, color: "#EDF0F8", letterSpacing: -0.6, lineHeight: 1.15, marginBottom: 4 }}>
                Customer
              </h1>
              <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15, marginBottom: 14 }}>
                <span
                  style={{
                    background: "linear-gradient(90deg, #7B5CF6, #C4B5FD)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Sign In
                </span>
              </h1>
              <p style={{ fontSize: 13.5, color: "#64748B", fontWeight: 400, lineHeight: 1.6, marginBottom: 34 }}>
                Submit and track your PCB assembly orders — from Gerber upload to doorstep delivery.
              </p>

              {/* Error Box */}
              {error && (
                <div
                  style={{
                    marginBottom: 20,
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    color: "#FCA5A5",
                    fontSize: 13,
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Form Block */}
              <form onSubmit={handleEmailSignIn}>
                {/* Email Input */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="login-email"
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pn-input"
                  />
                </div>

                {/* Password Input */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="login-password"
                      required
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pn-input"
                      style={{ paddingRight: "56px" }}
                    />
                    
                    {/* Compact custom bordered eye toggle box */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      style={{
                        position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px", cursor: "pointer",
                        color: "#64748B", width: "42px", height: "36px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      className="hover:bg-white/10 hover:border-white/20 hover:text-white"
                    >
                      {showPassword ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Link */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4, marginBottom: 28 }}>
                  <Link href="/forgot-password" style={{ fontSize: 12.5, color: "#64748B", textDecoration: "none", transition: "color 0.2s" }} className="hover:text-[#9D82F8]">
                    Forgot password?
                  </Link>
                </div>

                {/* Sign In Primary Button */}
                <button type="submit" disabled={loading} className="pn-btn-primary">
                  {!loading && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  )}
                  {loading ? "Signing In…" : "Sign In to Portal"}
                </button>
              </form>

              {/* Divider line */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize: 12, color: "#475569" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Google Button */}
              <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="pn-btn-google">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Bottom footer links */}
              <p style={{ textAlign: "center", fontSize: 13, color: "#64748B", marginTop: 4 }}>
                New customer?{" "}
                <Link href="/signup" style={{ color: "#7B5CF6", textDecoration: "none", fontWeight: 600 }} className="hover:underline">
                  Create Account
                </Link>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <Link href="/guest-order" style={{ color: "#7B5CF6", textDecoration: "none", fontWeight: 600 }} className="hover:underline">
                  Place a Guest Order
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
