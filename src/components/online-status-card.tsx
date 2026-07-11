"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const IDLE_LIMIT_SECONDS = 10 * 60;
const IDLE_WARNING_AT_SECONDS = 60;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function OnlineStatusCard({
  initialStatus,
  notifyIdleWarning,
}: {
  initialStatus: "ONLINE" | "OFFLINE";
  notifyIdleWarning: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [secondsIdle, setSecondsIdle] = useState(0);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  async function updateStatus(next: "ONLINE" | "OFFLINE") {
    setStatus(next);
    setSecondsIdle(0);
    try {
      await fetch("/api/operators/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } finally {
      router.refresh();
    }
  }

  function toggleStatus() {
    updateStatus(status === "ONLINE" ? "OFFLINE" : "ONLINE");
  }

  // Reset the idle clock on any user activity while online.
  useEffect(() => {
    const resetIdle = () => {
      if (statusRef.current === "ONLINE") setSecondsIdle(0);
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdle));
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdle));
    };
  }, []);

  // Idle countdown -> auto-offline after 10 minutes of inactivity.
  useEffect(() => {
    if (status !== "ONLINE") return;
    const id = setInterval(() => {
      setSecondsIdle((s) => {
        const next = s + 1;
        if (next >= IDLE_LIMIT_SECONDS) {
          updateStatus("OFFLINE");
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Heartbeat while online, so the server knows this operator is still active.
  useEffect(() => {
    if (status !== "ONLINE") return;
    const id = setInterval(() => {
      fetch("/api/operators/heartbeat", { method: "POST" }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  const remaining = IDLE_LIMIT_SECONDS - secondsIdle;
  const showIdleWarning =
    notifyIdleWarning && status === "ONLINE" && remaining <= IDLE_WARNING_AT_SECONDS;
  const mm = Math.floor(Math.max(remaining, 0) / 60);
  const ss = Math.max(remaining, 0) % 60;
  const online = status === "ONLINE";

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface p-3.5">
      <div className="mb-2.5 text-xs text-muted">Meu status</div>
      <button
        type="button"
        onClick={toggleStatus}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border px-3 py-2.5",
          online ? "border-success/40 bg-success/10" : "border-border bg-muted/10"
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            online ? "text-success" : "text-muted"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              online ? "animate-pulse bg-success" : "bg-muted"
            )}
          />
          {online ? "Online" : "Offline (inativo)"}
        </span>
        <span
          className={cn(
            "relative h-[18px] w-[34px] rounded-full",
            online ? "bg-success" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all",
              online ? "right-0.5" : "left-0.5"
            )}
          />
        </span>
      </button>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        Você só recebe novos leads enquanto estiver online. Fica inativo
        automaticamente após 10 min sem uso.
      </p>
      {showIdleWarning && (
        <p className="mt-2 text-[11px] leading-relaxed text-warning">
          Ficará inativo em {mm}:{String(ss).padStart(2, "0")} por inatividade.
        </p>
      )}
    </div>
  );
}
