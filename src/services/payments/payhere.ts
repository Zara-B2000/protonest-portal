import crypto from "crypto";

const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;
const PAYHERE_ENV = process.env.PAYHERE_ENV ?? "sandbox";

export const PAYHERE_CHECKOUT_URL =
  PAYHERE_ENV === "live"
    ? "https://www.payhere.lk/pay/checkout"
    : "https://sandbox.payhere.lk/pay/checkout";

export interface PayHereCheckoutParams {
  order_id: string;        // our payment record ID
  amount: string;          // e.g. "15000.00"
  currency: string;        // "LKR"
  items: string;           // description
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  notify_url: string;
  return_url: string;
  cancel_url: string;
}

/**
 * Generates the MD5 hash required by PayHere checkout.
 * Formula: MD5( merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase() )
 */
export function generatePayHereHash(
  orderId: string,
  amount: string,
  currency: string
): string {
  const secretHash = crypto
    .createHash("md5")
    .update(PAYHERE_MERCHANT_SECRET)
    .digest("hex")
    .toUpperCase();

  const raw = `${PAYHERE_MERCHANT_ID}${orderId}${amount}${currency}${secretHash}`;
  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
}

/**
 * Verifies the MD5 hash in a PayHere IPN callback.
 * CRITICAL: Always verify this server-side before updating payment status.
 * Formula: MD5( merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret).toUpperCase() )
 */
export function verifyPayHereIPN(params: {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
}): boolean {
  if (params.merchant_id !== PAYHERE_MERCHANT_ID) {
    return false;
  }

  const secretHash = crypto
    .createHash("md5")
    .update(PAYHERE_MERCHANT_SECRET)
    .digest("hex")
    .toUpperCase();

  const raw = `${params.merchant_id}${params.order_id}${params.payhere_amount}${params.payhere_currency}${params.status_code}${secretHash}`;
  const expected = crypto.createHash("md5").update(raw).digest("hex").toUpperCase();

  return expected === params.md5sig.toUpperCase();
}

/** PayHere status codes */
export const PAYHERE_STATUS = {
  SUCCESS: "2",
  PENDING: "0",
  FAILED: "-1",
  CANCELLED: "-2",
  CHARGEDBACK: "-3",
} as const;

export function getMerchantId() {
  return PAYHERE_MERCHANT_ID;
}

export function formatAmount(lkr: number): string {
  return lkr.toFixed(2);
}
