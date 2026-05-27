"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { orderStep1Schema } from "@/schemas";
import {
  FILE_TYPE_ACCEPT, FILE_TYPE_MAX_MB, FILE_TYPE_LABELS,
  ASSEMBLY_TYPE_LABELS, INSPECTION_LEVEL_LABELS,
  type AssemblyType, type InspectionLevel, type SourcingOption, type FileType,
} from "@/types";
import { validateFileType, validateFileSize, formatFileSize } from "@/utils";
import { AlertCircle, CheckCircle, ChevronDown, HelpCircle, Loader2, MessageCircle, Phone } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const FILE_TYPES: FileType[] = ["bom", "pnp", "gerber", "top_view"];

const FILE_COLUMNS: Record<FileType, string> = {
  bom:      "Designator · Value · Footprint · MPN/Part Number · Quantity",
  pnp:      "Designator · Mid X · Mid Y · Layer · Rotation",
  gerber:   "Full Gerber export in ZIP, or layout PDF/PNG",
  top_view: "PNG or JPG photo/render of the top of the board",
};

const FILE_TIPS: Record<FileType, string> = {
  bom:      "Include MPN/part numbers. Entries like '100nF' with no part code will delay your quote.",
  pnp:      "Same column format as JLCPCB CPL. Export directly from KiCad or Altium.",
  gerber:   "Send the layout, not the schematic. Gerbers must be in a single ZIP file.",
  top_view: "Used for visual confirmation before assembly. Required — do not skip.",
};

type PcbConfig = {
  layers: string;
  width: string;
  height: string;
  unit: string;
  qty: string;
};

function SpecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-[190px] items-center justify-between gap-4 pr-4 text-[15px] font-medium text-slate-900">
      <span>{children}</span>
      <HelpCircle className="h-4 w-4 shrink-0 text-slate-300" />
    </div>
  );
}

