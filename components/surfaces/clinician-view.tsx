"use client";

import { useState } from "react";
import { careVerified } from "@/lib/machine";
import { NEXT_ACTIONS, SCRIPTED_OUTCOME, type NextAction, type Outcome, type World } from "@/lib/scenario";
import { AiDraftCard } from "../system/ai-draft-card";
import { EvidenceFlag } from "../system/evidence-flag";
import { LockedField } from "../system/locked-field";
import { StatusChip } from "../system/status-chip";
import { btn } from "../ui";

const label = (id: NextAction) => NEXT_ACTIONS.find((a) => a.id === id)!.label;

/**
 * Dana's view. Review by exception: changes against a child's own pattern,
 * missed medicines or feeds, and unsigned notes reach the queue, each with
 * why and how soon. Routine signed notes go to the chart and weekly summary.
 */
export function ClinicianView({ world, last, canAdvance, onOutcome }: { world: World; last: string; canAdvance: boolean; onOutcome: (o: Outcome) => void }) {
  const routed = world.doc === "routed";
  const reviewed = !!world.flag && !world.flag.open;
  const signed = !!world.attestedAt;

  const queue = [
    ...(world.inpatient
      ? [{ who: "Mateo R., 9", why: "In hospital since Thu 6:30 am · resumption of care: home visit, discharge medicines and orders, update seizure plan", when: "Within 48 hours of discharge (illustrative)", me: true }]
      : []),
    ...(routed ? [{ who: "Mateo R., 9", why: "Seizures above his usual pattern; one missed feed", when: "Review tonight", me: true }] : []),
    { who: "Leo M., 6", why: "Caregiver photo: possible redness at G-tube site", when: "Within 24 hours", me: false },
    { who: "Ana P., 14", why: "Supervisory visit due", when: "In 3 days", me: false },
  ];

  return (
    <div className="@container rounded-[20px] border border-line bg-white" role="region" aria-label="Clinician web view, Dana">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <p className="font-semibold">Dana Reyes, RN case manager · on call tonight</p>
          <p className="text-[13px] text-muted">Your panel · 18 families · review by exception</p>
        </div>
        <p className="text-[13px] text-muted">{reviewed ? "1 reviewed tonight" : routed ? "1 new tonight" : "Nothing new for Mateo"}</p>
      </div>

      {world.inpatient && (
        <p className="border-b border-gold bg-yellow px-5 py-2.5 text-[14px]">
          <span className="font-semibold">Mateo was admitted Thursday 6:30 am.</span> Visits are on hold; they restart after your home visit.
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
                <p className="mt-1 text-[12px] font-medium text-muted">{q.when}</p>
              </li>
            ))}
          </ul>
          {reviewed && world.flag?.outcome && (
            <p className="mt-3 rounded-[12px] bg-ok-bg px-3 py-2 text-[13px] text-ok-ink">Mateo R.: outcome recorded 9:12 pm · {label(world.flag.outcome.next).toLowerCase()}</p>
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
              <p className="mt-1 text-[13px] text-muted">From his seizure plan: 0 to 1 seizures a day, under a minute. Feeds 8:00 am and 2:00 pm.</p>
              <ol className="mt-3 grid gap-1.5 text-[14px] @4xl:grid-cols-2">
                <Day t="8:02 am" e="Visit started at home" show={last !== "start"} />
                <Day t="8:05–8:20" e="Morning meds · 8:00 feed" show={world.tasksLogged} />
                <Day t="2:00 pm" e="Feed skipped: asleep" show={world.tasksLogged} strong />
                <Day t="3:14 pm" e="Seizure logged by tap: 3rd today, about 4 min" show={!!world.triage} strong />
                <Day t="3:16 pm" e="Rosa called you on the on-call line" show={!!world.calledNurseAt} />
                <Day t="5:15 pm" e="Therapy appointment" show={!!world.therapy} />
                <Day t="8:40 pm" e="Voice note for tonight's visit note" show={!!world.voiceNote} />
              </ol>
            </div>
          )}

          {signed && world.flag && (
            <EvidenceFlag
              title="Seizures above his usual pattern"
              status={world.flag.open ? "open" : "closed"}
              usualLabel="His usual (from his seizure plan)"
              evidence={[
                { label: "Seizures", today: "3", usual: "0 to 1", above: true },
                { label: "Longest", today: "About 4 min", usual: "Under 1 min", above: true },
                { label: "Feeds", today: "1 of 2 (2:00 skipped, asleep)", usual: "2 of 2", above: true },
                { label: "Back to usual self", today: "Yes, tired", usual: "Yes", above: false },
              ]}
              missing={["temperature", "whether rescue medicine was given before 3:14 pm", "what the first two seizures looked like"]}
              source="Rosa's seizure log at 3:14 pm and her signed note"
            />
          )}

          {routed && <OutcomeForm suggested={world.flag?.suggested ?? "home_visit"} canAdvance={canAdvance} onSubmit={onOutcome} />}

          {reviewed && world.flag?.outcome && (
            <div className="rounded-[16px] border border-line p-4 text-[14px]">
              <p className="font-semibold">Outcome, {world.flag.at}</p>
              <p className="mt-1 leading-6">{world.flag.outcome.note}</p>
              <p className="mt-2 text-[13px] leading-5 text-muted">
                Next step: {label(world.flag.outcome.next)}.{" "}
                {world.flag.outcome.next !== world.flag.suggested ? (
                  <>
                    Changed from the suggested <del>{label(world.flag.suggested).toLowerCase()}</del>: {world.flag.outcome.reason}
                  </>
                ) : (
                  "Kept the suggested next step."
                )}{" "}
                {world.flag.outcome.practitionerNotified ? "Ordering practitioner notified." : `Practitioner not notified: ${world.flag.outcome.notNotifiedBecause}`}
              </p>
            </div>
          )}

          {signed && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Rosa&apos;s signed note · {world.attestedAt}</p>
                <span className="rounded-full bg-blue-soft px-2 py-0.5 text-[12px]">From a Spanish voice note · English is an AI translation</span>
              </div>
              <AiDraftCard lines={world.draft} readOnly />
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

          {!signed && !world.inpatient && (
            <p className="text-[14px] leading-6 text-muted">
              Routine notes don&apos;t interrupt you; they&apos;re in his chart and your weekly summary. Changes against his usual pattern, missed medicines or feeds, and unsigned notes come here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function OutcomeForm({ suggested, canAdvance, onSubmit }: { suggested: NextAction; canAdvance: boolean; onSubmit: (o: Outcome) => void }) {
  const [next, setNext] = useState<NextAction>(suggested);
  const [reason, setReason] = useState("");
  const [notified, setNotified] = useState(false);
  const [notWhy, setNotWhy] = useState("");
  const [note, setNote] = useState("");
  const changed = next !== suggested;

  return (
    <form
      className="rounded-[16px] border border-navy p-4"
      aria-labelledby="outcome-h"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ next, reason: changed ? reason : undefined, practitionerNotified: notified, notNotifiedBecause: notified ? undefined : notWhy, note: note || SCRIPTED_OUTCOME.note });
      }}
    >
      <h3 id="outcome-h" className="font-semibold">
        Record the outcome
      </h3>
      <p className="text-[13px] text-muted">Routing suggested: {label(suggested).toLowerCase()}. Only a clinician closes this; the AI can&apos;t.</p>
      <fieldset className="mt-3">
        <legend className="text-[14px] font-medium">Next step</legend>
        {NEXT_ACTIONS.map((a) => (
          <label key={a.id} className="mt-1.5 flex items-start gap-2 text-[14px]">
            <input type="radio" name="next" checked={next === a.id} onChange={() => setNext(a.id)} className="mt-1 h-4 w-4 accent-navy" />
            <span>
              {a.label}
              {a.id === suggested && <span className="text-muted"> (suggested)</span>}
            </span>
          </label>
        ))}
      </fieldset>
      {changed && (
        <>
          <label className="mt-3 block text-[14px] font-medium" htmlFor="why-changed">
            Why you changed it <span className="font-normal text-muted">(required)</span>
          </label>
          <textarea id="why-changed" required value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-[12px] border border-control p-2.5 text-[14px]" rows={2} />
        </>
      )}
      <label className="mt-3 flex items-center gap-2 text-[14px] font-medium">
        <input type="checkbox" checked={notified} onChange={(e) => setNotified(e.target.checked)} className="h-4 w-4 accent-navy" />
        Ordering practitioner notified
      </label>
      {!notified && (
        <>
          <label className="mt-2 block text-[14px] font-medium" htmlFor="not-why">
            Not notified because <span className="font-normal text-muted">(required)</span>
          </label>
          <input id="not-why" required value={notWhy} onChange={(e) => setNotWhy(e.target.value)} className="mt-1 w-full rounded-[12px] border border-control p-2.5 text-[14px]" />
        </>
      )}
      <label className="mt-3 block text-[14px] font-medium" htmlFor="did">
        What you did
      </label>
      <textarea id="did" value={note} onChange={(e) => setNote(e.target.value)} placeholder={SCRIPTED_OUTCOME.note} className="mt-1 w-full rounded-[12px] border border-control p-2.5 text-[14px]" rows={3} />
      {canAdvance && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className={btn("navy")}>
            Record outcome
          </button>
          <button
            type="button"
            className={btn("outline")}
            onClick={() => {
              setNext(SCRIPTED_OUTCOME.next);
              setReason(SCRIPTED_OUTCOME.reason ?? "");
              setNotified(true);
              setNote(SCRIPTED_OUTCOME.note);
            }}
          >
            Fill in Dana&apos;s answers
          </button>
        </div>
      )}
    </form>
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
