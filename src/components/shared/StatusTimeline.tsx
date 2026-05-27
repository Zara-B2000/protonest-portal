import { cn, formatDateTime } from "@/utils";
import { ORDER_STATUS_STEPS, type OrderStatus, type StatusHistory } from "@/types";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface StatusTimelineProps {
  currentStatus: OrderStatus;
  history?: StatusHistory[];
}

export function StatusTimeline({ currentStatus, history = [] }: StatusTimelineProps) {
  const currentIndex = ORDER_STATUS_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="w-full overflow-x-auto">
      {/* ── Desktop horizontal timeline ─────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between min-w-[700px]">
          {/* Connecting line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-brand-500 z-0 transition-all duration-500"
            style={{
              width: currentIndex === 0
                ? "0%"
                : `${(currentIndex / (ORDER_STATUS_STEPS.length - 1)) * 100}%`,
            }}
          />

          {ORDER_STATUS_STEPS.map((step, index) => {
            const isDone    = index < currentIndex;
            const isCurrent = index === currentIndex;
            const historyEntry = history.find((h) => h.new_status === step.status);

            return (
              <div key={step.status} className="relative z-10 flex flex-col items-center w-24">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                    isDone    && "bg-brand-500 border-brand-500 text-white",
                    isCurrent && "bg-white border-brand-500 text-brand-500 ring-4 ring-brand-100",
                    !isDone && !isCurrent && "bg-white border-slate-300 text-slate-300"
                  )}
                >
                  {isDone    ? <CheckCircle className="w-5 h-5" /> : null}
                  {isCurrent ? <Clock className="w-4 h-4" /> : null}
                  {!isDone && !isCurrent ? <Circle className="w-4 h-4" /> : null}
                </div>
                <p className={cn(
                  "mt-2 text-xs font-medium text-center leading-tight",
                  (isDone || isCurrent) ? "text-slate-800" : "text-slate-400"
                )}>
                  {step.label}
                </p>
                {historyEntry && (
                  <p className="mt-0.5 text-[10px] text-slate-400 text-center">
                    {formatDateTime(historyEntry.changed_at)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile vertical timeline ─────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {ORDER_STATUS_STEPS.map((step, index) => {
          const isDone    = index < currentIndex;
          const isCurrent = index === currentIndex;
          const historyEntry = history.find((h) => h.new_status === step.status);

          return (
            <div key={step.status} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    isDone    && "bg-brand-500 border-brand-500 text-white",
                    isCurrent && "bg-white border-brand-500 text-brand-500",
                    !isDone && !isCurrent && "bg-white border-slate-200 text-slate-200"
                  )}
                >
                  {isDone    ? <CheckCircle className="w-4 h-4" /> : null}
                  {isCurrent ? <Clock className="w-3.5 h-3.5" /> : null}
                  {!isDone && !isCurrent ? <Circle className="w-3.5 h-3.5" /> : null}
                </div>
                {index < ORDER_STATUS_STEPS.length - 1 && (
                  <div className={cn("w-0.5 h-6 mt-1", isDone ? "bg-brand-500" : "bg-slate-200")} />
                )}
              </div>
              <div className="pt-1">
                <p className={cn(
                  "text-sm font-medium",
                  (isDone || isCurrent) ? "text-slate-900" : "text-slate-400"
                )}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-brand-500 font-medium">In Progress</p>
                )}
                {historyEntry && (
                  <p className="text-xs text-slate-400">
                    {formatDateTime(historyEntry.changed_at)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
