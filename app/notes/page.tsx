import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Notes" };

const DECISIONS: [string, string, string][] = [
  ["Two tracks, not one pipeline", "EVV (did it happen) and documentation (what care was given) run separately and meet at “Care verified”.", "A single linear pipeline where a missing clock-out blocks the note, or a note in review blocks payroll."],
  ["The caregiver signs her own note", "Rosa attests the note in her words; the clinician reviews by exception.", "A nurse co-signing every routine note: slow, and not how aide documentation usually works. Marked as an assumption to check."],
  ["Escalation runs before any AI", "The seizure plan check is rules, not a model, and it can say “call 911” with the AI switched off.", "Letting the AI decide whether something is urgent."],
  ["Evidence, not scores", "Dana sees today against Mateo's own baseline, and what's missing.", "Confidence percentages and risk scores, which invite either blind trust or alert fatigue, and label families."],
  ["One status, three labels", "Same state, different words: “Needs a quick fix” for Rosa, “Exception: missing clock-out” for Sam, a code for exports.", "One shared label, which is either too blunt for families or too vague for operations."],
  ["Pay never waits on a claim", "Rosa sees whether her hours count for payroll. Only operations sees claim readiness.", "Showing caregivers billing status, which ties a W-2 paycheck to insurance."],
  ["Locks explain themselves", "Every control a role can't use says why and who can, with a next step.", "Hidden or greyed-out controls with no reason."],
  ["Rules as data", "A state switch re-renders reason codes, windows and required fields from config.", "Designing per state, which doesn't survive eight states and more coming."],
];

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 pt-10 sm:px-6">
      <p className="eyebrow">Notes</p>
      <h1 className="display mt-1 text-[44px] sm:text-[64px]">Assumptions and decisions</h1>
      <p className="mt-4 max-w-2xl text-[18px] leading-7">What I&apos;d check first, what I decided and why, and where this concept stops.</p>

      <Section title="What I'd validate in weeks 1–2">
        <ul className="grid gap-3 md:grid-cols-2">
          {[
            ["Clinical", "Do clinicians review by exception today, or note by note? Which programs need an RN co-sign?"],
            ["Clinical", "Where do seizure action plans and baselines live, and who keeps them current?"],
            ["Operations", "How do EVV corrections flow per state and plan, and which aggregators are in play?"],
            ["Compliance", "Live-in exemptions and guardian-as-caregiver verification, program by program."],
            ["Caregivers", "How much is voice and Spanish used in AbbyAid today, and where do people get stuck?"],
            ["Product", "Which AI flags exist now, and what happens to the ones nobody acts on?"],
          ].map(([who, q]) => (
            <li key={q} className="rounded-[20px] bg-cream p-5">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{who}</p>
              <p className="mt-1 leading-6">{q}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Decision log">
        <ol className="space-y-3">
          {DECISIONS.map(([t, d, lost], i) => (
            <li key={t} className="grid gap-3 rounded-[20px] border border-line p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
              <div>
                <p className="font-mono text-[12px] text-muted">D{i + 1}</p>
                <p className="mt-0.5 font-semibold">{t}</p>
                <p className="mt-1 leading-6">{d}</p>
              </div>
              <div className="rounded-[14px] bg-soft p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Set aside</p>
                <p className="mt-1 text-[14px] leading-5">{lost}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Guardrails I held to">
        <ul className="list-disc space-y-1.5 pl-5 leading-6">
          <li>The AI never diagnoses, never closes a flag, never adds a task the caregiver didn&apos;t log, and never touches clock times, billing or the plan of care.</li>
          <li>EVV captures the six facts the 21st Century Cures Act requires: type of service, member, caregiver, date, location, and start and end time. Location is captured at clock-in and clock-out, never tracked.</li>
          <li>Original EVV records never change. Corrections are stored beside them with a reason code, requester and approver. Nothing has a delete button.</li>
          <li>While a member is in the hospital, visits are cancelled with a reason, and restarting needs a clinician&apos;s reassessment.</li>
          <li>No real people, IDs or payer logos. Abby&apos;s own published figures aren&apos;t used as demo output.</li>
        </ul>
      </Section>

      <Section title="Edge cases">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[20px] border border-line p-5">
            <p className="font-semibold">Built</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-6">
              <li>Phone died before clock-out; voice note saved offline and synced</li>
              <li>Change in condition against baseline, with the escalation ladder</li>
              <li>Hospital stay putting visits on hold, across all three views</li>
              <li>Care away from home (therapy appointment), with a one-tap reason</li>
              <li>Caregiver who is also the legal guardian</li>
              <li>An AI line she didn&apos;t say blocks signing</li>
              <li>Pennsylvania vs Florida rules from one config</li>
            </ul>
          </div>
          <div className="rounded-[20px] border border-line p-5">
            <p className="font-semibold">Designed for, not built</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-6">
              <li>Late vs missed vs cancelled visits</li>
              <li>Siblings with overlapping visits by the same caregiver</li>
              <li>Authorized units running out mid-period</li>
              <li>Caregiver certification lapsing</li>
              <li>Aggregator rejection and resubmission</li>
              <li>Supervisory visit or recertification coming due</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="My first 90 days">
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            ["30", "Shadow a caregiver, a nurse and operations for a day each. Map the real visit lifecycle and its states with them."],
            ["60", "Ship the status vocabulary and LockedField into AbbyAid and the clinician dashboard. Measure how many corrections caregivers can finish alone."],
            ["90", "A first version of the documented system: states, permissions and voice rules the whole team designs and builds from."],
          ].map(([d, t]) => (
            <li key={d} className="rounded-[20px] bg-blue p-5">
              <p className="display text-[34px]">Day {d}</p>
              <p className="mt-1 leading-6">{t}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="How I used AI">
        <ul className="list-disc space-y-1.5 pl-5 leading-6">
          <li>Research agents read Abby Care&apos;s site, the role, the app listing and public interviews in parallel.</li>
          <li>Fonts, colours, buttons and card shapes were measured from abbycare.org&apos;s computed styles.</li>
          <li>
            A six-seat review panel (CEO, Head of Product, an RN case manager, a family caregiver, a Medicaid compliance lead and a skeptic) critiqued the plan. It caught a nurse co-signing every note,
            fraud-first framing, and pay tied to claims. All three were fixed.
          </li>
          <li>Built in code with Claude Code. The workflow, the decisions and the voice are mine.</li>
        </ul>
      </Section>

      <Section title="What's real and what's illustrative">
        <ul className="list-disc space-y-1.5 pl-5 leading-6">
          <li>Real: the state machine, guards, permissions and audit trail are working code with unit tests.</li>
          <li>Real: abbycare.org&apos;s type, colours, buttons, card shapes and logo.</li>
          <li>Illustrative: Rosa, Mateo, Dana and Sam; the visit; state rules, reason codes and seizure thresholds; the AI draft, which is scripted here.</li>
          <li>Assumed: the clinician role is an RN case manager, and how notes are signed off varies by program.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section aria-labelledby={id} className="mt-14 border-t border-line pt-8">
      <h2 id={id} className="display mb-5 text-[34px] sm:text-[42px]">
        {title}
      </h2>
      {children}
    </section>
  );
}
