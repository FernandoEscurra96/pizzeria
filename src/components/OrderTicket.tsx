"use client";

import { useState } from "react";
import { ticketText } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrderTicket({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);
  const text = ticketText(order);

  return (
    <article className="rounded-2xl bg-white p-4 shadow">
      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{text}</pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="mt-3 rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
      >
        {copied ? "¡Copiado!" : "Copiar ticket"}
      </button>
    </article>
  );
}
