"use client";

import { useEffect, useState } from "react";
import { BR_TIMEZONE } from "@/lib/date-br";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BR_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BR_TIMEZONE,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function SidebarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="font-mono text-xl font-semibold text-primary">{timeFormatter.format(now)}</p>
      <p className="mt-0.5 text-xs text-secondary">{capitalize(dateFormatter.format(now))}</p>
    </div>
  );
}
