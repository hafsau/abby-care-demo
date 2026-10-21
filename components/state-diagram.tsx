"use client";

import Link from "next/link";
import { useState } from "react";
import { DIAGRAM, DOC, EVV, STATUS, type Actor, type Status } from "@/lib/machine";
import { replay, STEPS } from "@/lib/scenario";
import { StatusChip, type Audience } from "./system/status-chip";
import { Icon } from "./ui";

const EVENT: Record<string, string> = {
  clock_in: "Clock in",
  clock_out: "Clock out",
  auto_confirm: "Confirm the visit",
  miss_clock_out: "Notice there's no clock-out",
  request_correction: "Ask for a fix",
  approve_correction: "Approve the fix (never their own)",
  send_to_aggregator: "Send to the state aggregator",
  aggregator_accept: "Accept",
  aggregator_reject: "Reject",
  cancel_inpatient: "Cancel: member in hospital",
  draft_ready: "Draft the note from her words",
  attest: "Sign the note",
  route_to_clinician: "Route to the clinician",
  record_outcome: "Record the outcome",
  close: "Close",
  addendum: "Add a dated addendum",
};

const LANES: { role: Audience; who: string }[] = [
  { role: "caregiver", who: "Rosa · caregiver" },
  { role: "clinician", who: "Dana · clinician" },
  { role: "operator", who: "Sam · operations" },
];

/** First step at which the scenario reaches each state, for "see it in the visit" links. */
const FIRST_SEEN: Partial<Record<Status, number>> = (() => {
  const seen: Partial<Record<Status, number>> = {};
  for (let i = 0; i <= STEPS.length; i++) {
    const w = replay(i);
    seen[w.evv] ??= i;
    seen[w.doc] ??= i;
  }
  return seen;
})();

function actionsFor(status: Status, actor: Actor) {
  return [...EVV, ...DOC].filter((t) => t.from === status && t.by.includes(actor)).map((t) => EVENT[t.event]);
}

export function StateDiagram() {
  const [sel, setSel] = useState<Status>("needs_fix");
  const v = STATUS[sel];
  const seen = FIRST_SEEN[sel];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {DIAGRAM.map((d) => (
          <div key={d.track}>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{d.track === "evv" ? "Track 1 · EVV: did the visit happen?" : "Track 2 · Documentation: what care was given?"}</p>
            <ol className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={d.track === "evv" ? "EVV states" : "Documentation states"}>
              {d.states.map((s, k) => (
                <li key={s} className="flex items-center gap-1.5">
                  <Node s={s} sel={sel} onSel={setSel} />
                  {k < d.states.length - 1 && <Icon name="arrow" className="h-4 w-4 text-control" />}
                </li>
              ))}
            </ol>
            {d.branch && (
              <ol className="mt-2 flex flex-wrap items-center gap-1.5 border-l-2 border-gold pl-3" aria-label={d.track === "evv" ? "EVV fix branch" : "Clinician review branch"}>
                <li className="text-[13px] text-muted">{d.track === "evv" ? "If something's missing:" : "If it needs a clinician:"}</li>
                {d.branch.map((s, k) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <Node s={s} sel={sel} onSel={setSel} />
                    {k < d.branch!.length - 1 && <Icon name="arrow" className="h-4 w-4 text-control" />}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Where the tracks meet</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Node s="care_verified" sel={sel} onSel={setSel} />
            <Icon name="arrow" className="h-4 w-4 text-control" />
            <Node s="claim_ready" sel={sel} onSel={setSel} />
            <span className="text-[13px] text-muted">(operations only)</span>
          </div>
          <p className="mt-2 max-w-xl text-[13px] leading-5 text-muted">
            The tracks never block each other. A missing clock-out doesn&apos;t hold up the note, and a note under review doesn&apos;t hold up payroll.
          </p>
        </div>
      </div>

      <section aria-live="polite" aria-label={`What each role sees at ${v.operator}`} className="rounded-[30px] bg-cream p-5 sm:p-7">
        <p className="text-[13px] text-muted">
          Selected state · <code className="font-mono">{v.code}</code>
        </p>
        <p className="display mt-1 text-[32px]">{v.clinician || v.operator}</p>
        <ul className="mt-4 space-y-3">
          {LANES.map((l) => {
            const acts = actionsFor(sel, l.role);
            const hidden = !v[l.role];
            return (
              <li key={l.role} className="rounded-[16px] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{l.who}</p>
                  {hidden ? <span className="text-[13px] text-muted">Not shown to this role</span> : <StatusChip status={sel} audience={l.role} />}
                </div>
                <p className="mt-1.5 text-[14px] leading-5 text-muted">
                  {hidden
                    ? "Billing readiness is operations-only. Rosa sees whether her hours count for payroll, never claim status."
                    : acts.length
                      ? `Can do now: ${acts.join(" · ")}`
                      : "Nothing to do here; this role is kept informed."}
                </p>
              </li>
            );
          })}
        </ul>
        {seen !== undefined && (
          <Link href={seen ? `/visit?step=${seen}` : "/visit"} className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium underline underline-offset-4">
            See this moment in the visit <Icon name="arrow" className="h-4 w-4" />
          </Link>
        )}
      </section>
    </div>
  );
}

function Node({ s, sel, onSel }: { s: Status; sel: Status; onSel: (s: Status) => void }) {
  const on = s === sel;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onSel(s)}
      className={`rounded-full border px-3 py-1.5 text-[13px] font-medium ${on ? "border-navy bg-navy text-white" : "border-control bg-white text-navy hover:bg-blue-soft"}`}
    >
      {STATUS[s].operator}
    </button>
  );
}
