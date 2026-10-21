"use client";

import { careVerified } from "@/lib/machine";
import type { World } from "@/lib/scenario";
import { AiDraftCard } from "../system/ai-draft-card";
import { EvidenceFlag } from "../system/evidence-flag";
import { LockedField } from "../system/locked-field";
import { StatusChip } from "../system/status-chip";
import { btn } from "../ui";

/**
 * Dana's view. Review by exception: only items that need a clinician reach
 * the queue, each says why it's there and how soon. Dense, calm, keyboard
 * friendly. Routine signed notes never land here.
 */
export function ClinicianView({ world, last, canAdvance, onAdvance }: { world: World; last: string; canAdvance: boolean; onAdvance: () => void }) {
  const routed = world.doc === "routed";
  const reviewed = !!world.flag && !world.flag.open;
  const signed = !!world.attestedAt;

  const queue = [
    ...(world.inpatient ? [{ who: "Mateo R., 9", why: "Discharge expected: resumption-of-care visit needed before visits restart", when: "When discharged", tone: "attention" as const, me: true }] : []),
    ...(routed ? [{ who: "Mateo R., 9", why: "Seizures above his usual pattern, reported by Rosa", when: "Review tonight", tone: "attention" as const, me: true }] : []),
    { who: "Leo M., 6", why: "Caregiver photo: possible redness at G-tube site", when: "Within 24 hours", tone: "attention" as const, me: false },
    { who: "Ana P., 14", why: "Supervisory visit due", when: "In 3 days", tone: "neutral" as const, me: false },
  ];

  return (
    <div className="@container rounded-[20px] border border-line bg-white" role="region" aria-label="Clinician web view, Dana">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <p className="font-semibold">Dana Reyes, RN case manager</p>
          <p className="text-[13px] text-muted">Your panel · 18 families · review by exception</p>
        </div>
        <p className="text-[13px] text-muted">{reviewed ? "1 reviewed tonight" : routed ? "1 new tonight" : "Nothing new for Mateo"}</p>
      </div>

      {world.inpatient && (
        <p className="border-b border-gold bg-yellow px-5 py-2.5 text-[14px]">
          <span className="font-semibold">Mateo was admitted Thursday 6:30 am.</span> Visits are on hold; resuming needs your reassessment at home.
        </p>
      )}

      <div className="grid gap-0 @3xl:grid-cols-[260px_minmax(0,1fr)]">
        <section aria-labelledby="queue-h" className="border-b border-line p-4 @3xl:border-b-0 @3xl:border-r">
          <h2 id="queue-h" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Needs your review ({queue.length})
          </h2>
          <ul className="mt-2 space-y-2">
            {queue.map((q) => (
              <li key={q.who + q.why} className={`rounded-[12px] border p-3 ${q.me ? "border-navy bg-blue-soft" : "border-line"}`}>
                <p className="text-[14px] font-semibold">{q.who}</p>
                <p className="text-[13px] leading-5">{q.why}</p>
                <p className={`mt-1 text-[12px] font-medium ${q.tone === "attention" ? "text-navy" : "text-muted"}`}>{q.when}</p>
              </li>
            ))}
          </ul>
          {reviewed && (
            <p className="mt-3 rounded-[12px] bg-ok-bg px-3 py-2 text-[13px] text-ok-ink">Mateo R.: outcome recorded 9:12 pm · follow-up call tomorrow 10 am</p>
          )}
          <p className="mt-3 text-[12px] leading-4 text-muted">Other names are synthetic placeholders.</p>
        </section>

        <section aria-labelledby="mateo-h" className="min-w-0 space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="mateo-h" className="display text-[28px]">
                Mateo R., 9
              </h2>
              <p className="text-[13px] text-muted">Seizure disorder · G-tube · caregiver: Rosa (mother, legal guardian)</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusChip status={world.inpatient ? "on_hold" : careVerified(world) ? "care_verified" : world.evv} audience="clinician" />
              {!world.inpatient && <StatusChip status={world.doc} audience="clinician" />}
            </div>
          </div>

          {!world.inpatient && (
            <div className="rounded-[16px] bg-cream p-4">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Today against his usual</p>
              <p className="mt-1 text-[13px] text-muted">Usual day: 0 to 1 seizures, under a minute. Feeds 8:00 and 2:00.</p>
              <ol className="mt-3 grid gap-1.5 text-[14px] @4xl:grid-cols-2">
                <Day t="8:02 am" e="Visit started at home" show={last !== "start"} />
                <Day t="8:05–8:20" e="Morning meds · 8:00 feed" show={world.tasksLogged} />
                <Day t="2:00 pm" e="Feed skipped: asleep" show={world.tasksLogged} strong />
                <Day t="~3:10 pm" e="Longest seizure, about 4 min" show={!!world.triage} strong />
                <Day t="3:40 pm" e="Therapy appointment (away from home)" show={!!world.community} />
                <Day t="8:41 pm" e="Rosa called the on-call nurse" show={!!world.calledNurse} />
              </ol>
            </div>
          )}

          {signed && world.flag && (
            <EvidenceFlag
              title="Seizures above his usual pattern"
              status={world.flag.open ? "open" : "closed"}
              evidence={[
                { label: "Seizures", today: "3", usual: "0 to 1", above: true },
                { label: "Longest", today: "About 4 min", usual: "Under 1 min", above: true },
                { label: "Back to usual self", today: "Yes, tired", usual: "Yes", above: false },
              ]}
              missing={["temperature", "exact times of the first two seizures"]}
              source="Rosa's voice note, 8:40 pm, and her signed note"
            />
          )}

          {routed && (
            <form
              className="rounded-[16px] border border-navy p-4"
              onSubmit={(e) => {
                e.preventDefault();
                onAdvance();
              }}
              aria-labelledby="outcome-h"
            >
              <h3 id="outcome-h" className="font-semibold">
                Record the outcome
              </h3>
              <p className="text-[13px] text-muted">Only a clinician closes this. The AI can&apos;t, and routing only suggests urgency.</p>
              <fieldset className="mt-3">
                <legend className="text-[14px] font-medium">Urgency</legend>
                {[
                  ["Same-day review", "Suggested by routing"],
                  ["Routine follow-up", "Call tomorrow"],
                  ["Contact the ordering physician", "Possible change to orders"],
                ].map(([v, h]) => (
                  <label key={v} className="mt-1.5 flex items-start gap-2 text-[14px]">
                    <input type="radio" name="urgency" defaultChecked={v === "Routine follow-up"} className="mt-1 h-4 w-4 accent-navy" />
                    <span>
                      {v} <span className="text-muted">· {h}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <label className="mt-3 block text-[14px] font-medium" htmlFor="override">
                Why you changed the suggested urgency <span className="font-normal text-muted">(required)</span>
              </label>
              <textarea id="override" required defaultValue="Back to baseline, no fever per caregiver; within his action plan." className="mt-1 w-full rounded-[12px] border border-control p-2.5 text-[14px]" rows={2} />
              <label className="mt-3 block text-[14px] font-medium" htmlFor="did">
                What you did
              </label>
              <textarea id="did" defaultValue="Spoke with Rosa. No change to the plan of care. Follow-up call tomorrow at 10 am." className="mt-1 w-full rounded-[12px] border border-control p-2.5 text-[14px]" rows={2} />
              {canAdvance && (
                <button type="submit" className={`${btn("navy")} mt-3`}>
                  Record outcome
                </button>
              )}
            </form>
          )}

          {reviewed && world.flag && (
            <div className="rounded-[16px] border border-line p-4 text-[14px]">
              <p className="font-semibold">Outcome, 9:12 pm</p>
              <p className="mt-1">{world.flag.outcome}</p>
              <p className="mt-2 text-[13px] text-muted">
                Changed suggested urgency from <del>{world.flag.suggested}</del> to routine follow-up: {world.flag.override}
              </p>
            </div>
          )}

          {signed && (
            <div>
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Rosa&apos;s signed note · {world.attestedAt}</p>
              <AiDraftCard lines={world.draft} readOnly original={{ l3: "Mateo refused his 2:00 pm G-tube feed." }} />
            </div>
          )}

          {!world.inpatient && (
            <LockedField
              role="clinician"
              object="clock_times"
              label="Visit times"
              value={`8:02 am – ${world.clockOut ?? (world.evv === "correction_requested" ? "no clock-out (fix with operations)" : world.evv === "needs_fix" ? "no clock-out" : last === "start" ? "not started" : "in progress")}`}
            />
          )}

          {!signed && !world.inpatient && <p className="text-[14px] text-muted">Nothing needs you for Mateo yet. Routine notes don&apos;t come to you; only changes against his usual pattern do.</p>}
        </section>
      </div>
    </div>
  );
}

function Day({ t, e, show, strong }: { t: string; e: string; show: boolean; strong?: boolean }) {
  if (!show) return null;
  return (
    <li className="flex gap-2">
      <span className="w-[78px] flex-none font-mono text-[12px] leading-5 text-muted">{t}</span>
      <span className="min-w-0 flex-1">
      <span className={strong ? "font-semibold" : ""}>{e}</span>
      </span>
    </li>
  );
}
