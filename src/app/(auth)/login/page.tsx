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
    <div className="fixed inset-0 z-50" style={{ fontFamily: "'Space Grotesk', 'Montserrat', sans-serif" }}>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Syne:wght@400;600;700&family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes scanline {
          0%   { top: -4px; }
          100% { top: 100%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        .login-card-wrap {
          animation: fadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .login-card-wrap::after {
          content: '';
          position: absolute; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(180deg, rgba(85,48,250,0.18) 0%, transparent 100%);
          animation: scanline 6s linear infinite;
          pointer-events: none;
          z-index: 20;
        }
        .login-input:focus {
          border-color: #5530FA;
          box-shadow: 0 0 0 3px rgba(85,48,250,0.12), inset 0 0 20px rgba(85,48,250,0.03);
        }
        .login-btn-primary {
          background: linear-gradient(135deg, #5530FA 0%, #F51DA5 100%);
          box-shadow: 0 0 24px rgba(85,48,250,0.3);
        }
        .login-btn-primary:hover {
          background: linear-gradient(135deg, #6040FF 0%, #FF30B5 100%);
          transform: translateY(-2px);
          box-shadow: 0 0 36px rgba(85,48,250,0.45);
        }
        .login-btn-primary:active {
          transform: translateY(0);
        }
      `}</style>

      {/* ── PCB GRID BACKGROUND ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(85,48,250,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(85,48,250,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Radial center glow */}
        <div
          className="absolute"
          style={{
            width: 900,
            height: 900,
            background: "radial-gradient(circle, rgba(85,48,250,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* ── ANIMATED CIRCUIT TRACES ── */}
      <svg
        className="fixed inset-0 z-0 pointer-events-none"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M0 200 H320 V260 H680 V200 H900" stroke="#5530FA" strokeWidth="1.5" fill="none" opacity="0.08" strokeDasharray="4 6" />
        <path d="M1440 400 H1100 V340 H800 V400 H600" stroke="#5530FA" strokeWidth="1.5" fill="none" opacity="0.07" strokeDasharray="4 6" />
        <path d="M0 700 H200 V640 H500 V700 H750" stroke="#F51DA5" strokeWidth="1" fill="none" opacity="0.07" strokeDasharray="3 8" />
        <path d="M1440 120 H1200 V180 H950 V120 H700" stroke="#5530FA" strokeWidth="1" fill="none" opacity="0.06" strokeDasharray="3 7" />
        <path d="M0 820 H400 V760 H620 V820 H880" stroke="#F51DA5" strokeWidth="1" fill="none" opacity="0.06" strokeDasharray="3 7" />

        {/* Solder pads */}
        <circle cx="320" cy="200" r="4" fill="#5530FA" opacity="0.12" />
        <circle cx="680" cy="260" r="4" fill="#5530FA" opacity="0.12" />
        <circle cx="1100" cy="400" r="4" fill="#5530FA" opacity="0.1" />
        <circle cx="800" cy="340" r="4" fill="#5530FA" opacity="0.1" />
        <circle cx="200" cy="700" r="3" fill="#F51DA5" opacity="0.12" />
        <circle cx="500" cy="640" r="3" fill="#F51DA5" opacity="0.12" />

        {/* Flowing dots */}
        <circle r="3" fill="#5530FA" opacity="0.7">
          <animateMotion dur="4s" repeatCount="indefinite" begin="0s">
            <mpath href="#lt1" />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.9;0.9;0" dur="4s" repeatCount="indefinite" />
        </circle>
        <path id="lt1" d="M0 200 H320 V260 H680 V200 H900" fill="none" />

        <circle r="2.5" fill="#5530FA" opacity="0.6">
          <animateMotion dur="5s" repeatCount="indefinite" begin="1.5s">
            <mpath href="#lt2" />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="5s" repeatCount="indefinite" begin="1.5s" />
        </circle>
        <path id="lt2" d="M1440 400 H1100 V340 H800 V400 H600" fill="none" />

        <circle r="2" fill="#F51DA5" opacity="0.7">
          <animateMotion dur="6s" repeatCount="indefinite" begin="0.8s">
            <mpath href="#lt3" />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="6s" repeatCount="indefinite" begin="0.8s" />
        </circle>
        <path id="lt3" d="M0 820 H400 V760 H620 V820 H880" fill="none" />
      </svg>

      {/* ── FULL-SCREEN CENTERED BODY ── */}
      <div
        className="relative z-10 min-h-screen flex items-center justify-center"
        style={{ background: "#F8F9FC" }}
      >
        {/* ── MAIN CARD ── */}
        <div
          className="login-card-wrap relative flex overflow-hidden"
          style={{
            width: 960,
            maxWidth: "95vw",
            minHeight: 620,
            background: "#FFFFFF",
            border: "1px solid rgba(85,48,250,0.12)",
            borderRadius: 20,
            boxShadow: "0 0 0 1px rgba(85,48,250,0.06), 0 32px 80px rgba(0,0,0,0.08)",
          }}
        >
          {/* ══════════ LEFT PANEL ══════════ */}
          <div
            className="hidden lg:flex flex-col relative overflow-hidden"
            style={{
              width: 420,
              flexShrink: 0,
              background: "linear-gradient(165deg, #5530FA 0%, #7B4DFF 40%, #F51DA5 100%)",
              borderRight: "1px solid rgba(255,255,255,0.1)",
              padding: "44px 40px",
            }}
          >
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-white/50" />
            <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-white/50" />

            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-10">
              <div
                className="flex items-center justify-center relative overflow-hidden"
                style={{
                  width: 38,
                  height: 38,
                  background: "#FFFFFF",
                  borderRadius: 8,
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#5530FA",
                }}
              >
                P
                <div className="absolute top-0 left-0 right-0 h-2/5" style={{ background: "rgba(85,48,250,0.08)" }} />
              </div>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 19,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  letterSpacing: -0.3,
                }}
              >
                Protonest
              </span>
              <span
                className="ml-1 self-center"
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: "#FFFFFF",
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                PCB Portal
              </span>
            </div>

            {/* PCB Illustration */}
            <div className="flex-1 flex items-center justify-center -mx-2">
              <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ maxWidth: 340 }}>
                {/* Board */}
                <rect x="20" y="30" width="300" height="240" rx="8" fill="rgba(255,255,255,0.08)" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.9" />
                {/* Mounting holes */}
                <circle cx="40" cy="50" r="5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
                <circle cx="300" cy="50" r="5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
                <circle cx="40" cy="250" r="5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
                <circle cx="300" cy="250" r="5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
                {/* Silkscreen */}
                <text x="130" y="22" fontSize="9" fill="#FFFFFF" opacity="0.5" fontFamily="monospace">PROTONEST-REV2.4</text>
                {/* Main IC chip */}
                <rect x="115" y="105" width="90" height="90" rx="4" fill="rgba(255,255,255,0.1)" stroke="#FFFFFF" strokeWidth="1.5" />
                {/* IC pins left */}
                {[118, 130, 142, 154, 166, 178].map((y) => (
                  <rect key={`ipl${y}`} x="98" y={y} width="17" height="5" rx="1.5" fill="#FFD166" opacity="0.85" />
                ))}
                {/* IC pins right */}
                {[118, 130, 142, 154, 166, 178].map((y) => (
                  <rect key={`ipr${y}`} x="205" y={y} width="17" height="5" rx="1.5" fill="#FFD166" opacity="0.85" />
                ))}
                {/* IC pins top */}
                {[126, 138, 150, 162, 174, 186].map((x) => (
                  <rect key={`ipt${x}`} x={x} y="98" width="5" height="17" rx="1.5" fill="#FFD166" opacity="0.85" />
                ))}
                {/* IC pins bottom */}
                {[126, 138, 150, 162, 174, 186].map((x) => (
                  <rect key={`ipb${x}`} x={x} y="195" width="5" height="17" rx="1.5" fill="#FFD166" opacity="0.85" />
                ))}
                {/* IC labels */}
                <text x="160" y="155" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontFamily="monospace" opacity="0.8">MCU</text>
                <text x="160" y="165" fontSize="7" fill="#FFFFFF" textAnchor="middle" fontFamily="monospace" opacity="0.5">PN-32X</text>
                <path d="M115 120 Q120 115 125 120" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.6" />
                {/* Traces */}
                <path d="M98 120 H60 V80 H50" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
                <path d="M98 132 H65" stroke="#FFFFFF" strokeWidth="1" opacity="0.35" />
                <path d="M98 144 H70 V225 H55" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
                <path d="M222 120 H260 V75 H285" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
                <path d="M222 132 H255" stroke="#FFFFFF" strokeWidth="1" opacity="0.35" />
                <path d="M222 156 H265 V220 H280" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
                <path d="M128 98 V70 H80 V55" stroke="#FFFFFF" strokeWidth="1" opacity="0.35" />
                <path d="M176 98 V70 H220 V55" stroke="#FFFFFF" strokeWidth="1" opacity="0.35" />
                <path d="M128 212 V235 H90 V250" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
                <path d="M188 212 V235 H240 V250" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
                {/* Capacitors */}
                <rect x="48" y="68" width="14" height="22" rx="2" fill="rgba(255,255,255,0.1)" stroke="#FFFFFF" strokeWidth="1" />
                <rect x="68" y="68" width="14" height="22" rx="2" fill="rgba(255,255,255,0.1)" stroke="#FFFFFF" strokeWidth="1" />
                <text x="55" y="98" fontSize="7" fill="#FFFFFF" textAnchor="middle" fontFamily="monospace" opacity="0.5">C1</text>
                <text x="75" y="98" fontSize="7" fill="#FFFFFF" textAnchor="middle" fontFamily="monospace" opacity="0.5">C2</text>
                {/* Resistors */}
                <rect x="248" y="62" width="24" height="10" rx="3" fill="rgba(255,166,0,0.3)" stroke="#FFD166" strokeWidth="0.8" opacity="0.9" />
                <rect x="248" y="78" width="24" height="10" rx="3" fill="rgba(255,166,0,0.3)" stroke="#FFD166" strokeWidth="0.8" opacity="0.9" />
                <text x="260" y="100" fontSize="7" fill="#FFD166" textAnchor="middle" fontFamily="monospace" opacity="0.5">R1 R2</text>
                {/* LED indicator */}
                <circle cx="58" cy="235" r="6" fill="#FFFFFF" opacity="0.7">
                  <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="58" cy="235" r="9" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.3">
                  <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="58" y="252" fontSize="7" fill="#FFFFFF" textAnchor="middle" fontFamily="monospace" opacity="0.5">PWR</text>
                {/* USB connector */}
                <rect x="272" y="210" width="30" height="20" rx="2" fill="rgba(255,255,255,0.1)" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
                <rect x="276" y="214" width="22" height="12" rx="1" fill="rgba(255,255,255,0.05)" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.6" />
                <text x="287" y="243" fontSize="7" fill="#FFFFFF" textAnchor="middle" fontFamily="monospace" opacity="0.5">USB</text>
                {/* Crystal */}
                <ellipse cx="160" cy="72" rx="10" ry="7" fill="rgba(255,255,255,0.1)" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
                <text x="160" y="60" fontSize="7" fill="#FFFFFF" textAnchor="middle" fontFamily="monospace" opacity="0.4">XTAL</text>
                {/* Solder pads */}
                <circle cx="50" cy="80" r="3" fill="#FFD166" opacity="0.6" />
                <circle cx="285" cy="75" r="3" fill="#FFD166" opacity="0.6" />
                <circle cx="55" cy="230" r="3" fill="#FFFFFF" opacity="0.5" />
                {/* Animated trace dot */}
                <circle r="2.5" fill="#FFFFFF">
                  <animateMotion dur="3.5s" repeatCount="indefinite">
                    <mpath href="#bt1" />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" dur="3.5s" repeatCount="indefinite" />
                </circle>
                <path id="bt1" d="M222 120 H260 V75 H248" fill="none" />
                <circle r="2" fill="#FFD166">
                  <animateMotion dur="4s" repeatCount="indefinite" begin="1.2s">
                    <mpath href="#bt2" />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" begin="1.2s" />
                </circle>
                <path id="bt2" d="M128 212 V235 H90 V250" fill="none" />
              </svg>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-2.5 mt-8">
              {[
                { label: "Min. Order", val: "5 pcs", sub: "Small batch ready" },
                { label: "Turnaround", val: "7 days", sub: "Express available" },
                { label: "Delivery", val: "LK-wide", sub: "Sri Lanka" },
                { label: "Support", val: "24/7", sub: "Engineer assist" },
              ].map((c) => (
                <div
                  key={c.label}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 500, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#FFFFFF", fontFamily: "'Syne', sans-serif" }}>{c.val}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════ RIGHT PANEL ══════════ */}
          <div className="flex-1 flex flex-col justify-center relative" style={{ padding: "52px 48px" }}>
            {/* Corner brackets */}
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "rgba(85,48,250,0.25)" }} />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "rgba(85,48,250,0.25)" }} />

            {/* Status bar */}
            <div className="flex items-center gap-2 mb-7">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#5530FA",
                  boxShadow: "0 0 8px #5530FA",
                  animation: "blink 2.4s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 500, color: "#5530FA", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                System Online
              </span>
              <span style={{ fontSize: 12, color: "#CBD5E1", margin: "0 4px" }}>·</span>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>🇱🇰 Sri Lanka Portal</span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 30,
                fontWeight: 700,
                color: "#1E293B",
                letterSpacing: -0.5,
                marginBottom: 6,
              }}
            >
              Customer{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #5530FA, #F51DA5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Sign In
              </span>
            </h1>
            <p style={{ fontSize: 14, color: "#64748B", fontWeight: 300, marginBottom: 32, lineHeight: 1.55 }}>
              Submit and track your PCB assembly orders — from Gerber upload to doorstep delivery.
            </p>

            {/* Error */}
            {error && (
              <div
                className="mb-5 text-left"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#DC2626",
                  fontSize: 13,
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignIn}>
              {/* Email field */}
              <div className="mb-4">
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Email Address
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "#94A3B8" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 7 10-7" />
                  </svg>
                  <input
                    type="email"
                    id="login-email"
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input"
                    style={{
                      width: "100%",
                      height: 50,
                      background: "#F8FAFC",
                      border: "1px solid rgba(85,48,250,0.15)",
                      borderRadius: 10,
                      padding: "0 44px",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 14.5,
                      color: "#1E293B",
                      outline: "none",
                      transition: "border-color 0.25s, box-shadow 0.25s",
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="mb-4">
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Password
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "#94A3B8" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    style={{
                      width: "100%",
                      height: 50,
                      background: "#F8FAFC",
                      border: "1px solid rgba(85,48,250,0.15)",
                      borderRadius: 10,
                      padding: "0 44px",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 14.5,
                      color: "#1E293B",
                      outline: "none",
                      transition: "border-color 0.25s, box-shadow 0.25s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0 border-none bg-transparent cursor-pointer flex items-center transition-colors"
                    style={{ color: "#94A3B8" }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end -mt-2 mb-6">
                <Link
                  href="/forgot-password"
                  style={{ fontSize: 12.5, color: "#5530FA", textDecoration: "none", opacity: 0.8, transition: "opacity 0.2s" }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="login-btn-primary"
                style={{
                  width: "100%",
                  height: 52,
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.03em",
                  transition: "transform 0.18s, box-shadow 0.18s, background 0.2s",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  position: "relative",
                  overflow: "hidden",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                )}
                {loading ? "Signing In..." : "Sign In to Portal"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: "rgba(85,48,250,0.1)" }} />
              <span style={{ fontSize: 12, color: "#94A3B8", letterSpacing: "0.05em" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(85,48,250,0.1)" }} />
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: "100%",
                height: 50,
                background: "rgba(248,250,252,1)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                color: "#1E293B",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "border-color 0.2s, background 0.2s, transform 0.18s",
                marginBottom: 28,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Sign Up link */}
            <p className="text-center" style={{ fontSize: 13.5, color: "#64748B" }}>
              New customer?{" "}
              <Link href="/signup" style={{ color: "#5530FA", textDecoration: "none", fontWeight: 500, transition: "opacity 0.2s" }}>
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
