/**
 * Dialog Ideamart SMS Gateway integration
 * Docs: https://ideamart.io/
 *
 * High-priority events only:
 *   - Order submitted
 *   - Quote ready
 *   - Payment confirmed
 *   - Ready for delivery
 */

const SMS_ENABLED = process.env.SMS_ENABLED === "true";
const IDEAMART_APP_ID = process.env.IDEAMART_APP_ID ?? "";
const IDEAMART_PASSWORD = process.env.IDEAMART_PASSWORD ?? "";
const SENDER_ID = process.env.IDEAMART_SENDER_ID ?? "PROTONEST";
const IDEAMART_URL = "https://api.dialog.lk/sms/send";

interface SMSSendResult {
  success: boolean;
  response?: unknown;
  error?: string;
  stubbed?: boolean;
}

/**
 * Normalise a Sri Lankan phone number to international format.
 * Input: 0771234567 | 94771234567 | +94771234567
 * Output: +94771234567
 */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("94") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+94${digits.slice(1)}`;
  if (digits.length === 9) return `+94${digits}`;
  return `+${digits}`;
}

async function sendRaw(to: string, message: string): Promise<SMSSendResult> {
  if (!SMS_ENABLED) {
    console.log(`[SMS STUB] To: ${to} | Message: ${message}`);
    return { success: true, stubbed: true };
  }

  const phone = normalisePhone(to);
  const payload = {
    applicationId: IDEAMART_APP_ID,
    password: IDEAMART_PASSWORD,
    senderId: SENDER_ID,
    message,
    destinationAddresses: [phone],
  };

  try {
    const res = await fetch(IDEAMART_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { success: res.ok, response: data };
  } catch (err) {
    console.error("[SMS] Send failed:", err);
    return { success: false, error: String(err) };
  }
}

// ── SMS templates ─────────────────────────────────────────────────────────────

export async function smsOrderReceived(phone: string, orderNumber: string) {
  const msg = `Protonest: Your order ${orderNumber} has been received. You will get a quote within 24hrs. Track: protonest.lk`;
  return sendRaw(phone, msg);
}

export async function smsQuoteReady(phone: string, orderNumber: string, amountLkr: number) {
  const msg = `Protonest: Your quote for ${orderNumber} is ready. Amount: LKR ${amountLkr.toLocaleString()}. Login to accept & pay: protonest.lk`;
  return sendRaw(phone, msg);
}

export async function smsPaymentConfirmed(phone: string, orderNumber: string) {
  const msg = `Protonest: Payment confirmed for ${orderNumber}. Assembly will begin after components arrive. Track: protonest.lk`;
  return sendRaw(phone, msg);
}

export async function smsReadyForDelivery(phone: string, orderNumber: string) {
  const msg = `Protonest: Your order ${orderNumber} is ready for delivery! We will contact you to coordinate. Track: protonest.lk`;
  return sendRaw(phone, msg);
}
