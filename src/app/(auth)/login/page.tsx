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
        @keyframes scanline {
          0%   { top: -2px; }
          100% { top: 100%; }
        }

        .pn-card {
          animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .pn-card::after {
          content: '';
          position: absolute; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(99,71,245,0.55), transparent);
          animation: scanline 8s linear infinite;
          pointer-events: none;
          z-index: 20;
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

      {/* Animated circuit traces */}
      <svg
        style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", width: "100%", height: "100%" }}
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M0 180 H280 V240 H640 V180 H880" stroke="#6347F5" strokeWidth="1.2" fill="none" opacity="0.07" strokeDasharray="4 7" />
        <path d="M1440 380 H1080 V320 H780 V380 H580" stroke="#6347F5" strokeWidth="1.2" fill="none" opacity="0.06" strokeDasharray="4 7" />
        <path d="M0 720 H360 V660 H580 V720 H800" stroke="#4F35D4" strokeWidth="1" fill="none" opacity="0.06" strokeDasharray="3 8" />
        <path d="M1440 80 H1180 V140 H920 V80 H660" stroke="#6347F5" strokeWidth="1" fill="none" opacity="0.05" strokeDasharray="3 7" />
        <path d="M0 840 H420 V780 H640 V840 H900" stroke="#7B5CF6" strokeWidth="0.8" fill="none" opacity="0.05" strokeDasharray="3 7" />

        <circle cx="280" cy="180" r="3.5" fill="#6347F5" opacity="0.12" />
        <circle cx="280" cy="240" r="3.5" fill="#6347F5" opacity="0.12" />
        <circle cx="640" cy="180" r="3.5" fill="#6347F5" opacity="0.12" />
        <circle cx="640" cy="240" r="3.5" fill="#6347F5" opacity="0.12" />
        <circle cx="1080" cy="380" r="3" fill="#6347F5" opacity="0.1" />
        <circle cx="1080" cy="320" r="3" fill="#6347F5" opacity="0.1" />
        <circle cx="780" cy="320" r="3" fill="#6347F5" opacity="0.1" />
        <circle cx="360" cy="720" r="3" fill="#4F35D4" opacity="0.1" />
        <circle cx="580" cy="660" r="3" fill="#4F35D4" opacity="0.1" />

        <circle r="3" fill="#7B5CF6">
          <animateMotion dur="4.5s" repeatCount="indefinite" begin="0s"><mpath href="#bt1" /></animateMotion>
          <animate attributeName="opacity" values="0;0.85;0.85;0" dur="4.5s" repeatCount="indefinite" />
        </circle>
        <path id="bt1" d="M0 180 H280 V240 H640 V180 H880" fill="none" />

        <circle r="2.5" fill="#9D82F8">
          <animateMotion dur="5.5s" repeatCount="indefinite" begin="1.8s"><mpath href="#bt2" /></animateMotion>
          <animate attributeName="opacity" values="0;0.7;0.7;0" dur="5.5s" repeatCount="indefinite" begin="1.8s" />
        </circle>
        <path id="bt2" d="M1440 380 H1080 V320 H780 V380 H580" fill="none" />

        <circle r="2" fill="#6347F5">
          <animateMotion dur="6s" repeatCount="indefinite" begin="0.9s"><mpath href="#bt3" /></animateMotion>
          <animate attributeName="opacity" values="0;0.75;0.75;0" dur="6s" repeatCount="indefinite" begin="0.9s" />
        </circle>
        <path id="bt3" d="M0 840 H420 V780 H640 V840 H900" fill="none" />
      </svg>

      {/* ── CENTER LAYOUT ── */}
      <div
        style={{
          position: "relative", zIndex: 1,
          minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* CARD */}
        <div
          className="pn-card"
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            maxWidth: 960,
            minHeight: 610,
            background: "#0D1124",
            border: "1px solid rgba(99,71,245,0.2)",
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(99,71,245,0.06), 0 24px 80px rgba(5,6,15,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* ══════════ LEFT PANEL ══════════ */}
          <div
            style={{
              width: 430,
              flexShrink: 0,
              background: "#090C1A",
              borderRight: "1px solid rgba(99,71,245,0.14)",
              padding: "44px 40px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
            className="hidden lg:flex"
          >
            {/* Corner brackets */}
            <div style={{ position: "absolute", top: 18, left: 18, width: 22, height: 22, borderTop: "1.5px solid rgba(123,92,246,0.4)", borderLeft: "1.5px solid rgba(123,92,246,0.4)", borderRadius: "2px 0 0 0" }} />
            <div style={{ position: "absolute", bottom: 18, right: 18, width: 22, height: 22, borderBottom: "1.5px solid rgba(123,92,246,0.4)", borderRight: "1.5px solid rgba(123,92,246,0.4)", borderRadius: "0 0 2px 0" }} />

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 38 }}>
              <div
                style={{
                  width: 38, height: 38,
                  background: "linear-gradient(135deg,#7B5CF6,#4F35D4)",
                  borderRadius: 9,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700, color: "white",
                  boxShadow: "0 4px 14px rgba(99,71,245,0.45)",
                  position: "relative", overflow: "hidden",
                }}
              >
                P
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "45%", background: "rgba(255,255,255,0.15)" }} />
              </div>
              <span style={{ fontSize: 19, fontWeight: 700, color: "#EDF0F8", letterSpacing: -0.3 }}>Protonest</span>
              <span
                style={{
                  fontSize: 9, fontWeight: 600, color: "#9D82F8",
                  background: "rgba(99,71,245,0.12)",
                  border: "1px solid rgba(99,71,245,0.3)",
                  borderRadius: 5, padding: "2px 7px",
                  letterSpacing: "0.07em", textTransform: "uppercase",
                  marginLeft: 2, alignSelf: "center",
                }}
              >
                PCB Portal
              </span>
            </div>

            {/* PCB Illustration */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 340 }}>
                <rect x="20" y="28" width="300" height="244" rx="8" fill="#0D1124" stroke="#6347F5" strokeWidth="1.2" opacity="0.85" />
                <circle cx="40" cy="49"  r="5" fill="none" stroke="#6347F5" strokeWidth="1.2" opacity="0.45" />
                <circle cx="300" cy="49" r="5" fill="none" stroke="#6347F5" strokeWidth="1.2" opacity="0.45" />
                <circle cx="40" cy="251" r="5" fill="none" stroke="#6347F5" strokeWidth="1.2" opacity="0.45" />
                <circle cx="300" cy="251" r="5" fill="none" stroke="#6347F5" strokeWidth="1.2" opacity="0.45" />
                <text x="108" y="21" fontSize="8.5" fill="#6347F5" opacity="0.45" fontFamily="monospace">PROTONEST · PCB-PORTAL-V1</text>

                {/* Main IC */}
                <rect x="115" y="105" width="90" height="90" rx="4" fill="#111830" stroke="#6347F5" strokeWidth="1.4" />
                <path d="M115 120 Q120 114 125 120" stroke="#7B5CF6" strokeWidth="1" fill="none" opacity="0.7" />
                <text x="160" y="150" fontSize="9.5" fill="#9D82F8" textAnchor="middle" fontFamily="monospace">MCU</text>
                <text x="160" y="162" fontSize="7" fill="#6347F5" textAnchor="middle" fontFamily="monospace" opacity="0.6">PN-32X</text>

                {/* Pins */}
                {[118,130,142,154,166,178].map(y => (
                  <g key={`l${y}`}>
                    <rect x="97" y={y} width="18" height="5" rx="1.5" fill="#D4860A" opacity="0.8" />
                    <rect x="205" y={y} width="18" height="5" rx="1.5" fill="#D4860A" opacity="0.8" />
                  </g>
                ))}
                {[126,138,150,162,174,186].map(x => (
                  <g key={`t${x}`}>
                    <rect x={x} y="97" width="5" height="18" rx="1.5" fill="#D4860A" opacity="0.8" />
                    <rect x={x} y="195" width="5" height="18" rx="1.5" fill="#D4860A" opacity="0.8" />
                  </g>
                ))}

                {/* Traces */}
                <path d="M97 120 H58 V78 H50" stroke="#6347F5" strokeWidth="1" opacity="0.45" />
                <path d="M97 132 H62" stroke="#6347F5" strokeWidth="1" opacity="0.38" />
                <path d="M97 144 H68 V228 H54" stroke="#6347F5" strokeWidth="1" opacity="0.32" />
                <path d="M97 156 H60" stroke="#6347F5" strokeWidth="1" opacity="0.38" />
                <path d="M97 168 H54 V235" stroke="#6347F5" strokeWidth="1" opacity="0.3" />
                <path d="M223 120 H262 V74 H286" stroke="#6347F5" strokeWidth="1" opacity="0.45" />
                <path d="M223 132 H256" stroke="#6347F5" strokeWidth="1" opacity="0.38" />
                <path d="M223 156 H266 V222 H282" stroke="#6347F5" strokeWidth="1" opacity="0.32" />
                <path d="M223 168 H252" stroke="#6347F5" strokeWidth="1" opacity="0.38" />
                <path d="M128 97 V68 H78 V54" stroke="#6347F5" strokeWidth="1" opacity="0.38" />
                <path d="M152 97 V63" stroke="#6347F5" strokeWidth="1" opacity="0.3" />
                <path d="M176 97 V68 H222 V54" stroke="#6347F5" strokeWidth="1" opacity="0.38" />
                <path d="M128 213 V236 H88 V252" stroke="#6347F5" strokeWidth="1" opacity="0.3" />
                <path d="M164 213 V246" stroke="#6347F5" strokeWidth="1" opacity="0.28" />
                <path d="M188 213 V236 H242 V252" stroke="#6347F5" strokeWidth="1" opacity="0.3" />

                {/* Capacitors */}
                <rect x="47" y="66" width="13" height="21" rx="2" fill="#111830" stroke="#6347F5" strokeWidth="0.9" />
                <rect x="66" y="66" width="13" height="21" rx="2" fill="#111830" stroke="#6347F5" strokeWidth="0.9" />
                <line x1="53.5" y1="70" x2="53.5" y2="84" stroke="#7B5CF6" strokeWidth="1.4" opacity="0.7" />
                <line x1="72.5" y1="70" x2="72.5" y2="84" stroke="#7B5CF6" strokeWidth="1.4" opacity="0.7" />
                <text x="53" y="97" fontSize="7" fill="#6347F5" textAnchor="middle" fontFamily="monospace" opacity="0.5">C1</text>
                <text x="73" y="97" fontSize="7" fill="#6347F5" textAnchor="middle" fontFamily="monospace" opacity="0.5">C2</text>

                {/* Resistors */}
                <rect x="248" y="61" width="24" height="10" rx="3" fill="#1E1240" stroke="#9D82F8" strokeWidth="0.8" opacity="0.85" />
                <line x1="244" y1="66" x2="248" y2="66" stroke="#D4860A" strokeWidth="1" opacity="0.75" />
                <line x1="272" y1="66" x2="278" y2="66" stroke="#D4860A" strokeWidth="1" opacity="0.75" />
                <rect x="248" y="77" width="24" height="10" rx="3" fill="#1E1240" stroke="#9D82F8" strokeWidth="0.8" opacity="0.85" />
                <line x1="244" y1="82" x2="248" y2="82" stroke="#D4860A" strokeWidth="1" opacity="0.75" />
                <line x1="272" y1="82" x2="278" y2="82" stroke="#D4860A" strokeWidth="1" opacity="0.75" />
                <text x="260" y="98" fontSize="7" fill="#9D82F8" textAnchor="middle" fontFamily="monospace" opacity="0.5">R1 R2</text>

                {/* LED */}
                <circle cx="57" cy="236" r="6" fill="#7B5CF6" opacity="0.8">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="57" cy="236" r="10" fill="none" stroke="#7B5CF6" strokeWidth="0.8" opacity="0.25">
                  <animate attributeName="opacity" values="0.05;0.35;0.05" dur="2.2s" repeatCount="indefinite" />
                </circle>
                <text x="57" y="253" fontSize="7" fill="#7B5CF6" textAnchor="middle" fontFamily="monospace" opacity="0.6">PWR</text>

                {/* USB */}
                <rect x="272" y="212" width="30" height="20" rx="2" fill="#111830" stroke="#6347F5" strokeWidth="1" opacity="0.75" />
                <rect x="276" y="216" width="22" height="12" rx="1" fill="#090C1A" stroke="#6347F5" strokeWidth="0.5" opacity="0.6" />
                <text x="287" y="244" fontSize="7" fill="#6347F5" textAnchor="middle" fontFamily="monospace" opacity="0.5">USB</text>

                {/* Crystal */}
                <ellipse cx="160" cy="72" rx="10" ry="6.5" fill="#111830" stroke="#9D82F8" strokeWidth="0.9" opacity="0.7" />
                <text x="160" y="60" fontSize="7" fill="#9D82F8" textAnchor="middle" fontFamily="monospace" opacity="0.4">XTAL</text>

                {/* Solder pads */}
                <circle cx="50" cy="78" r="3" fill="#D4860A" opacity="0.55" />
                <circle cx="62" cy="132" r="3" fill="#6347F5" opacity="0.5" />
                <circle cx="256" cy="132" r="3" fill="#6347F5" opacity="0.5" />
                <circle cx="286" cy="74" r="3" fill="#D4860A" opacity="0.55" />
                <circle cx="54" cy="228" r="2.5" fill="#6347F5" opacity="0.4" />

                {/* Animated dots on board */}
                <circle r="2.5" fill="#9D82F8">
                  <animateMotion dur="3.2s" repeatCount="indefinite"><mpath href="#ic-t1" /></animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" repeatCount="indefinite" />
                </circle>
                <path id="ic-t1" d="M223 120 H262 V74 H248" fill="none" />

                <circle r="2" fill="#D4860A">
                  <animateMotion dur="3.8s" repeatCount="indefinite" begin="1.4s"><mpath href="#ic-t2" /></animateMotion>
                  <animate attributeName="opacity" values="0;0.9;0.9;0" dur="3.8s" repeatCount="indefinite" begin="1.4s" />
                </circle>
                <path id="ic-t2" d="M128 213 V236 H88 V252" fill="none" />
              </svg>
            </div>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 28 }}>
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
                    background: "rgba(99,71,245,0.07)",
                    border: "1px solid rgba(99,71,245,0.15)",
                    borderRadius: 10,
                    padding: "11px 13px",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, color: "#4A5578", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#9D82F8" }}>{c.val}</div>
                  <div style={{ fontSize: 11, color: "#4A5578", marginTop: 1 }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════ RIGHT PANEL ══════════ */}
          <div
            style={{
              flex: 1,
              padding: "52px 50px",
              display: "flex", flexDirection: "column", justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Corner brackets */}
            <div style={{ position: "absolute", top: 18, right: 18, width: 18, height: 18, borderTop: "1.5px solid rgba(99,71,245,0.25)", borderRight: "1.5px solid rgba(99,71,245,0.25)" }} />
            <div style={{ position: "absolute", bottom: 18, left: 18, width: 18, height: 18, borderBottom: "1.5px solid rgba(99,71,245,0.25)", borderLeft: "1.5px solid rgba(99,71,245,0.25)" }} />

            {/* Status bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 30 }}>
              <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
                <div className="sdot-ring" />
                <div className="sdot-inner" />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9D82F8", textTransform: "uppercase", letterSpacing: "0.07em" }}>System Online</span>
              <span style={{ fontSize: 12, color: "#4A5578", margin: "0 4px" }}>·</span>
              <span style={{ fontSize: 12, color: "#8896B0" }}>🇱🇰 Sri Lanka Portal</span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 31, fontWeight: 700, color: "#EDF0F8", letterSpacing: -0.6, lineHeight: 1.2, marginBottom: 8 }}>
              Customer{" "}
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
            <p style={{ fontSize: 14, color: "#8896B0", fontWeight: 300, lineHeight: 1.6, marginBottom: 34 }}>
              Submit and track your PCB assembly orders — from Gerber upload to doorstep delivery.
            </p>

            {/* Error */}
            {error && (
              <div
                style={{
                  marginBottom: 20,
                  background: "rgba(239,68,68,0.09)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#FCA5A5",
                  fontSize: 13,
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignIn}>
              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8896B0", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 7 }}>
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "#4A5578", pointerEvents: "none" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                    className="pn-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8896B0", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 7 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "#4A5578", pointerEvents: "none" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                    className="pn-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "#4A5578", padding: 0, display: "flex", alignItems: "center",
                      transition: "color 0.2s",
                    }}
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

              {/* Forgot */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -10, marginBottom: 26 }}>
                <Link href="/forgot-password" style={{ fontSize: 12.5, color: "#9D82F8", textDecoration: "none", opacity: 0.85, transition: "opacity 0.2s" }}>
                  Forgot password?
                </Link>
              </div>

              {/* Sign In button */}
              <button type="submit" disabled={loading} className="pn-btn-primary">
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                )}
                {loading ? "Signing In…" : "Sign In to Portal"}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(99,71,245,0.15)" }} />
              <span style={{ fontSize: 12, color: "#4A5578" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(99,71,245,0.15)" }} />
            </div>

            {/* Google */}
            <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="pn-btn-google">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Sign Up */}
            <p style={{ textAlign: "center", fontSize: 13.5, color: "#8896B0" }}>
              New customer?{" "}
              <Link href="/signup" style={{ color: "#9D82F8", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}>
                Create Account
              </Link>
              &nbsp;·&nbsp;
              <Link href="/guest-order" style={{ color: "#9D82F8", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}>
                Place a Guest Order
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
