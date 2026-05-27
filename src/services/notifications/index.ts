/**
 * Notification orchestrator
 * Triggers the right email + SMS for each order status change,
 * then logs the result to the notifications table.
 */
import { createServiceClient } from "@/services/supabase/server";
import * as email from "./email";
import * as sms from "./sms";
import type { Order, OrderStatus, Profile, Quote } from "@/types";

async function logNotification(params: {
  order_id: string;
  customer_id: string;
  channel: "email" | "sms";
  event_type: string;
  recipient: string;
  success: boolean;
  error?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("notifications").insert({
    order_id: params.order_id,
    customer_id: params.customer_id,
    channel: params.channel,
    event_type: params.event_type,
    recipient: params.recipient,
    status: params.success ? "sent" : "failed",
    error_reason: params.error ?? null,
  });
}

interface NotifyParams {
  order: Order;
  customer: Profile;
  status: OrderStatus;
  quote?: Quote;
}

export async function triggerNotifications({ order, customer, status, quote }: NotifyParams) {
  const ctx = {
    to: customer.email,
    customerName: customer.full_name ?? customer.email,
    orderNumber: order.order_number,
    projectName: order.project_name,
    orderId: order.id,
  };

  const phone = customer.phone;

  switch (status) {
    case "quote_pending": {
      // Order submitted confirmation
      const emailResult = await email.sendOrderConfirmation(ctx);
      await logNotification({
        order_id: order.id,
        customer_id: customer.id,
        channel: "email",
        event_type: "order_submitted",
        recipient: customer.email,
        success: emailResult?.success ?? false,
        error: emailResult?.error,
      });

      if (phone) {
        const smsResult = await sms.smsOrderReceived(phone, order.order_number);
        await logNotification({
          order_id: order.id,
          customer_id: customer.id,
          channel: "sms",
          event_type: "order_submitted",
          recipient: phone,
          success: smsResult.success,
          error: smsResult.error,
        });
      }
      break;
    }

    case "quote_ready": {
      if (!quote) break;
      const emailResult = await email.sendQuoteReady(
        ctx,
        quote.amount_lkr,
        quote.valid_until,
        quote.customer_notes ?? undefined
      );
      await logNotification({
        order_id: order.id,
        customer_id: customer.id,
        channel: "email",
        event_type: "quote_ready",
        recipient: customer.email,
        success: emailResult?.success ?? false,
        error: emailResult?.error,
      });

      if (phone) {
        const smsResult = await sms.smsQuoteReady(phone, order.order_number, quote.amount_lkr);
        await logNotification({
          order_id: order.id,
          customer_id: customer.id,
          channel: "sms",
          event_type: "quote_ready",
          recipient: phone,
          success: smsResult.success,
          error: smsResult.error,
        });
      }
      break;
    }

    case "payment_completed": {
      const amountLkr = quote?.amount_lkr ?? 0;
      const emailResult = await email.sendPaymentConfirmation(ctx, amountLkr);
      await logNotification({
        order_id: order.id,
        customer_id: customer.id,
        channel: "email",
        event_type: "payment_completed",
        recipient: customer.email,
        success: emailResult?.success ?? false,
        error: emailResult?.error,
      });

      if (phone) {
        const smsResult = await sms.smsPaymentConfirmed(phone, order.order_number);
        await logNotification({
          order_id: order.id,
          customer_id: customer.id,
          channel: "sms",
          event_type: "payment_completed",
          recipient: phone,
          success: smsResult.success,
          error: smsResult.error,
        });
      }
      break;
    }

    case "ready_for_delivery": {
      const emailResult = await email.sendStatusUpdate(ctx, status);
      await logNotification({
        order_id: order.id,
        customer_id: customer.id,
        channel: "email",
        event_type: "ready_for_delivery",
        recipient: customer.email,
        success: emailResult?.success ?? false,
        error: emailResult?.error,
      });

      if (phone) {
        const smsResult = await sms.smsReadyForDelivery(phone, order.order_number);
        await logNotification({
          order_id: order.id,
          customer_id: customer.id,
          channel: "sms",
          event_type: "ready_for_delivery",
          recipient: phone,
          success: smsResult.success,
          error: smsResult.error,
        });
      }
      break;
    }

    case "components_received":
    case "in_assembly":
    case "inspection":
    case "delivered": {
      const emailResult = await email.sendStatusUpdate(ctx, status);
      await logNotification({
        order_id: order.id,
        customer_id: customer.id,
        channel: "email",
        event_type: status,
        recipient: customer.email,
        success: emailResult?.success ?? false,
        error: emailResult?.error,
      });
      break;
    }
  }
}
