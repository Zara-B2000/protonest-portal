import { cn } from "@/utils";
import { ORDER_STATUS_STEPS, type OrderStatus } from "@/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const step = ORDER_STATUS_STEPS.find((s) => s.status === status);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        `status-${status}`
      )}
    >
      {step?.label ?? status}
    </span>
  );
}
