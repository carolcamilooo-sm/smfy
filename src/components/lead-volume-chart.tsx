"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function LeadVolumeChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="label"
            stroke="var(--color-text-secondary)"
            fontSize={12}
            fontFamily="var(--font-ibm-plex-mono)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            stroke="var(--color-text-secondary)"
            fontSize={12}
            fontFamily="var(--font-ibm-plex-mono)"
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            // Realce fraco atrás da barra sob o cursor — o alpha é o efeito,
            // sem ele o retângulo cobriria a barra.
            cursor={{ fill: "color-mix(in oklch, var(--color-text-primary) 5%, transparent)" }}
            contentStyle={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-ibm-plex-mono)",
            }}
            labelStyle={{ color: "var(--color-text-secondary)" }}
          />
          <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
