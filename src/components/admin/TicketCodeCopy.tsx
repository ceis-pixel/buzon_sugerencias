"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export interface TicketCodeCopyProps {
  code: string | null;
  className?: string;
}

/** Ticket code that copies itself to the clipboard on click. */
export function TicketCodeCopy({ code, className = "" }: TicketCodeCopyProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!code) {
    return <span className={`font-mono text-xs font-bold text-neutral-gray ${className}`}>S/C</span>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the code stays visible to copy by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar código"
      aria-label={copied ? `Código ${code} copiado` : `Copiar código ${code}`}
      className={`group inline-flex items-center gap-1.5 rounded-md font-mono text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      <span>{code}</span>
      {copied ? (
        <Check aria-hidden="true" className="size-3.5 text-emerald-700" />
      ) : (
        <Copy
          aria-hidden="true"
          className="size-3.5 text-neutral-gray/60 transition-colors group-hover:text-primary"
        />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copiado" : ""}
      </span>
    </button>
  );
}
