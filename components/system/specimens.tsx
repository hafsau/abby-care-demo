"use client";

import { useState } from "react";
import { initialDraft } from "@/lib/draft";
import { AiDraftCard } from "./ai-draft-card";

/** Live AI draft card: fix the unsupported line and the sign button unlocks. */
export function DraftSpecimen() {
  const [lines, setLines] = useState(initialDraft);
  const open = lines.some((l) => l.unsupported && !l.editedByCaregiver);
  return (
    <div>
      <AiDraftCard
        lines={lines}
        original={{ l3: "Mateo refused his 2:00 pm G-tube feed." }}
        onFix={(id) => setLines((ls) => ls.map((l) => (l.id === id && l.unsupported ? { ...l, text: l.unsupported.suggestion, sources: ["u3", "t3"], editedByCaregiver: true } : l)))}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={open} className="lift inline-flex h-[38px] items-center rounded-full bg-navy px-4 text-[14px] font-medium text-white disabled:opacity-45">
          Sign my note
        </button>
        <button type="button" className="text-[14px] underline underline-offset-4" onClick={() => setLines(initialDraft())}>
          Reset
        </button>
        <span className="text-[13px] text-muted">{open ? "Locked until the yellow line is fixed" : "Ready to sign"}</span>
      </div>
    </div>
  );
}
