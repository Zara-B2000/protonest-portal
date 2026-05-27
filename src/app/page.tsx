import Link from "next/link";
import {
  Clock, Package, Shield, Truck
} from "lucide-react";
import { HeroQuoteBar } from "@/components/shared/HeroQuoteBar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="absolute top-0 left-0 w-full z-50 border-b border-white/10 bg-slate-900/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-xl text-white tracking-tight">Protonest</span>
          <div className="flex items-center gap-4">
            <Link href="/signup" className="text-sm font-medium text-white border border-white/40 hover:bg-white/10 px-5 py-2 rounded-full transition-colors hidden sm:block">
              Order Now
            </Link>
            <Link
              href="/login"
              className="text-sm bg-brand-500 text-white font-medium px-6 py-2 rounded-full hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[650px] flex items-center justify-start overflow-hidden">
        {/* Background Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        >
          <source src="/slomo_attractive.mp4" type="video/mp4" />
        </video>
        {/* Dark Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-slate-900/60 z-10" />

        {/* Content */}
        <div className="relative z-20 max-w-6xl mx-auto px-4 w-full text-left pt-16">
          <p className="text-xl md:text-2xl text-slate-200 mb-3 font-light">
            Journey of Limitless Creativity —
          </p>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight text-white max-w-3xl">
            PCB Manufacturing &amp; Assembly
          </h1>
          
          <HeroQuoteBar />
        </div>
      </section>

      {/* ── Value strip ───────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          {[
            { icon: <Clock className="w-5 h-5" />, label: "Quote in 24 hours" },
            { icon: <Truck className="w-5 h-5" />, label: "10–15 day delivery" },
            { icon: <Package className="w-5 h-5" />, label: "1–20 units per order" },
            { icon: <Shield className="w-5 h-5" />, label: "Secure online payment" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5 text-slate-600">
              <span className="text-brand-500">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services Showcase ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            All-in-One Electronics &amp; PCB Assembly Solutions
          </h2>
          <p className="text-slate-500 mb-10 text-sm">Professional SMT assembly with fast turnaround, right here in Sri Lanka.</p>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_280px] gap-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">

            {/* ── Left Sidebar ── */}
            <div className="border-r border-slate-200 bg-white">
              <div className="px-5 py-4 text-sm font-bold text-slate-900 border-l-2 border-brand-500 bg-slate-50">
                PCB Assembly
              </div>
            </div>

            {/* ── Center Video ── */}
            <div className="relative bg-slate-900 min-h-[420px] flex items-center justify-center overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover absolute inset-0"
              >
                <source src="/1000380664.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/20" />
            </div>

            {/* ── Right Card ── */}
            <div className="border-l border-slate-200 bg-white p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">PCB Assembly</h3>
                <ul className="space-y-2 mb-6">
                  {[
                    "SMT & THT assembly",
                    "1–20 units per order",
                    "BOM + CPL file upload",
                    "Quote within 24 hours",
                    "Free DFM check",
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-brand-500 mt-0.5">•</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-slate-100 pt-4 mb-5">
                  <p className="text-xs text-slate-400 mb-1">Build Time</p>
                  <p className="text-sm font-semibold text-slate-700">10–15 Business Days</p>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-md transition-colors"
                >
                  Get Instant Quote
                </Link>
                <Link
                  href="/signup"
                  className="block w-full text-center border border-slate-300 hover:border-brand-400 hover:text-brand-600 text-slate-700 font-medium py-3 rounded-md transition-colors text-sm"
                >
                  PCB Assembly Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Files required ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1fr_420px] items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5">
              Sri Lanka’s Trusted PCB Manufacturer.
            </h2>
            <p className="text-slate-600 mb-6 leading-7">
              Protonest supports reliable PCB manufacturing and assembly for
              makers, startups, and engineering teams who need precise
              small-batch production with local support.
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                "We specialize in small-batch PCB assembly in Sri Lanka using customer-provided PCBs.",
                "We accept orders up to 20 units per batch with high precision and quality control.",
                "We provide component sourcing from trusted suppliers like DigiKey and LCSC.",
                "We deliver quotes within 24 hours and complete orders in 10–15 days after readiness.",
                "We offer live tracking, secure payments, and notifications via email and SMS.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative min-h-[340px] overflow-hidden rounded-xl bg-slate-900 shadow-sm">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/1000380665.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: "What is the maximum order size?",
                a: "20 units per order for the MVP period. Contact us directly for larger runs.",
              },
              {
                q: "How long does assembly take?",
                a: "10–15 business days after payment is confirmed and all materials are ready.",
              },
              {
                q: "Do I need to supply the PCBs?",
                a: "Yes. Protonest handles assembly only. You supply the bare PCBs.",
              },
              {
                q: "Can Protonest source components for me?",
                a: "Yes. We source from DigiKey and LCSC. Subject to availability. You can also supply your own components.",
              },
              {
                q: "What payment methods are accepted?",
                a: "Visa, Mastercard, Amex, Genie, FriMi, eZcash, mCash, and internet banking via PayHere. Bank transfer is also available.",
              },
              {
                q: "Is my order data secure?",
                a: "All uploaded files are stored privately with access-controlled signed URLs. We never share your files with third parties.",
              },
            ].map((item) => (
              <details key={item.q} className="border border-slate-200 rounded-lg group">
                <summary className="px-5 py-4 cursor-pointer font-medium text-slate-900 list-none flex justify-between items-center">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-slate-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-brand-700 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to assemble your PCB?</h2>
        <p className="text-brand-100 mb-8">Create a free account and submit your first order in minutes.</p>
        <Link
          href="/signup"
          className="bg-white text-brand-700 font-semibold px-10 py-3 rounded-md hover:bg-brand-50 transition-colors"
        >
          Get Started — It&apos;s Free
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-8 px-4 text-center text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Protonest PCB Assembly · Sri Lanka</p>
        <p className="mt-1">
          Questions? WhatsApp or call{" "}
          <a href="tel:+94XXXXXXXXX" className="text-brand-500 hover:underline">
            +94 XX XXX XXXX
          </a>
        </p>
      </footer>
    </div>
  );
}
