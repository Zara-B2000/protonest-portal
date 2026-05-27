"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Calculator } from "lucide-react";

export function HeroQuoteBar() {
  const [layers, setLayers] = useState("2");
  const [qty, setQty] = useState("5");
  const [dim, setDim] = useState("100 x 100 mm");
  
  const [openDropdown, setOpenDropdown] = useState<"layers" | "qty" | null>(null);
  
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const quantities = ["5", "10", "15", "20", "25", "30", "50", "75", "100", "500", "1000", "2000"];
  const layerOptions = ["1", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32"];

  return (
    <div className="relative w-full max-w-4xl mt-10" ref={barRef}>
      {/* Popovers */}
      {openDropdown === "qty" && (
        <div className="absolute bottom-full mb-3 left-0 sm:left-[50%] md:left-[60%] w-[320px] bg-white rounded-lg shadow-2xl p-4 border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm text-slate-400 mb-3">Quantity</p>
          <div className="grid grid-cols-4 gap-2">
            {quantities.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setQty(q); setOpenDropdown(null); }}
                className={`py-2 text-sm text-center rounded border ${
                  qty === q 
                    ? "border-brand-500 text-brand-700 bg-brand-50" 
                    : "border-slate-200 text-slate-700 hover:border-brand-400 hover:text-brand-500"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {openDropdown === "layers" && (
        <div className="absolute bottom-full mb-3 left-0 sm:left-4 w-[320px] bg-white rounded-lg shadow-2xl p-4 border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm text-slate-400 mb-3">Layers</p>
          <div className="grid grid-cols-4 gap-2">
            {layerOptions.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => { setLayers(l); setOpenDropdown(null); }}
                className={`py-2 text-sm text-center rounded border ${
                  layers === l 
                    ? "border-brand-500 text-brand-700 bg-brand-50" 
                    : "border-slate-200 text-slate-700 hover:border-brand-400 hover:text-brand-500"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="bg-white rounded-md inline-flex flex-col sm:flex-row items-center w-full shadow-2xl p-1 gap-1">
        
        {/* Icon */}
        <div className="px-4 text-slate-400 hidden sm:block">
          <Calculator className="w-5 h-5" />
        </div>

        {/* Layers */}
        <button 
          onClick={() => setOpenDropdown(openDropdown === "layers" ? null : "layers")}
          className="flex-1 px-4 py-3 sm:py-3.5 bg-slate-50 hover:bg-slate-100 rounded text-left border-b sm:border-b-0 sm:border-r border-slate-200 text-sm w-full sm:w-auto flex justify-between items-center transition-colors"
        >
          <strong className="text-slate-900 font-medium">{layers} Layers</strong>
          <span className="text-slate-400 text-xs">▼</span>
        </button>

        {/* Dimensions */}
        <div className="flex-1 px-4 py-3 sm:py-3.5 bg-slate-50 rounded text-left border-b sm:border-b-0 sm:border-r border-slate-200 text-sm w-full sm:w-auto flex items-center justify-between">
          <input 
            type="text" 
            value={dim}
            onChange={(e) => setDim(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-900 font-medium w-full"
          />
        </div>

        {/* Quantity */}
        <button 
          onClick={() => setOpenDropdown(openDropdown === "qty" ? null : "qty")}
          className="flex-1 px-4 py-3 sm:py-3.5 bg-slate-50 hover:bg-slate-100 rounded text-left text-sm w-full sm:w-auto flex justify-between items-center transition-colors mr-1"
        >
          <strong className="text-slate-900 font-medium">{qty} pcs</strong>
          <span className="text-slate-400 text-xs">▼</span>
        </button>

        {/* Submit */}
        <Link
          href={`/signup?layers=${encodeURIComponent(layers)}&qty=${qty}&dim=${encodeURIComponent(dim)}`}
          className="w-full sm:w-auto bg-brand-500 text-white font-bold px-8 py-3.5 rounded hover:bg-brand-600 transition-colors text-center whitespace-nowrap"
        >
          Get Instant Quote
        </Link>
      </div>
    </div>
  );
}
