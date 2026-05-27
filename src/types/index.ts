// ─────────────────────────────────────────────────────────────────────────────
// Protonest Portal — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "admin";

export type OrderStatus =
  | "quote_pending"
  | "quote_ready"
  | "payment_completed"
  | "components_received"
  | "in_assembly"
  | "inspection"
  | "ready_for_delivery"
  | "delivered";

export type AssemblyType = "smt_only" | "through_hole_only" | "mixed";
export type InspectionLevel = "standard" | "detailed";
export type SourcingOption = "protonest" | "customer";
export type FileType = "bom" | "pnp" | "gerber" | "top_view";
export type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "revised";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentGateway = "payhere" | "bank_transfer";
export type NotificationChannel = "email" | "sms";
export type NotificationStatus = "sent" | "failed" | "skipped";
export type DiscountType = "fixed" | "percentage";

// ── Database row types ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  clerk_user_id?: string | null;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  project_name: string;
  units: number;
  assembly_type: AssemblyType;
  inspection_level: InspectionLevel;
  customer_notes: string | null;
  status: OrderStatus;
  expected_delivery: string | null;
  discount_token_used: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  profiles?: Profile;
  order_files?: OrderFile[];
  component_sourcing?: ComponentSourcing;
  quotes?: Quote[];
  payments?: Payment[];
  status_history?: StatusHistory[];
}

export interface OrderFile {
  id: string;
  order_id: string;
  file_type: FileType;
  storage_path: string;
  original_name: string;
  file_size_bytes: number | null;
  uploaded_at: string;
}

export interface ComponentSourcing {
  id: string;
  order_id: string;
  sourcing_option: SourcingOption;
  allow_equivalents: boolean;
  customer_supplied_note: string | null;
  customer_supplied_path: string | null;
  ship_together: boolean | null;
  expected_arrival: string | null;
  created_at: string;
}

export interface Quote {
  id: string;
  order_id: string;
  admin_id: string;
  amount_lkr: number;
  customer_notes: string | null;
  admin_notes?: string | null; // only in admin context
  valid_until: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  profiles?: Profile; // joined admin profile
}

export interface Payment {
  id: string;
  order_id: string;
  quote_id: string | null;
  gateway: PaymentGateway;
  amount_lkr: number;
  gateway_reference: string | null;
  payhere_payment_id: string | null;
  status: PaymentStatus;
  ipn_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistory {
  id: string;
  order_id: string;
  changed_by: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  note: string | null;
  changed_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  channel: NotificationChannel;
  event_type: string;
  recipient: string;
  status: NotificationStatus;
  error_reason: string | null;
  sent_at: string;
}

export interface DiscountToken {
  id: string;
  source_order_id: string | null;
  customer_id: string;
  token_code: string;
  discount_type: DiscountType;
  discount_value: number;
  valid_until: string;
  used: boolean;
  used_at: string | null;
  used_on_order: string | null;
  created_at: string;
}

export interface AdminNote {
  id: string;
  order_id: string;
  admin_id: string;
  note_text: string;
  created_at: string;
  profiles?: Profile;
}

export interface Conversation {
  id: string;
  customer_id: string;
  updated_at: string;
  created_at: string;
  // Joined
  profiles?: Profile;
  messages?: Message[];
  unread_count?: number;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  // Joined
  profiles?: Profile;
}

// ── Form / API types ──────────────────────────────────────────────────────────

export interface OrderFormStep1 {
  project_name: string;
  units: number;
  assembly_type: AssemblyType;
  inspection_level: InspectionLevel;
  customer_notes?: string;
  discount_token?: string;
}

export interface OrderFormStep3 {
  sourcing_option: SourcingOption;
  allow_equivalents?: boolean;
  customer_supplied_note?: string;
  ship_together?: boolean;
  expected_arrival?: string;
}

export interface CreateQuoteInput {
  order_id: string;
  amount_lkr: number;
  customer_notes?: string;
  admin_notes?: string;
  valid_until: string;
}

export interface PayHereIPN {
  merchant_id: string;
  order_id: string;
  payment_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  status_message?: string;
  method?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

// ── UI helper types ───────────────────────────────────────────────────────────

export interface StatusStep {
  status: OrderStatus;
  label: string;
  description: string;
}

export const ORDER_STATUS_STEPS: StatusStep[] = [
  { status: "quote_pending",       label: "Quote Pending",        description: "Files received, preparing quote" },
  { status: "quote_ready",         label: "Quote Ready",          description: "Quote sent — awaiting payment" },
  { status: "payment_completed",   label: "Payment Completed",    description: "Payment verified" },
  { status: "components_received", label: "Components Received",  description: "All parts in hand" },
  { status: "in_assembly",         label: "In Assembly",          description: "PCBs being assembled" },
  { status: "inspection",          label: "Inspection",           description: "Quality check in progress" },
  { status: "ready_for_delivery",  label: "Ready for Delivery",   description: "Packed and ready to dispatch" },
  { status: "delivered",           label: "Delivered",            description: "Order complete" },
];

export const ASSEMBLY_TYPE_LABELS: Record<AssemblyType, string> = {
  smt_only:        "SMT Only",
  through_hole_only: "Through-Hole Only",
  mixed:           "Mixed (SMT + Through-Hole)",
};

export const INSPECTION_LEVEL_LABELS: Record<InspectionLevel, string> = {
  standard: "Standard",
  detailed: "Detailed",
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  bom:      "Bill of Materials (BOM)",
  pnp:      "Pick & Place / CPL",
  gerber:   "Gerber / Layout",
  top_view: "Top View Image",
};

export const FILE_TYPE_ACCEPT: Record<FileType, string> = {
  bom:      ".xlsx,.xls,.csv",
  pnp:      ".csv,.xlsx,.txt",
  gerber:   ".zip,.pdf,.png",
  top_view: ".png,.jpg,.jpeg",
};

export const FILE_TYPE_MAX_MB: Record<FileType, number> = {
  bom:      20,
  pnp:      20,
  gerber:   50,
  top_view: 10,
};
