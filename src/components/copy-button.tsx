"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  className,
  title,
  onCopied,
  label = "Copiar",
  copiedLabel = "Copiado",
}: {
  value: string;
  className?: string;
  title?: string;
  /** Chamado depois que o valor foi pro clipboard. */
  onCopied?: () => void;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopied?.();
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-secondary hover:border-accent/50",
        className
      )}
    >
      {copied ? (
        <>
          <Check size={14} className="text-success" /> {copiedLabel}
        </>
      ) : (
        <>
          <Copy size={14} /> {label}
        </>
      )}
    </button>
  );
}
