import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-900">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-900/40 via-slate-900 to-slate-900"></div>
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] rounded-full bg-brand-500/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 py-8 px-4 text-center">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-lg">P</span>
          Protonest
        </Link>
      </div>
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          {children}
        </div>
      </div>
    </div>
  );
}
