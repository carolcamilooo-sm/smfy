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
            stroke="oklch(0.65 0.02 280)"
            fontSize={12}
            fontFamily="var(--font-ibm-plex-mono)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            stroke="oklch(0.65 0.02 280)"
            fontSize={12}
            fontFamily="var(--font-ibm-plex-mono)"
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "oklch(0.97 0.01 293 / 0.05)" }}
            contentStyle={{
              background: "oklch(0.18 0.015 280)",
              border: "1px solid oklch(0.24 0.02 280)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-ibm-plex-mono)",
            }}
            labelStyle={{ color: "oklch(0.65 0.02 280)" }}
          />
          <Bar dataKey="count" fill="oklch(0.72 0.25 300)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
