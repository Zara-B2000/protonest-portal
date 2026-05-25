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

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contactRequired, setContactRequired] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [createdOrderNumber, setCreatedOrderNumber] = useState("");
  
  // Custom local state for styling / conformal coating
  const [conformalCoating, setConformalCoating] = useState("None");

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
      conformalCoating !== "None" ? `Conformal Coating: ${conformalCoating}` : "",
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

  return (
    <>
      <style>{`
        .new-order-container {
          --bg:       #05060F;
          --bg2:      #090C1A;
          --bg3:      #0D1124;
          --bg4:      #111730;
          --bg5:      #161D3A;
          --p6:       #4530C8;
          --p5:       #5B42E8;
          --p4:       #7B5CF6;
          --p3:       #9D82F8;
          --p2:       #C4B5FD;
          --p1:       #EDE9FE;
          --copper:   #E09424;
          --copper-d: #A86A10;
          --success:  #34D399;
          --warning:  #FBBF24;
          --danger:   #F87171;
          --border:   rgba(91,66,232,0.16);
          --border2:  rgba(91,66,232,0.32);
          --text1:    #EEF0FB;
          --text2:    #8896B8;
          --text3:    #4A567A;
        }
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:.25;} }
        @keyframes pulse{0%,100%{transform:scale(1);opacity:.5;}50%{transform:scale(1.9);opacity:0;}}
        @keyframes slideIn{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
        @keyframes checkPop{0%{transform:scale(0);}70%{transform:scale(1.25);}100%{transform:scale(1);}}

        .bg-deco{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .bg-deco::before{
          content:'';position:absolute;
          width:600px;height:600px;
          background:radial-gradient(circle,rgba(91,66,232,.06) 0%,transparent 65%);
          top:10%;left:55%;transform:translateX(-20%);
        }
        .grid-lines{
          position:fixed;inset:0;z-index:0;pointer-events:none;
          background-image:
            linear-gradient(rgba(91,66,232,.022) 1px,transparent 1px),
            linear-gradient(90deg,rgba(91,66,232,.022) 1px,transparent 1px);
          background-size:40px 40px;
        }

        .tb-title{font-size:17px;font-weight:700;color:var(--text1);letter-spacing:-.3px;flex:1;}
        .tb-title span{color:var(--p3);}
        
        .progress-bar{
          height:3px;
          background:rgba(91,66,232,.12);
          position:relative;overflow:hidden;
        }
        .progress-fill{
          height:100%;
          background:linear-gradient(90deg,var(--p4),var(--p3));
          border-radius:0 2px 2px 0;
          transition:width .45s cubic-bezier(.16,1,.3,1);
        }

        .page-header{
          margin-bottom:36px;
          animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;
        }
        .page-eyebrow{
          font-size:12px;font-weight:600;color:var(--p3);
          text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;
          display:flex;align-items:center;gap:6px;
        }
        .page-eyebrow::before{
          content:'';width:20px;height:1.5px;background:var(--p4);border-radius:2px;
        }
        .page-title{
          font-size:30px;color:var(--text1);letter-spacing:-.4px;
        }
        .page-title em{font-style:italic;color:var(--p3);}

        /* Stepper */
        .stepper{
          display:flex;align-items:center;
          margin-bottom:36px;
          animation:fadeUp .45s .05s cubic-bezier(.16,1,.3,1) both;
        }
        .step-item{
          display:flex;flex-direction:column;align-items:center;
          position:relative;flex:1;
        }
        .step-item:not(:last-child)::after{
          content:'';
          position:absolute;
          top:19px;left:calc(50% + 22px);right:calc(-50% + 22px);
          height:1.5px;
          background:var(--border);
          transition:background .4s;
        }
        .step-item.done:not(:last-child)::after{background:var(--p5);}
        .step-circle{
          width:38px;height:38px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:700;
          border:1.5px solid var(--border);
          background:var(--bg3);
          color:var(--text3);
          position:relative;z-index:1;
          transition:all .3s;
        }
        .step-circle.active{
          border-color:var(--p4);
          background:rgba(91,66,232,.16);
          color:var(--p3);
          box-shadow:0 0 0 4px rgba(91,66,232,.12);
        }
        .step-circle.done{
          border-color:var(--p5);
          background:linear-gradient(135deg,var(--p4),var(--p6));
          color:#fff;
        }
        .step-circle.done svg{animation:checkPop .35s ease both;}
        .step-pulse{
          position:absolute;width:38px;height:38px;border-radius:50%;
          border:1.5px solid var(--p4);
          animation:pulse 2s ease-out infinite;
        }
        .step-lbl{
          font-size:11.5px;font-weight:500;color:var(--text3);
          margin-top:8px;text-align:center;white-space:nowrap;
          transition:color .3s;
        }
        .step-item.active .step-lbl{color:var(--p3);}
        .step-item.done .step-lbl{color:var(--text2);}

        .form-card{
          background:var(--bg3);
          border:1px solid var(--border);
          border-radius:20px;
          overflow:hidden;
          animation:fadeUp .5s .1s cubic-bezier(.16,1,.3,1) both;
        }

        .step-panel{display:none;}
        .step-panel.active{display:block;animation:slideIn .35s cubic-bezier(.16,1,.3,1) both;}

        .sec-head{
          padding:22px 28px 18px;
          border-bottom:1px solid var(--border);
          display:flex;align-items:center;gap:12px;
        }
        .sec-icon{
          width:36px;height:36px;border-radius:10px;flex-shrink:0;
          background:rgba(91,66,232,.14);
          display:flex;align-items:center;justify-content:center;
          color:var(--p3);
        }
        .sec-icon svg{width:17px;height:17px;}
        .sec-title{font-size:16px;font-weight:700;color:var(--text1);}
        .sec-sub{font-size:12.5px;color:var(--text3);margin-top:1px;}

        .form-body{padding:28px 28px 24px;}
        .field-row{
          display:grid;gap:20px;margin-bottom:24px;
        }
        .field-row.col2{grid-template-columns:1fr;}
        .field-row.col3{grid-template-columns:1fr;}
        @media(min-width: 768px){
          .field-row.col2{grid-template-columns:1fr 1fr;}
          .field-row.col3{grid-template-columns:1fr 1fr 1fr;}
        }

        .field-lbl{
          display:flex;align-items:center;gap:7px;
          font-size:11px;font-weight:600;color:var(--text2);
          text-transform:uppercase;letter-spacing:.09em;margin-bottom:10px;
        }
        .field-lbl svg{width:13px;height:13px;color:var(--p3);}
        .field-hint{
          display:inline-flex;align-items:center;justify-content:center;
          width:16px;height:16px;border-radius:50%;
          background:rgba(91,66,232,.15);color:var(--p3);
          font-size:10px;font-weight:700;cursor:help;margin-left:3px;
          flex-shrink:0;
        }

        .chips{display:flex;flex-wrap:wrap;gap:7px;}
        .chip{
          height:38px;min-width:44px;
          display:flex;align-items:center;justify-content:center;
          padding:0 16px;
          background:var(--bg4);
          border:1.5px solid var(--border);
          border-radius:10px;
          font-size:14px;font-weight:600;color:var(--text2);
          cursor:pointer;transition:all .18s;
          user-select:none;position:relative;overflow:hidden;
        }
        .chip:hover{border-color:var(--border2);color:var(--text1);}
        .chip.selected{
          border-color:var(--p4);
          background:rgba(91,66,232,.16);
          color:var(--p3);
          box-shadow:0 0 0 3px rgba(91,66,232,.1);
        }
        .chip.selected::after{
          content:'✓';
          position:absolute;bottom:2px;right:4px;
          font-size:8px;color:var(--p3);
        }
        .chip.premium{
          background:linear-gradient(135deg,rgba(224,148,36,.1),rgba(168,106,16,.08));
          border-color:rgba(224,148,36,.3);
          color:var(--copper);
          font-size:12.5px;padding:0 14px;
        }
        .chip.premium.selected{
          border-color:var(--copper);
          box-shadow:0 0 0 3px rgba(224,148,36,.12);
        }
        .chip.more-btn{
          font-size:12.5px;gap:5px;padding:0 14px;
          background:rgba(91,66,232,.06);
        }

        .inp{
          height:48px;width:100%;
          background:var(--bg2);
          border:1.5px solid var(--border);
          border-radius:11px;
          padding:0 16px;
          font-size:14.5px;color:var(--text1);
          outline:none;transition:border-color .22s,box-shadow .22s;
          appearance:none;
        }
        .inp::placeholder{color:var(--text3);}
        .inp:focus{border-color:var(--p4);box-shadow:0 0 0 3px rgba(91,66,232,.12);}
        .inp-wrap{position:relative;}
        .inp-wrap .inp{padding-right:42px;}
        .inp-unit{
          position:absolute;right:14px;top:50%;transform:translateY(-50%);
          font-size:13px;font-weight:600;color:var(--text3);pointer-events:none;
        }
        .inp-join{
          display:flex;align-items:center;gap:8px;
        }
        .inp-join .inp{flex:1;}
        .inp-sep{font-size:18px;color:var(--text3);font-weight:300;}

        select.inp{
          cursor:pointer;
          background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%234A567A' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat:no-repeat;background-position:right 14px center;
          padding-right:36px;
        }
        select.inp option{background:var(--bg3); color:var(--text1);}

        .sub-divider{
          display:flex;align-items:center;gap:12px;
          margin:8px 0 22px;
        }
        .sub-divider-label{
          font-size:13px;font-weight:700;color:var(--text1);
          background:linear-gradient(90deg,rgba(91,66,232,.14),rgba(91,66,232,.06));
          border:1px solid rgba(91,66,232,.18);
          border-radius:8px;
          padding:8px 14px;
          display:flex;align-items:center;gap:8px;
          white-space:nowrap;
        }
        .sub-divider-label svg{width:14px;height:14px;color:var(--p3);}
        .sub-divider-line{flex:1;height:1px;background:var(--border);}

        textarea.inp{
          height:82px;padding:12px 16px;resize:none;line-height:1.55;
        }

        .info-tip{
          display:flex;gap:10px;align-items:flex-start;
          background:rgba(91,66,232,.06);
          border:1px solid rgba(91,66,232,.16);
          border-radius:10px;padding:12px 14px;
          margin-bottom:20px;
          font-size:12.5px;color:var(--text2);line-height:1.6;
        }
        .info-tip svg{width:15px;height:15px;color:var(--p3);flex-shrink:0;margin-top:1px;}

        .form-footer{
          padding:20px 28px;
          border-top:1px solid var(--border);
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(0,0,0,.15);
        }
        .btn-back{
          height:46px;padding:0 20px;
          background:rgba(255,255,255,.04);
          border:1.5px solid var(--border);border-radius:11px;
          font-size:14px;font-weight:500;
          color:var(--text2);cursor:pointer;
          display:flex;align-items:center;gap:8px;
          transition:all .18s;
        }
        .btn-back:hover{background:rgba(255,255,255,.07);color:var(--text1);border-color:var(--border2);}
        .btn-back svg{width:15px;height:15px;}
        
        .btn-next{
          height:46px;padding:0 28px;
          background:linear-gradient(135deg,var(--p4),var(--p6));
          border:none;border-radius:11px;
          font-size:14.5px;font-weight:700;color:#fff;
          cursor:pointer;display:flex;align-items:center;gap:9px;
          transition:transform .18s,box-shadow .18s;
          box-shadow:0 4px 18px rgba(91,66,232,.38),inset 0 1px 0 rgba(255,255,255,.14);
          position:relative;overflow:hidden;
        }
        .btn-next::before{
          content:'';position:absolute;inset:0;
          background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,transparent 55%);
          pointer-events:none;
        }
        .btn-next:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(91,66,232,.52);}
        .btn-next:active{transform:translateY(0);}
        .btn-next svg{width:16px;height:16px;}
        .step-count{font-size:12.5px;color:var(--text3);}

        .upload-zone{
          border:2px dashed var(--border2);
          border-radius:14px;
          padding:32px 20px;
          text-align:center;
          cursor:pointer;
          transition:border-color .2s,background .2s;
          background:rgba(91,66,232,.03);
          margin-bottom:12px;
        }
        .upload-zone:hover{border-color:var(--p4);background:rgba(91,66,232,.07);}
        .upload-icon{
          width:44px;height:44px;border-radius:12px;
          background:rgba(91,66,232,.14);border:1px solid rgba(91,66,232,.24);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 12px;color:var(--p3);
        }
        .upload-icon svg{width:20px;height:20px;}
        .upload-title{font-size:15px;font-weight:600;color:var(--text1);margin-bottom:4px;}
        .upload-sub{font-size:12px;color:var(--text3);}
        .upload-sub span{color:var(--p3);font-weight:500;}
        .upload-formats{
          display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:10px;
        }
        .fmt-chip{
          font-size:10px;font-weight:600;
          background:rgba(91,66,232,.1);border:1px solid rgba(91,66,232,.22);
          border-radius:5px;padding:2px 8px;color:var(--p3);letter-spacing:.04em;
        }

        .bom-table-wrap{border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px;}
        .bom-table{width:100%;border-collapse:collapse;}
        .bom-table th{
          padding:11px 16px;font-size:11px;font-weight:600;
          color:var(--text3);text-transform:uppercase;letter-spacing:.07em;
          background:rgba(0,0,0,.25);text-align:left;border-bottom:1px solid var(--border);
        }
        .bom-table td{
          padding:12px 16px;font-size:13px;color:var(--text2);
          border-bottom:1px solid rgba(91,66,232,.07);vertical-align:middle;
        }
        .bom-table tr:last-child td{border-bottom:none;}
        .bom-table tr:hover td{background:rgba(91,66,232,.04);}
        .bom-status{
          display:inline-flex;align-items:center;gap:5px;
          font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;
        }
        .bom-status.ok{background:rgba(52,211,153,.1);color:var(--success);}
        .bom-status.warn{background:rgba(251,191,36,.1);color:var(--warning);}

        .confirm-grid{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:20px;}
        @media(min-width: 640px){
          .confirm-grid{grid-template-columns:1fr 1fr;}
        }
        .confirm-block{
          background:var(--bg4);border:1px solid var(--border);
          border-radius:12px;padding:16px 18px;
        }
        .cb-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.09em;margin-bottom:10px;}
        .cb-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(91,66,232,.07);}
        .cb-row:last-child{border-bottom:none;}
        .cb-key{font-size:12.5px;color:var(--text2);}
        .cb-val{font-size:12.5px;font-weight:600;color:var(--text1);}
        
        .price-total{
          background:linear-gradient(135deg,rgba(91,66,232,.14),rgba(91,66,232,.08));
          border:1px solid rgba(91,66,232,.24);
          border-radius:14px;padding:20px 24px;
          display:flex;align-items:center;justify-content:space-between;
          margin-bottom:16px;
        }
        .price-label{font-size:13.5px;font-weight:600;color:var(--text1);}
        .price-label small{display:block;font-size:11px;color:var(--text3);font-weight:400;margin-top:2px;}
        .price-val{font-size:30px;color:var(--p3);font-weight:700;}
        .price-currency{font-size:15px;vertical-align:super;margin-right:2px;}

        .success-panel{
          padding:60px 40px;text-align:center;
          animation:fadeIn .5s ease both;
        }
        .success-ring{
          width:80px;height:80px;border-radius:50%;
          background:linear-gradient(135deg,var(--p4),var(--p6));
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 20px;font-size:32px;
          box-shadow:0 8px 30px rgba(91,66,232,.45);
        }
        .success-title{font-size:26px;color:var(--text1);margin-bottom:8px;font-weight:700;}
        .success-sub{font-size:14px;color:var(--text2);line-height:1.65;margin-bottom:28px;}
        .order-id{
          display:inline-flex;align-items:center;gap:8px;
          background:rgba(91,66,232,.12);border:1px solid rgba(91,66,232,.24);
          border-radius:10px;padding:10px 20px;
          font-size:15px;font-weight:700;color:var(--p3);
          margin-bottom:28px;letter-spacing:.04em;
        }
      `}</style>

      <div className="new-order-container relative w-full">
        <div className="bg-deco"></div>
        <div className="grid-lines"></div>

        {/* ── TOPBAR ── */}
        <header className="lg:flex hidden h-[62px] bg-[#090C1A]/80 backdrop-blur-md border-b border-purple-950/20 items-center px-8 gap-3 sticky top-0 z-50">
          <div className="tb-title">New <span>PCB Assembly Order</span></div>
          <div className="flex gap-2">
            <div className="btn-icon" title="Documentation / Help Guidelines">
              <HelpCircle className="w-4.5 h-4.5" />
            </div>
          </div>
        </header>

        {/* ── Progress bar ── */}
        {step < 4 && (
          <div className="progress-bar relative z-10">
            <div className="progress-fill" style={{ width: `${step * 25}%` }}></div>
          </div>
        )}

        <div className="content relative z-10 mx-auto px-4 py-8 max-w-4xl">
          {/* Page Header */}
          <div className="page-header">
            <div className="page-eyebrow">PCB Assembly Portal</div>
            <div className="page-title font-bold text-white tracking-tight">
              New <em className="text-[#9D82F8] not-italic font-semibold">Assembly</em> Order
            </div>
          </div>

          {/* STEPPER */}
          {step < 4 && (
            <div className="stepper">
              {[
                { num: 1, label: "Order Details" },
                { num: 2, label: "Upload Files" },
                { num: 3, label: "Components" },
                { num: 4, label: "Confirmation" },
              ].map((s) => {
                const done = step > s.num;
                const active = step === s.num;
                return (
                  <div key={s.num} className={`step-item ${done ? "done" : ""} ${active ? "active" : ""}`}>
                    <div className={`step-circle ${done ? "done" : ""} ${active ? "active" : ""}`}>
                      {active && <div className="step-pulse"></div>}
                      {done ? (
                        <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        s.num
                      )}
                    </div>
                    <div className="step-lbl">{s.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* FORM CARD */}
          <div className="form-card relative">
            
            {/* ─ STEP 1: ORDER DETAILS ─ */}
            <div className={`step-panel ${step === 1 && !contactRequired ? "active" : ""}`}>
              <div className="sec-head">
                <div className="sec-icon">
                  <PlusCircle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="sec-title">PCB Configuration</div>
                  <div className="sec-sub text-slate-500 text-xs mt-0.5">Set dimensions, layers, and quantities for your board</div>
                </div>
              </div>
              <div className="form-body">
                {/* Layers selection */}
                <div className="field-row mb-6">
                  <div className="field-group">
                    <div className="field-lbl">
                      <Layers className="w-3.5 h-3.5" />
                      Layers
                      <span className="field-hint" title="Number of copper layers in your PCB design. Standard is 2 layers.">?</span>
                    </div>
                    <div className="chips">
                      {["1", "2", "4"].map((l) => (
                        <div
                          key={l}
                          className={`chip ${pcbConfig.layers === l ? "selected" : ""}`}
                          onClick={() => updatePcbConfig("layers", l)}
                        >
                          {l}
                        </div>
                      ))}
                      
                      <div className={`chip premium ${["6", "8", "10", "12", "14", "16"].includes(pcbConfig.layers) ? "selected" : ""}`}>
                        ✦ High Precision
                      </div>

                      {["6", "8", "10", "12", "14", "16"].map((l) => (
                        <div
                          key={l}
                          className={`chip ${pcbConfig.layers === l ? "selected" : ""}`}
                          onClick={() => updatePcbConfig("layers", l)}
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dimensions and Quantity */}
                <div className="field-row col2 mb-6">
                  <div className="field-group">
                    <div className="field-lbl">
                      <svg className="w-3.5 h-3.5 text-[#9D82F8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                      Dimensions
                      <span className="field-hint" title="Outer dimensions of your individual PCB board in mm or inches.">?</span>
                    </div>
                    <div className="inp-join">
                      <div className="inp-wrap">
                        <input
                          className="inp"
                          type="number"
                          min={5}
                          max={600}
                          value={pcbConfig.width}
                          onChange={(e) => updatePcbConfig("width", e.target.value)}
                          placeholder="Width"
                        />
                        <span className="inp-unit">W</span>
                      </div>
                      <span className="inp-sep">×</span>
                      <div className="inp-wrap">
                        <input
                          className="inp"
                          type="number"
                          min={5}
                          max={600}
                          value={pcbConfig.height}
                          onChange={(e) => updatePcbConfig("height", e.target.value)}
                          placeholder="Height"
                        />
                        <span className="inp-unit">H</span>
                      </div>
                      <select
                        className="inp"
                        style={{ width: "80px", flexShrink: 0 }}
                        value={pcbConfig.unit}
                        onChange={(e) => updatePcbConfig("unit", e.target.value)}
                      >
                        <option value="mm">mm</option>
                        <option value="inch">inch</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-group">
                    <div className="field-lbl">
                      <Layers className="w-3.5 h-3.5" />
                      PCB Quantity
                      <span className="field-hint" title="Select quantity. Online checkout supports up to 20 units.">?</span>
                    </div>
                    <select
                      className="inp"
                      value={pcbConfig.qty}
                      onChange={(e) => updatePcbConfig("qty", e.target.value)}
                    >
                      {["1", "2", "5", "10", "15", "20", "25", "50"].map((qty) => (
                        <option key={qty} value={qty}>{qty}</option>
                      ))}
                    </select>
                    {errors.units && <p className="text-xs text-red-400 mt-1">{errors.units}</p>}
                  </div>
                </div>

                {/* Sub-divider specs */}
                <div className="sub-divider">
                  <div className="sub-divider-label bg-purple-950/20">
                    <ShieldCheck className="w-4 h-4 text-[#9D82F8]" />
                    Assembly Details
                  </div>
                  <div className="sub-divider-line"></div>
                </div>

                <div className="field-row col2 mb-6">
                  <div className="field-group">
                    <div className="field-lbl">Assembly Type</div>
                    <select
                      className="inp"
                      value={s1.assembly_type}
                      onChange={(e) => setS1({ ...s1, assembly_type: e.target.value as AssemblyType })}
                    >
                      {Object.entries(ASSEMBLY_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <div className="field-lbl">Inspection Level</div>
                    <select
                      className="inp"
                      value={s1.inspection_level}
                      onChange={(e) => setS1({ ...s1, inspection_level: e.target.value as InspectionLevel })}
                    >
                      {Object.entries(INSPECTION_LEVEL_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field-row col2">
                  <div className="field-group">
                    <div className="field-lbl">
                      Discount Token <span className="text-slate-500 font-normal lowercase ml-1">(optional)</span>
                    </div>
                    <input
                      className="inp font-mono"
                      type="text"
                      placeholder="e.g. AB12CD34"
                      value={s1.discount_token}
                      maxLength={20}
                      onChange={(e) => setS1({ ...s1, discount_token: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="field-group">
                    <div className="field-lbl">
                      Additional Notes <span className="text-slate-500 font-normal lowercase ml-1">(optional)</span>
                    </div>
                    <input
                      className="inp"
                      type="text"
                      placeholder="Special instructions or tolerances"
                      value={s1.customer_notes}
                      maxLength={500}
                      onChange={(e) => setS1({ ...s1, customer_notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-footer">
                <div className="step-count">Step 1 of 4</div>
                <button
                  type="button"
                  onClick={() => { if (validateStep1()) setStep(2); }}
                  className="btn-next"
                >
                  Next: Upload Files
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step 1: Contact support warning if quantity > 20 */}
            {step === 1 && contactRequired && (
              <div className="form-body py-12 text-center max-w-md mx-auto space-y-6">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-400">
                  <Phone className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Contact Protonest</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Orders above <strong className="text-white">20 units</strong> require engineer review and manual quoting. Our online checkout portal currently supports batches of 1–20 units.
                  </p>
                  <p className="text-xs text-slate-500 mt-3 bg-[#05060f]/60 p-2.5 rounded border border-purple-950/20 font-mono">
                    Project Quantity: {s1.units} units
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <a
                    href="https://wa.me/94XXXXXXXXX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-950/20 transition-all duration-200 text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Us
                  </a>
                  <a
                    href="tel:+94XXXXXXXXX"
                    className="inline-flex items-center justify-center gap-2 border border-purple-950/30 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 hover:text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
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
                  className="text-xs text-[#9D82F8] hover:underline"
                >
                  ← Adjust quantity to 20 or fewer
                </button>
              </div>
            )}

            {/* ── STEP 2: UPLOAD FILES ─ */}
            <div className={`step-panel ${step === 2 ? "active" : ""}`}>
              <div className="sec-head">
                <div className="sec-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                </div>
                <div>
                  <div className="sec-title">Upload Design Files</div>
                  <div className="sec-sub text-slate-500 text-xs mt-0.5">Gerber layout files, BOM list, and Centroid placements are required.</div>
                </div>
              </div>
              
              <div className="form-body space-y-6">
                <div className="info-tip">
                  <AlertCircle className="w-4 h-4 text-[#9D82F8] flex-shrink-0 mt-0.5" />
                  <span>
                    Compress all layout layers (silkscreen, copper, drill, masks) into a single <strong className="text-white">.zip</strong> or <strong className="text-white">.rar</strong> archive before submitting.
                  </span>
                </div>

                {FILE_TYPES.map((type) => {
                  const file = files[type];
                  const err = fileErrors[type];
                  const prog = uploadProgress[type];
                  return (
                    <div key={type} className={`border rounded-xl p-5 transition-all bg-[#0d1124] ${
                      file && !err ? "border-emerald-500/35 bg-emerald-950/5" : "border-purple-950/20"
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {FILE_TYPE_LABELS[type]} {type !== "top_view" && type !== "pnp" && <span className="text-red-400">*</span>}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{FILE_TYPE_ACCEPT[type]} · max {FILE_TYPE_MAX_MB[type]} MB</p>
                        </div>
                        {file && !err && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {prog === "done" ? "Uploaded" : "Ready"}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-mono text-slate-400 mb-2 bg-[#05060f]/60 rounded px-2.5 py-1.5 border border-purple-950/10">
                        {FILE_COLUMNS[type]}
                      </p>
                      <p className="text-xs text-slate-500 mb-3">{FILE_TIPS[type]}</p>

                      {type === "bom" && (
                        <a
                          href="/sample-bom.xlsx"
                          className="text-xs text-[#9D82F8] hover:text-[#b49ffd] font-semibold block mb-3"
                          download
                        >
                          ↓ Download sample BOM template
                        </a>
                      )}

                      <div className="relative">
                        <input
                          type="file"
                          id={`file-input-${type}`}
                          accept={FILE_TYPE_ACCEPT[type]}
                          onChange={(e) => handleFileSelect(type, e.target.files?.[0])}
                          className="hidden"
                        />
                        <label
                          htmlFor={`file-input-${type}`}
                          className="upload-zone flex flex-col items-center justify-center py-6 px-4 border border-dashed border-purple-950/40 rounded-xl bg-purple-950/5 hover:border-purple-500/30 hover:bg-purple-950/10 transition-all cursor-pointer text-center"
                        >
                          <div className="upload-icon mb-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                            </svg>
                          </div>
                          <div className="upload-title text-xs font-bold text-slate-200">
                            {file ? "Replace File" : "Select File"}
                          </div>
                          <div className="upload-sub text-[10px] text-slate-500 font-mono">
                            {file ? file.name : "or click to upload from computer"}
                          </div>
                        </label>
                      </div>

                      {file && !err && (
                        <p className="text-[11px] text-slate-400 mt-2 font-mono truncate">{file.name} ({formatFileSize(file.size)})</p>
                      )}
                      {err && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" /> {err}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="form-footer">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-back"
                >
                  Back
                </button>
                <div className="step-count">Step 2 of 4</div>
                <button
                  type="button"
                  onClick={() => allFilesSelected && setStep(3)}
                  disabled={!files.bom || !files.gerber}
                  className="btn-next disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next: Sourcing
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── STEP 3: COMPONENTS ── */}
            <div className={`step-panel ${step === 3 ? "active" : ""}`}>
              <div className="sec-head">
                <div className="sec-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <div>
                  <div className="sec-title">Component Sourcing</div>
                  <div className="sec-sub text-slate-500 text-xs mt-0.5">Verify quantities and conformal coating preferences</div>
                </div>
              </div>

              <div className="form-body space-y-6">
                <div className="info-tip">
                  <CheckCircle className="w-4.5 h-4.5 text-[#34D399] flex-shrink-0 mt-0.5" />
                  <span>
                    BOM parsed successfully — <strong className="text-[#34D399]">8 components</strong> matched in layout stencils. Review inventory status below.
                  </span>
                </div>

                {/* Parsed BOM Preview Table */}
                <div className="bom-table-wrap">
                  <table className="bom-table">
                    <thead>
                      <tr className="bg-[#05060f]">
                        <th>Ref</th><th>Component</th><th>Value</th><th>Qty</th><th>Package</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#0d1124]/40">
                      <tr><td>U1</td><td>STM32F103C8T6</td><td>MCU 64K</td><td>1</td><td>LQFP-48</td><td><span className="bom-status ok">✓ In Stock</span></td></tr>
                      <tr><td>C1–C4</td><td>Capacitor MLCC</td><td>100nF</td><td>4</td><td>0402</td><td><span className="bom-status ok">✓ In Stock</span></td></tr>
                      <tr><td>R1–R6</td><td>Resistor</td><td>10kΩ</td><td>6</td><td>0402</td><td><span className="bom-status ok">✓ In Stock</span></td></tr>
                      <tr><td>LED1–LED3</td><td>LED RGB</td><td>WS2812B</td><td>3</td><td>5050</td><td><span className="bom-status warn">⚠ Lead time 3d</span></td></tr>
                      <tr><td>J1</td><td>USB Type-C Connector</td><td>16-pin</td><td>1</td><td>SMD</td><td><span className="bom-status ok">✓ In Stock</span></td></tr>
                      <tr><td>L1</td><td>Inductor</td><td>10µH</td><td>1</td><td>0603</td><td><span className="bom-status ok">✓ In Stock</span></td></tr>
                      <tr><td>Q1</td><td>MOSFET N-CH</td><td>AO3400</td><td>1</td><td>SOT-23</td><td><span className="bom-status ok">✓ In Stock</span></td></tr>
                      <tr><td>Y1</td><td>Crystal Oscillator</td><td>8MHz</td><td>1</td><td>3225</td><td><span className="bom-status ok">✓ In Stock</span></td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Sourcing Method Selectors */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {[
                    {
                      value: "protonest",
                      label: "Protonest Sources All Components",
                      desc: "We buy direct from authorized distributors (DigiKey, LCSC). Subject to part stocks.",
                    },
                    {
                      value: "customer",
                      label: "I Will Supply All Components",
                      desc: "Ship your pre-purchased boards and parts package to our facility address.",
                    },
                  ].map((opt) => (
                    <label key={opt.value}
                      className={`flex items-start gap-3 border rounded-xl px-4 py-4 cursor-pointer transition-all
                      ${s3.sourcing_option === opt.value ? "border-purple-500/40 bg-purple-950/14" : "border-purple-950/20 hover:border-purple-500/20"}`}>
                      <input type="radio" name="sourcing" value={opt.value}
                        checked={s3.sourcing_option === opt.value}
                        onChange={() => setS3({ ...s3, sourcing_option: opt.value as SourcingOption })}
                        className="mt-1 accent-purple-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-white">{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Conditional Fields */}
                {s3.sourcing_option === "protonest" && (
                  <div className="space-y-4 pl-3 border-l-2 border-[#7B5CF6]/50">
                    <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s3.allow_equivalents}
                        onChange={(e) => setS3({ ...s3, allow_equivalents: e.target.checked })}
                        className="rounded accent-purple-500 border-purple-950/40 bg-slate-950"
                      />
                      Allow equivalents or substitute components if exact matches are backordered
                    </label>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Supply Partial Components? <span className="text-slate-500 font-normal lowercase">(optional)</span>
                      </label>
                      <textarea
                        value={s3.customer_supplied_note}
                        onChange={(e) => setS3({ ...s3, customer_supplied_note: e.target.value })}
                        placeholder="List specific custom parts or ICs you will ship separately..."
                        className="w-full border border-purple-950/20 rounded-xl px-4 py-2.5 text-sm bg-slate-950 text-white outline-none focus:border-purple-500/45 resize-none h-16"
                      />
                    </div>
                  </div>
                )}

                {s3.sourcing_option === "customer" && (
                  <div className="space-y-4 pl-3 border-l-2 border-[#7B5CF6]/50">
                    <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
                      <p className="font-bold text-amber-200 mb-1">Production Shipping Address</p>
                      <p>
                        Protonest Assembly Hub<br/>
                        102/4 Industrial Zone, Colombo, Sri Lanka.<br/>
                        Please label packages clearly with your final Order ID.
                      </p>
                    </div>
                    <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s3.ship_together}
                        onChange={(e) => setS3({ ...s3, ship_together: e.target.checked })}
                        className="rounded accent-purple-500 border-purple-950/40 bg-slate-950"
                      />
                      PCB boards and electronic parts will ship in a single combined parcel
                    </label>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Expected Arrival Date</label>
                      <input
                        type="date"
                        value={s3.expected_arrival}
                        onChange={(e) => setS3({ ...s3, expected_arrival: e.target.value })}
                        className="inp font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Additional Spec: Conformal Coating dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Conformal Coating</label>
                  <select
                    value={conformalCoating}
                    onChange={(e) => setConformalCoating(e.target.value)}
                    className="inp"
                  >
                    <option value="None">None</option>
                    <option value="Acrylic">Acrylic (Fast drying standard protection)</option>
                    <option value="Silicone">Silicone (High temperature moisture seal)</option>
                    <option value="Polyurethane">Polyurethane (Chemical resistant casing)</option>
                  </select>
                </div>

                {errors.submit && (
                  <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errors.submit}</span>
                  </div>
                )}
              </div>

              <div className="form-footer">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-back"
                >
                  Back
                </button>
                <div className="step-count">Step 3 of 4</div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-next disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  ) : (
                    <>
                      Submit Order
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── STEP 4: CONFIRMATION & SUCCESS ── */}
            <div className={`step-panel ${step === 4 ? "active" : ""}`}>
              <div className="success-panel">
                <div className="success-ring">✦</div>
                <h2 className="success-title">Order Placed Successfully!</h2>
                <p className="success-sub leading-relaxed">
                  Your PCB assembly design files are in queue.<br/>
                  Our engineer team will review layout dimensions and confirm a quote within <strong className="text-[#9D82F8]">24 hours</strong>.
                </p>
                <div className="order-id inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Order #{createdOrderNumber}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                  <button
                    onClick={() => router.push(`/orders/${createdOrderId}`)}
                    className="w-full bg-gradient-to-r from-[#7B5CF6] to-[#4530C8] hover:from-[#8d72f8] hover:to-[#553ed4] text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-purple-900/30 text-sm"
                  >
                    Track Order Stage
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full border border-purple-950/30 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 hover:text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
