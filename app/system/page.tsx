import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuditTimeline } from "@/components/system/audit-timeline";
import { BlockerChecklist } from "@/components/system/blocker-checklist";
import { EvidenceFlag } from "@/components/system/evidence-flag";
import { LockedField } from "@/components/system/locked-field";
import { DraftSpecimen } from "@/components/system/specimens";
import { StatusChip } from "@/components/system/status-chip";
import { claimBlockers, DOC, EVV, GUARD_COPY, ROLES, STATUS, type Status } from "@/lib/machine";
import { CONDITIONS, MATRIX, OBJECTS, type Action } from "@/lib/permissions";
import { RULES } from "@/lib/rules";
import { replay, STEPS } from "@/lib/scenario";

export const metadata: Metadata = { title: "System" };

const SECTIONS = [
  ["layers", "How it's layered"],
  ["machine", "State machine"],
  ["vocab", "Status vocabulary"],
  ["permissions", "Permissions"],
  ["rules", "State rules"],
  ["components", "Components"],
  ["tokens", "Tokens"],
  ["voice", "Voice"],
] as const;

export default function SystemPage() {
  const end = replay(STEPS.length);
  const mid = replay(STEPS.findIndex((s) => s.id === "outcome") + 1);
  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-10 sm:px-6">
      <p className="eyebrow">System</p>
      <h1 className="display mt-1 text-[44px] sm:text-[64px]">The system underneath</h1>
      <p className="mt-4 max-w-3xl text-[18px] leading-7">
        Rules come first, as data. Components only render what the rules allow. The three surfaces are compositions of those components. Change a rule and every view follows.
      </p>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-1.5">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line px-3 py-1.5 text-[14px] font-medium hover:bg-blue-soft">
            {label}
          </a>
        ))}
      </nav>

      <Section id="layers" title="How it's layered">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["1 · Rules", "machine.ts, permissions.ts, rules.ts", "States, transitions, guards, who can do what, and per-state config. Unit-tested. No UI."],
            ["2 · Components", "Six workflow components", "StatusChip, LockedField, AI draft card, Evidence flag, Audit timeline, Blocker checklist. Each reads the rules; none hard-codes them."],
            ["3 · Surfaces", "Caregiver mobile, clinician web, operations web", "Different density and mental models, same components and the same record underneath."],
          ].map(([t, sub, body], k) => (
            <li key={t} className={`rounded-[30px] p-7 ${["bg-blue", "bg-cream", "bg-yellow"][k]}`}>
              <p className="display text-[30px]">{t}</p>
              <p className="mt-1 text-[14px] font-medium">{sub}</p>
              <p className="mt-3 leading-6">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="machine" title="State machine" lead="Generated from lib/machine.ts. Anything not in these tables can't happen, and the tests check that.">
        <div className="grid gap-6 xl:grid-cols-2">
          {([
            ["EVV track", EVV],
            ["Documentation track", DOC],
          ] as const).map(([name, table]) => (
            <div key={name} className="overflow-x-auto rounded-[20px] border border-line" tabIndex={0} role="region" aria-label={`${name} transitions`}>
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <caption className="border-b border-line px-4 py-3 text-left font-semibold">{name}</caption>
                <thead className="bg-soft text-[13px]">
                  <tr>
                    {["From", "Event", "To", "Who", "Guard"].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.map((t) => (
                    <tr key={t.from + t.event} className="border-t border-line align-top">
                      <td className="px-3 py-2 font-mono text-[12px]">{t.from}</td>
                      <td className="px-3 py-2 font-mono text-[12px]">{t.event}</td>
                      <td className="px-3 py-2 font-mono text-[12px]">{t.to}</td>
                      <td className="px-3 py-2">{t.by.join(", ")}</td>
                      <td className="px-3 py-2 text-[13px] text-muted">{t.guards?.map((g) => GUARD_COPY[g]).join(" ") ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px] leading-6 text-muted">
          Nothing is ever deleted. Original EVV captures never change; a correction, cancellation or resubmission is a new event with its own reason, requester and approver, and the original stays readable. A signed note only takes dated addenda.
        </p>
      </Section>

      <Section id="vocab" title="Status vocabulary" lead="One canonical status, three audiences. Caregivers never see “exception”, “flagged” or “rejected”; operators get precise wording; engineering and exports use the code.">
        <div className="overflow-x-auto rounded-[20px] border border-line" tabIndex={0} role="region" aria-label="Status vocabulary table">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <caption className="sr-only">Status labels by audience</caption>
            <thead className="bg-soft text-[13px]">
              <tr>
                {["Rosa sees", "Dana sees", "Sam sees", "Code"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(STATUS) as Status[]).map((s) => (
                <tr key={s} className="border-t border-line">
                  <td className="px-3 py-2">{STATUS[s].caregiver ? <StatusChip status={s} audience="caregiver" /> : <span className="text-muted">Not shown</span>}</td>
                  <td className="px-3 py-2">{STATUS[s].clinician ? <StatusChip status={s} audience="clinician" /> : <span className="text-muted">Not shown</span>}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={s} audience="operator" />
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px]">{STATUS[s].code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="permissions" title="Permissions" lead="Role × record × action, from lib/permissions.ts. Minimum necessary: each role gets what its job needs. Compliance reads everything and changes nothing.">
        <div className="overflow-x-auto rounded-[20px] border border-line" tabIndex={0} role="region" aria-label="Permission matrix">
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <caption className="sr-only">Permission matrix</caption>
            <thead className="bg-soft text-[13px]">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Record
                </th>
                {ROLES.map((r) => (
                  <th key={r.id} scope="col" className="px-3 py-2 font-medium">
                    {r.name.replace(" (RN case manager, assumed)", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OBJECTS.map((o) => (
                <tr key={o.id} className="border-t border-line align-top">
                  <th scope="row" className="px-3 py-2.5 font-medium">
                    {o.name}
                  </th>
                  {ROLES.map((r) => {
                    const acts = MATRIX[o.id][r.id] ?? [];
                    return (
                      <td key={r.id} className="px-3 py-2.5">
                        {acts.length ? (
                          <ul className="flex flex-wrap gap-1">
                            {acts.map((a: Action) => (
                              <li key={a} className={`rounded-full px-2 py-0.5 text-[12px] ${a === "view" ? "bg-soft" : "bg-blue font-medium"}`}>
                                {a}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[13px] text-muted">No access</span>
                        )}
                        {acts.map((a) => CONDITIONS[`${o.id}:${r.id}:${a}`] && <p key={a} className="mt-1 text-[12px] leading-4 text-muted">{CONDITIONS[`${o.id}:${r.id}:${a}`]}</p>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[14px] leading-6 text-muted">
          Dual role: Rosa is both Mateo&apos;s caregiver and his legal guardian, so she can&apos;t be the one who verifies her own visit. Verification rests on EVV capture and clinician oversight instead.
        </p>
      </Section>

      <Section id="rules" title="State rules" lead="Illustrative values from lib/rules.ts. Real rules vary by state, program and plan and would come from compliance; the screens only read them.">
        <div className="grid gap-4 md:grid-cols-2">
          {Object.values(RULES).map((r) => (
            <div key={r.code} className="rounded-[20px] border border-line p-5">
              <p className="display text-[28px]">{r.name}</p>
              <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-[14px]">
                <dt className="text-muted">Late after</dt>
                <dd>{r.graceMinutes} min</dd>
                <dt className="text-muted">Window to request a fix</dt>
                <dd>{r.correctionWindowDays} days</dd>
                <dt className="text-muted">Live-in exemption available</dt>
                <dd>{r.liveInExempt ? "Yes, not applied" : "No"}</dd>
              </dl>
              <p className="mt-3 text-[13px] font-medium">Reason codes · what Rosa taps → what the state receives</p>
              <ul className="mt-1 space-y-1 text-[13px]">
                {r.reasonCodes.map((c) => (
                  <li key={c.code}>
                    “{c.caregiverLabel}” → <code className="font-mono">{c.code}</code> {c.label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] font-medium">Note must include</p>
              <ul className="mt-1 list-disc pl-5 text-[13px]">
                {r.requiredNoteFields.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="components" title="Components" lead="Six components the three surfaces are built from. Each one documents its states, accessibility and voice.">
        <div className="space-y-6">
          <Spec
            name="StatusChip"
            purpose="One canonical status rendered for one audience."
            states="Six tones (neutral, progress, info, attention, success, danger), always with a dot and text so colour is never the only signal. Optional code for operators."
            a11y="Text label, not colour alone; 13px minimum; tint pairs checked to 4.5:1 or better."
            voice="Caregiver labels say what's true for her (“Needs a quick fix”), never what she did wrong."
          >
            <div className="flex flex-wrap gap-2">
              <StatusChip status="needs_fix" audience="caregiver" />
              <StatusChip status="needs_fix" audience="clinician" />
              <StatusChip status="needs_fix" audience="operator" showCode />
            </div>
          </Spec>
          <Spec
            name="LockedField"
            purpose="A value a role can see but not change, with the reason and the next best action."
            states="Editable (no lock) · Locked with reason · Locked with alternate action (e.g. Ask for a fix)."
            a11y="The reason is tied to the value with aria-describedby, so screen readers hear why, not just “locked”."
            voice="Explain the rule as protection (“nobody edits them, including you”), then offer the way forward."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <LockedField role="caregiver" object="clock_times" label="Clock-out (Rosa)" value="Not recorded" />
              <LockedField role="clinician" object="correction" action="approve" label="EVV correction (Dana)" value="Clock-out 7:30 pm · PA-01" />
            </div>
          </Spec>
          <Spec
            name="AI draft card"
            purpose="The AI's draft, line by line, each traced to the caregiver's words or taps."
            states="Supported line · Unsupported line (blocks signing) · Edited by caregiver (shows the AI's original struck through) · Read-only signed."
            a11y="Sources are a labelled list; the blocking reason is text, not just a yellow fill; the sign button says why it's disabled."
            voice="“Refused” isn't what you said: name the mismatch plainly, offer her words back."
          >
            <DraftSpecimen />
          </Spec>
          <Spec
            name="Evidence flag"
            purpose="Why something reached a clinician: today against this child's own baseline, what's missing, and the source."
            states="Open (outcome needed) · Closed (outcome recorded). Only a clinician can close it."
            a11y="A real table with headers; “above usual” is announced, not just bolded."
            voice="Evidence, not scores. No percentages, no “risk”, no labels on the family."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <EvidenceFlag
                title="Seizures above his usual pattern"
                status="open"
                evidence={[
                  { label: "Seizures", today: "3", usual: "0 to 1", above: true },
                  { label: "Longest", today: "About 4 min", usual: "Under 1 min", above: true },
                ]}
                missing={["temperature"]}
                source="Rosa's voice note, 8:40 pm"
              />
              <EvidenceFlag title="Seizures above his usual pattern" status="closed" evidence={[{ label: "Seizures", today: "3", usual: "0 to 1", above: true }]} missing={[]} source="Rosa's voice note, 8:40 pm" />
            </div>
          </Spec>
          <Spec
            name="Audit timeline"
            purpose="The append-only record behind “Care You Can Prove”."
            states="Entry · Entry with before/after · AI-involved entry · Offline entry with device and sync time."
            a11y="An ordered list in time order; struck-through “before” values also say “Before:” in text."
            voice="Who, when, what changed, and why: in that order, every time."
          >
            <AuditTimeline entries={end.audit.filter((a) => a.before || a.ai || a.syncedAt).slice(0, 4)} />
          </Spec>
          <Spec
            name="Blocker checklist"
            purpose="“Why can't this be billed yet?”, computed from the same rules as everything else."
            states="Some unmet · All met (Ready to bill). Operations only."
            a11y="Met and not-met are spoken, not just icons."
            voice="State the condition, then the fact that settles it."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <BlockerChecklist blockers={claimBlockers(mid)} />
              <BlockerChecklist blockers={claimBlockers(end)} />
            </div>
          </Spec>
        </div>
      </Section>

      <Section id="tokens" title="Tokens" lead="Taken from abbycare.org's computed styles, then adapted where dense product UI needs more than a marketing page.">
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Navy", "#081D4C", "Text, dark buttons"],
              ["Pale blue", "#C2E4F2", "Light buttons, selected"],
              ["Cream", "#F9F8EF", "Panels"],
              ["Yellow", "#FFF4B3", "Attention"],
              ["Gold", "#F4BA00", "Focus ring, icons"],
              ["Divider", "#D9D9D9", "Rules only"],
            ].map(([n, hex, use]) => (
              <li key={n} className="rounded-[16px] border border-line p-3">
                <span className="block h-10 rounded-[10px] border border-line" style={{ background: hex }} aria-hidden="true" />
                <p className="mt-2 text-[14px] font-medium">{n}</p>
                <p className="font-mono text-[12px]">{hex}</p>
                <p className="text-[12px] text-muted">{use}</p>
              </li>
            ))}
          </ul>
          <div className="rounded-[20px] bg-cream p-5 text-[14px] leading-6">
            <p className="font-semibold">Adaptations, and why</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                Type stays the brand&apos;s: <span className="font-serif text-[16px]">STIX Two Text</span> for headings, Inter for everything a person reads or taps.
              </li>
              <li>The site&apos;s product success green #2F8F4E is 4.07:1 on white, so solid success uses #257A41 (5.33:1) and chips use #1F6B39 on #E3F2E8 (5.63:1).</li>
              <li>#D9D9D9 is fine for dividers but 1.41:1 for a control edge. Inputs and controls use #8A93A3 (3.1:1).</li>
              <li>30px cards stay for the overview; product panels use 20px and dense rows 12px so lists don&apos;t look like marketing tiles.</li>
              <li>Focus is a 3px gold ring, from the logo&apos;s heart. Visible on navy, white and cream.</li>
              <li>The site&apos;s 1.05× button hover is kept, and switched off for reduced motion.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="voice" title="Voice" lead="Families First, written down as rules a team can check copy against.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[20px] border border-line p-5 text-[14px] leading-6">
            <p className="font-semibold">Rules</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Say what happens next, every time.</li>
              <li>No blame. Problems are things we fix together.</li>
              <li>About grade 6 on the caregiver side; Spanish one tap away.</li>
              <li>Warm with caregivers, calm and precise with clinicians.</li>
              <li>Explain EVV as protecting her pay, never as checking on her.</li>
            </ul>
            <p className="mt-4 font-semibold">Never on the caregiver side</p>
            <p className="mt-1 text-muted">exception · violation · flagged · non-compliant · rejected · suspicious · aide ID · worker</p>
          </div>
          <ul className="space-y-3 text-[14px] leading-6">
            {[
              ["EVV exception: missing clock-out. Resolve within 72 hours.", "Your hours aren't lost. Tell us when you finished and why."],
              ["Note flagged for clinical review.", "Because of the seizures, Dana will review your note tonight."],
              ["Correction pending approval.", "Fix sent. Someone at Abby will review it, usually within a day."],
            ].map(([before, after]) => (
              <li key={before} className="rounded-[20px] bg-cream p-4">
                <p>
                  <span className="text-muted">Before: </span>
                  <del>{before}</del>
                </p>
                <p className="mt-1">
                  <span className="font-semibold">After: </span>
                  {after}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </div>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-16 scroll-mt-24 border-t border-line pt-10">
      <h2 id={`${id}-h`} className="display text-[36px] sm:text-[46px]">
        {title}
      </h2>
      {lead && <p className="mt-3 max-w-3xl text-[16px] leading-6 text-muted">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Spec({ name, purpose, states, a11y, voice, children }: { name: string; purpose: string; states: string; a11y: string; voice: string; children: ReactNode }) {
  return (
    <article className="grid gap-5 rounded-[30px] border border-line p-5 sm:p-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div>
        <h3 className="display text-[30px]">{name}</h3>
        <p className="mt-2 leading-6">{purpose}</p>
        <dl className="mt-4 space-y-3 text-[14px] leading-5">
          <div>
            <dt className="font-semibold">States</dt>
            <dd className="text-muted">{states}</dd>
          </div>
          <div>
            <dt className="font-semibold">Accessibility</dt>
            <dd className="text-muted">{a11y}</dd>
          </div>
          <div>
            <dt className="font-semibold">Voice</dt>
            <dd className="text-muted">{voice}</dd>
          </div>
        </dl>
      </div>
      <div className="min-w-0 rounded-[20px] bg-soft/60 p-4">{children}</div>
    </article>
  );
}
