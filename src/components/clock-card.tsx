"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
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
  year: "numeric",
});

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ClockCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-xs text-secondary">{capitalize(dateFormatter.format(now))}</p>
        <p className="mt-1 font-mono text-3xl font-semibold text-primary">
          {timeFormatter.format(now)}
        </p>
      </div>
      <p className="text-xs text-secondary">Horário de Brasília</p>
    </Card>
  );
}