function OptionButton({
  selected,
  children,
  className = "",
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-11 rounded-md border px-5 py-2 text-sm font-medium transition-colors ${
        selected
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
      } ${className}`}
    >
      {children}
      {selected && (
        <span className="absolute bottom-0 right-0 h-0 w-0 border-b-[18px] border-l-[18px] border-b-brand-500 border-l-transparent">
          <span className="absolute -bottom-[17px] -right-px text-[10px] leading-none text-white">✓</span>
        </span>
      )}
    </button>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-3 md:grid-cols-[210px_1fr] md:items-center">
      <SpecLabel>{label}</SpecLabel>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contactRequired, setContactRequired] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [createdOrderNumber, setCreatedOrderNumber] = useState("");

  // Step 1
  const [s1, setS1] = useState({
    project_name: "FR-4 PCB Assembly", units: "10", assembly_type: "mixed" as AssemblyType | "",
    inspection_level: "standard" as InspectionLevel,
    customer_notes: "", discount_token: "",
  });
  const [pcbConfig, setPcbConfig] = useState<PcbConfig>({
    layers: "2",
    width: "100",
    height: "100",
    unit: "mm",
    qty: "10",
  });

  // Step 2
  const [files, setFiles] = useState<Partial<Record<FileType, File>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<FileType, string>>>({});
  const [uploadProgress, setUploadProgress] = useState<Partial<Record<FileType, "idle" | "uploading" | "done" | "error">>>({});

  // Step 3
  const [s3, setS3] = useState({
    sourcing_option: "protonest" as SourcingOption,
    allow_equivalents: true,
    customer_supplied_note: "",
    ship_together: true,
    expected_arrival: "",
  });

  function updatePcbConfig<K extends keyof PcbConfig>(key: K, value: PcbConfig[K]) {
    setPcbConfig((config) => ({ ...config, [key]: value }));
    if (key === "qty") {
      setS1((current) => ({ ...current, units: value }));
      setContactRequired(false);
    }
  }

  function buildPcbNotes() {
    return [
      "PCB configuration:",
      `Layers: ${pcbConfig.layers}`,
      `Dimensions: ${pcbConfig.width} x ${pcbConfig.height} ${pcbConfig.unit}`,
      `PCB Qty: ${pcbConfig.qty}`,
      s1.customer_notes ? `Additional Notes: ${s1.customer_notes}` : "",
    ].filter(Boolean).join("\n");
  }

  // ── Step 1 validation & advance ─────────────────────────────────────────
  function validateStep1() {
    const units = Number(s1.units);
    if (s1.units && units > 20) {
      setContactRequired(true);
      setErrors({});
      return false;
    }
    setContactRequired(false);

    const parsed = orderStep1Schema.safeParse({
      ...s1,
      units,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  // ── Step 2: file selection & validation ──────────────────────────────────
  function handleFileSelect(type: FileType, file: File | undefined) {
    if (!file) return;
    const accepted = FILE_TYPE_ACCEPT[type];
    const maxMB = FILE_TYPE_MAX_MB[type];

    if (!validateFileType(file, accepted)) {
      setFileErrors((e) => ({ ...e, [type]: `Invalid file type. Accepted: ${accepted}` }));
      return;
    }
    if (!validateFileSize(file, maxMB)) {
      setFileErrors((e) => ({ ...e, [type]: `File too large. Maximum: ${maxMB} MB` }));
      return;
    }
    setFileErrors((e) => ({ ...e, [type]: "" }));
    setFiles((f) => ({ ...f, [type]: file }));
  }

  const allFilesSelected = FILE_TYPES.every((t) => files[t]);

  // ── Submit all steps ─────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);

    try {
      // 1. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: `${pcbConfig.layers}-Layer PCB Assembly`,
          units: Number(s1.units),
          assembly_type: s1.assembly_type,
          inspection_level: s1.inspection_level,
          customer_notes: buildPcbNotes(),
          discount_token: s1.discount_token || undefined,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error ?? "Failed to create order");
      }

      const orderId = orderData.order.id;
      const orderNumber = orderData.order.order_number;

      // 2. Upload files
      for (const type of FILE_TYPES) {
        const file = files[type];
        if (!file) continue;
        setUploadProgress((p) => ({ ...p, [type]: "uploading" }));

        const formData = new FormData();
        formData.append("file_type", type);
        formData.append("file", file);

        const fileRegisterRes = await fetch(`/api/orders/${orderId}/files`, {
          method: "POST",
          body: formData,
        });
        const fileRegisterData = await fileRegisterRes.json();
        if (!fileRegisterRes.ok) {
          throw new Error(fileRegisterData.error ?? `Failed to register ${FILE_TYPE_LABELS[type]}`);
        }
        setUploadProgress((p) => ({ ...p, [type]: "done" }));
      }

      // 3. Save component sourcing
      const sourcingRes = await fetch(`/api/orders/${orderId}/sourcing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s3),
      });
      const sourcingData = await sourcingRes.json();
      if (!sourcingRes.ok) {
        throw new Error(sourcingData.error ?? "Failed to save component sourcing");
      }

      setCreatedOrderId(orderId);
      setCreatedOrderNumber(orderNumber);
      setStep(4);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step indicator ───────────────────────────────────────────────────────
  const STEPS = ["Order Details", "Upload Files", "Components", "Confirmation"];

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New PCB Assembly Order</h1>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const num = (i + 1) as Step;
            const done = step > num;
            const active = step === num;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all
                    ${done    ? "bg-brand-500 border-brand-500 text-white" : ""}
                    ${active  ? "bg-white border-brand-700 text-brand-700" : ""}
                    ${!done && !active ? "bg-white border-slate-300 text-slate-400" : ""}`}
                  >
                    {done ? "✓" : num}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${active ? "text-brand-700 font-medium" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${done ? "bg-brand-500" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-8">
        {/* ── Step 1 ────────────────────────────────────────────────────── */}
        {step === 1 && contactRequired && (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Phone className="w-7 h-7 text-amber-700" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Contact Protonest</h2>
            <p className="text-sm text-slate-600">
              Orders above <strong>20 units</strong> need a custom quote. Our online portal supports
              small batches of 1–20 units only.
            </p>
            <p className="text-sm text-slate-500">
              You entered <strong>{s1.units} units</strong> for &ldquo;{s1.project_name || "your project"}&rdquo;.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="https://wa.me/94XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-md hover:bg-emerald-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Us
              </a>
              <a
                href="tel:+94XXXXXXXXX"
                className="inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Us
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                setContactRequired(false);
                setS1({ ...s1, units: "20" });
                setPcbConfig({ ...pcbConfig, qty: "20" });
              }}
              className="text-sm text-brand-600 hover:underline"
            >
              ← Change quantity to 20 or fewer
            </button>
          </div>
        )}

        {step === 1 && !contactRequired && (
          <div className="space-y-3">
            <SpecRow label="Layers">
              {["1", "2", "4"].map((layers) => (
                <OptionButton key={layers} selected={pcbConfig.layers === layers} onClick={() => updatePcbConfig("layers", layers)}>
                  {layers}
                </OptionButton>
              ))}
              <div className="flex min-h-11 items-center gap-3 overflow-hidden rounded-md bg-gradient-to-r from-[#b8a14d] to-[#f5edc5] px-4 text-white">
                <span className="text-sm font-medium">High Precision PCB</span>
                {["6", "8", "10", "12", "14", "16"].map((layers) => (
                  <button
                    type="button"
                    key={layers}
                    onClick={() => updatePcbConfig("layers", layers)}
                    className={`min-w-12 rounded bg-white px-3 py-1.5 text-sm font-medium ${
                      pcbConfig.layers === layers ? "text-brand-700 ring-2 ring-brand-500" : "text-[#b8a14d]"
                    }`}
                  >
                    {layers}
                  </button>
                ))}
                <button type="button" className="inline-flex items-center gap-1 rounded bg-white/80 px-3 py-1.5 text-sm font-medium text-[#9d8427]">
                  More <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </SpecRow>

            <SpecRow label="Dimensions">
              <input
                type="number"
                min={1}
                value={pcbConfig.width}
                onChange={(e) => updatePcbConfig("width", e.target.value)}
                className="h-11 w-28 rounded-md border border-slate-200 px-3 text-center text-sm focus:border-brand-500 focus:outline-none"
              />
              <span className="text-lg font-semibold text-slate-700">*</span>
              <input
                type="number"
                min={1}
                value={pcbConfig.height}
                onChange={(e) => updatePcbConfig("height", e.target.value)}
                className="h-11 w-28 rounded-md border border-slate-200 px-3 text-center text-sm focus:border-brand-500 focus:outline-none"
              />
              <select
                value={pcbConfig.unit}
                onChange={(e) => updatePcbConfig("unit", e.target.value)}
                className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="mm">mm</option>
                <option value="inch">inch</option>
              </select>
            </SpecRow>

            <SpecRow label="PCB Qty">
              <select
                value={pcbConfig.qty}
                onChange={(e) => updatePcbConfig("qty", e.target.value)}
                className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm focus:border-brand-500 focus:outline-none"
              >
                {["1", "2", "5", "10", "15", "20", "25", "50"].map((qty) => (
                  <option key={qty} value={qty}>{qty}</option>
                ))}
              </select>
              {errors.units && <p className="text-xs text-red-600">{errors.units}</p>}
            </SpecRow>

            <div className="mt-5 rounded-md bg-slate-100 px-4 py-3 text-base font-bold text-slate-900">
              PCB Specifications
            </div>

            <div className="grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assembly Type</label>
                <select
                  value={s1.assembly_type}
                  onChange={(e) => setS1({ ...s1, assembly_type: e.target.value as AssemblyType })}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none"
                >
                  {Object.entries(ASSEMBLY_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Level</label>
                <select
                  value={s1.inspection_level}
                  onChange={(e) => setS1({ ...s1, inspection_level: e.target.value as InspectionLevel })}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none"
                >
                  {Object.entries(INSPECTION_LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount Token <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={s1.discount_token}
                  maxLength={20}
                  onChange={(e) => setS1({ ...s1, discount_token: e.target.value.toUpperCase() })}
                  placeholder="e.g. AB12CD34"
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Additional Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={s1.customer_notes}
                  maxLength={500}
                  onChange={(e) => setS1({ ...s1, customer_notes: e.target.value })}
                  placeholder="Any special instructions"
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              className="mt-4 w-full rounded-md bg-brand-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
            >
              Next: Upload Files →
            </button>
          </div>
        )}

        {/* ── Step 2 ────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upload Assembly Files</h2>
              <p className="text-sm text-slate-500 mt-1">All four files are required before submission.</p>
            </div>

            {FILE_TYPES.map((type) => {
              const file = files[type];
              const err = fileErrors[type];
              const prog = uploadProgress[type];
              return (
                <div key={type} className={`border rounded-lg p-4 transition-all
                  ${file && !err ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{FILE_TYPE_LABELS[type]}</p>
                      <p className="text-xs text-slate-400">{FILE_TYPE_ACCEPT[type]} · max {FILE_TYPE_MAX_MB[type]} MB</p>
                    </div>
                    {file && !err && (
                      <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {prog === "done" ? "Uploaded" : "Ready"}
                      </span>
                    )}
                  </div>

                  {/* Column guide */}
                  <p className="text-xs font-mono text-slate-500 mb-2 bg-slate-50 rounded px-2 py-1">
                    {FILE_COLUMNS[type]}
                  </p>
                  <p className="text-xs text-slate-400 mb-3">{FILE_TIPS[type]}</p>

                  {type === "bom" && (
                    <a
                      href="/sample-bom.xlsx"
                      className="text-xs text-brand-500 hover:underline block mb-2"
                      download
                    >
                      ↓ Download sample BOM template
                    </a>
                  )}

                  <input
                    type="file"
                    accept={FILE_TYPE_ACCEPT[type]}
                    onChange={(e) => handleFileSelect(type, e.target.files?.[0])}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-300 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50 file:cursor-pointer"
                  />

                  {file && !err && (
                    <p className="text-xs text-slate-400 mt-1">{file.name} ({formatFileSize(file.size)})</p>
                  )}
                  {err && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {err}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="p-3 bg-brand-50 border border-brand-200 rounded-md text-xs text-brand-700">
              Protonest reviews all files manually before preparing your quote. Upload failures can be retried without losing your order details.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                ← Back
              </button>
              <button
                onClick={() => allFilesSelected && setStep(3)}
                disabled={!allFilesSelected}
                className="flex-1 bg-brand-700 text-white font-semibold py-2.5 rounded-md hover:bg-brand-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next: Component Sourcing →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 ────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Component Sourcing</h2>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: "protonest",
                  label: "Protonest Sources All Components",
                  desc: "We order from DigiKey and LCSC. Subject to stock availability.",
                },
                {
                  value: "customer",
                  label: "I Will Supply Components",
                  desc: "Ship your components and PCBs to our address.",
                },
              ].map((opt) => (
                <label key={opt.value}
                  className={`flex items-start gap-3 border rounded-lg px-4 py-4 cursor-pointer transition-all
                  ${s3.sourcing_option === opt.value ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="sourcing" value={opt.value}
                    checked={s3.sourcing_option === opt.value}
                    onChange={() => setS3({ ...s3, sourcing_option: opt.value as SourcingOption })}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {s3.sourcing_option === "protonest" && (
              <div className="space-y-3 pl-2 border-l-2 border-brand-100">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={s3.allow_equivalents}
                    onChange={(e) => setS3({ ...s3, allow_equivalents: e.target.checked })}
                    className="rounded"
                  />
                  Allow equivalent/substitute parts if exact part is out of stock
                </label>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Any customer-supplied components? <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={s3.customer_supplied_note} rows={2} maxLength={500}
                    onChange={(e) => setS3({ ...s3, customer_supplied_note: e.target.value })}
                    placeholder="List any components you will supply separately…"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
              </div>
            )}

            {s3.sourcing_option === "customer" && (
              <div className="space-y-3 pl-2 border-l-2 border-brand-100">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                  <p className="font-medium mb-1">Shipping Address</p>
                  <p className="text-xs">{process.env.NEXT_PUBLIC_SHIPPING_ADDRESS ?? "Address not configured — set NEXT_PUBLIC_SHIPPING_ADDRESS in .env.local"}<br />
                  Please mark your package clearly with your Order ID (assigned after submission).</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={s3.ship_together}
                    onChange={(e) => setS3({ ...s3, ship_together: e.target.checked })}
                    className="rounded"
                  />
                  PCBs and components will be shipped together in one package
                </label>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Arrival Date</label>
                  <input type="date" value={s3.expected_arrival}
                    onChange={(e) => setS3({ ...s3, expected_arrival: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {errors.submit}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-brand-700 text-white font-semibold py-2.5 rounded-md hover:bg-brand-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : "Submit Order"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmation ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Order Submitted!</h2>
            <p className="text-slate-500 text-sm mb-6">
              We have received your files. Expect a quote within <strong>24 hours</strong>.
            </p>

            {/* Order ID badge */}
            <div className="inline-block bg-brand-50 border border-brand-200 rounded-xl px-8 py-4 mb-6">
              <p className="text-xs text-brand-500 uppercase tracking-widest mb-1 font-semibold">Your Order ID</p>
              <p className="text-3xl font-bold text-brand-700 font-mono tracking-wider">
                {createdOrderNumber}
              </p>
              <p className="text-xs text-slate-400 mt-1">Keep this for all future communications</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push(`/orders/${createdOrderId}`)}
                className="bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-md hover:bg-brand-900 transition-colors"
              >
                Track My Order
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="border border-slate-300 text-slate-700 font-medium px-6 py-2.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
