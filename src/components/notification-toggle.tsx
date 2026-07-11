"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { updateNotificationPreference } from "@/lib/account-actions";

export function NotificationToggle({
  field,
  label,
  initialValue,
}: {
  field: "notifySound" | "notifyIdleWarning";
  label: string;
  initialValue: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !value;
    setValue(next);
    const formData = new FormData();
    formData.set("field", field);
    formData.set("value", String(next));
    startTransition(() => {
      updateNotificationPreference(formData);
    });
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-secondary">{label}</span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "relative h-[18px] w-[34px] shrink-0 rounded-full transition-colors disabled:opacity-60",
          value ? "bg-success" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all",
            value ? "right-0.5" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
