/*
 * One visit, as an ordered list of events. Each step applies real
 * transitions from machine.ts, so the scenario can't do anything the rules
 * forbid. Replaying from the start is deterministic, which is how "back"
 * works and how the tests check the whole story.
 */
import { append, type AuditLog } from "./audit";
import { initialDraft, fixLine, unsupportedCount, type DraftLine } from "./draft";
import { ROSA_REPORT, triage, type Triage } from "./escalation";
import { DOC, EVV, step, type Actor, type DocState, type EvvState } from "./machine";
import { RULES, reasonFor, type StateCode } from "./rules";

export type Surface = "caregiver" | "clinician" | "operator";

export type World = {
  state: StateCode;
  evv: EvvState;
  doc: DocState;
  clockIn?: string;
  clockOut?: string;
  correction?: { requestedBy: Actor; reason: string; code: string; from: string; to: string; approvedBy?: Actor };
  community?: { reason: string; code: string; at: string };
  tasksLogged: boolean;
  triage?: Triage;
  calledNurse?: boolean;
  draft: DraftLine[];
  attestedAt?: string;
  flag?: { open: boolean; suggested: string; outcome?: string; override?: string; at?: string };
  audit: AuditLog;
  authMatched: boolean;
  unitsRemaining: number;
  inpatient: boolean;
  offlineSaved?: boolean;
};

export type Step = {
  id: string;
  time: string;
  actor: Actor;
  title: string;
  narration: string;
  focus: Surface;
  /** Steps a viewer can do by hand on the surface, instead of pressing Next. */
  interactive?: "fix_line" | "attest" | "outcome" | "approve";
  apply: (w: World) => World;
};

export function startWorld(state: StateCode = "PA"): World {
  return {
    state,
    evv: "scheduled",
    doc: "logging",
    tasksLogged: false,
    draft: [],
    audit: append([], { at: "Tue 07:00", actor: "system", name: "Scheduling", action: "Visit scheduled", detail: "Home health aide, 8:00 am – 8:00 pm, at home", code: "EVV_SCHEDULED" }),
    authMatched: true,
    unitsRemaining: 42,
    inpatient: false,
  };
}

const log = (w: World, e: Parameters<typeof append>[1]): World => ({ ...w, audit: append(w.audit, e) });

export const STEPS: Step[] = [
  {
    id: "clock-in",
    time: "8:02 am",
    actor: "caregiver",
    title: "Rosa clocks in",
    narration: "One tap at home. The app records the six EVV facts: service, member, caregiver, date, location and start time.",
    focus: "caregiver",
    apply: (w) =>
      log({ ...w, evv: step(EVV, w.evv, "clock_in", "caregiver", { inpatient: w.inpatient }), clockIn: "8:02 am" }, {
        at: "Tue 08:02",
        actor: "caregiver",
        name: "Rosa",
        action: "Clocked in",
        detail: "Location captured at the member's home",
        code: "EVV_IN_PROGRESS",
      }),
  },
  {
    id: "tasks",
    time: "8:05 am – 4:45 pm",
    actor: "caregiver",
    title: "Tasks, by tap",
    narration: "Meds and feeds are a tap each. The 2:00 feed didn't happen; she taps “Not done” and picks why: he was asleep. No one has to type.",
    focus: "caregiver",
    apply: (w) =>
      log({ ...w, tasksLogged: true }, { at: "Tue 08:05–16:45", actor: "caregiver", name: "Rosa", action: "Logged 4 care-plan tasks", detail: "3 done · 2:00 feed not done (asleep)" }),
  },
  {
    id: "community",
    time: "3:40 pm",
    actor: "caregiver",
    title: "Therapy appointment, away from home",
    narration: "Care continues at Mateo's therapy appointment. One tap explains why the visit's location is somewhere else, mapped to the state's reason code.",
    focus: "caregiver",
    apply: (w) => {
      const r = reasonFor(w.state, "Care happened away from home")!;
      return log({ ...w, community: { reason: r.caregiverLabel, code: r.code, at: "3:40 pm" } }, {
        at: "Tue 15:40",
        actor: "caregiver",
        name: "Rosa",
        action: "Noted care away from home",
        detail: "Therapy appointment",
        code: r.code,
      });
    },
  },
  {
    id: "phone-died",
    time: "8:10 pm",
    actor: "system",
    title: "Her phone died before clock-out",
    narration: "The visit ended at 7:30, but the phone was dead. When it comes back on, the app says her hours aren't lost and offers a one-tap fix. No “exception” wording on her side.",
    focus: "caregiver",
    apply: (w) =>
      log({ ...w, evv: step(EVV, w.evv, "miss_clock_out", "system") }, {
        at: "Tue 20:10",
        actor: "system",
        name: "EVV",
        action: "No clock-out recorded",
        code: "EVV_EXC_MISSING_OUT",
      }),
  },
  {
    id: "request-fix",
    time: "8:12 pm",
    actor: "caregiver",
    title: "Rosa asks for a fix",
    narration: "She can't edit her own clock times; nobody can. She proposes 7:30 pm and picks a reason in her own words. The app maps it to the state's code.",
    focus: "caregiver",
    apply: (w) => {
      const r = reasonFor(w.state, "My phone died or had no signal")!;
      return log(
        {
          ...w,
          evv: step(EVV, w.evv, "request_correction", "caregiver", { reasonCode: r.code }),
          correction: { requestedBy: "caregiver", reason: r.caregiverLabel, code: r.code, from: "No clock-out", to: "7:30 pm" },
        },
        { at: "Tue 20:12", actor: "caregiver", name: "Rosa", action: "Requested an EVV correction", before: "No clock-out", after: "7:30 pm", code: r.code },
      );
    },
  },
  {
    id: "voice",
    time: "8:40 pm",
    actor: "caregiver",
    title: "A voice note, in Spanish, one-handed",
    narration: "She talks instead of typing. Before any AI runs, the app checks what she said against Mateo's seizure action plan: 3 seizures, the longest about 4 minutes. That's above his usual, below the 911 line, so it offers a call to the on-call nurse first.",
    focus: "caregiver",
    apply: (w) =>
      log({ ...w, triage: triage(ROSA_REPORT), calledNurse: true, offlineSaved: true }, {
        at: "Tue 20:40",
        syncedAt: "Tue 20:46",
        actor: "caregiver",
        name: "Rosa",
        action: "Recorded a voice note; called the on-call nurse",
        detail: "Action-plan check: above usual, below emergency",
      }),
  },
  {
    id: "draft",
    time: "8:42 pm",
    actor: "system",
    title: "The AI drafts her note",
    narration: "Every line links to what she said or tapped. One line says Mateo “refused” his feed; she never said that. It's marked, and she can't sign until it's fixed.",
    focus: "caregiver",
    apply: (w) =>
      log({ ...w, doc: step(DOC, w.doc, "draft_ready", "system"), draft: initialDraft() }, {
        at: "Tue 20:42",
        actor: "system",
        name: "AI assistant",
        action: "Drafted the visit note",
        detail: "4 lines from 4 voice clips and 4 taps · 1 line not supported",
        ai: "drafted",
      }),
  },
  {
    id: "attest",
    time: "8:45 pm",
    actor: "caregiver",
    title: "Rosa fixes one line and signs",
    narration: "She changes “refused” to “skipped, he was asleep”, then signs the note as her record. The change from the AI's wording is kept. Because of the seizures, it goes to Dana.",
    focus: "caregiver",
    interactive: "attest",
    apply: (w) => {
      let next = unsupportedCount(w.draft) ? caregiverFixesLine(w, "l3") : w;
      next = { ...next, doc: step(DOC, next.doc, "attest", "caregiver", { unsupportedLines: unsupportedCount(next.draft) }), attestedAt: "8:45 pm" };
      next = log(next, { at: "Tue 20:45", actor: "caregiver", name: "Rosa", action: "Signed the visit note", detail: "Locked. Later changes become dated addenda.", code: "DOC_ATTESTED" });
      next = {
        ...next,
        doc: step(DOC, next.doc, "route_to_clinician", "system"),
        flag: { open: true, suggested: "Same-day review" },
      };
      return log(next, { at: "Tue 20:45", actor: "system", name: "Routing", action: "Sent to Dana for review", detail: "Seizures above Mateo's usual pattern", code: "DOC_ROUTED" });
    },
  },
  {
    id: "outcome",
    time: "9:12 pm",
    actor: "clinician",
    title: "Dana reviews and calls",
    narration: "Dana sees evidence, not a score: 3 seizures against his usual 0 to 1, the longest about 4 minutes against under 1, and no temperature recorded. She calls Rosa and records the outcome, lowering the suggested urgency with a reason. Rosa sees that someone acted.",
    focus: "clinician",
    interactive: "outcome",
    apply: (w) => {
      let next: World = {
        ...w,
        doc: step(DOC, w.doc, "record_outcome", "clinician"),
        flag: {
          open: false,
          suggested: w.flag?.suggested ?? "Same-day review",
          outcome: "Spoke with Rosa. Within his action plan; no change to the plan of care. Follow-up call tomorrow at 10 am.",
          override: "Routine follow-up instead of same-day review: back to baseline, no fever per caregiver.",
          at: "9:12 pm",
        },
      };
      next = log(next, {
        at: "Tue 21:12",
        actor: "clinician",
        name: "Dana, RN",
        action: "Recorded outcome",
        detail: "Within action plan · follow-up call tomorrow 10 am",
        before: "Suggested: same-day review",
        after: "Routine follow-up",
        code: "DOC_OUTCOME",
      });
      next = { ...next, doc: step(DOC, next.doc, "close", "system") };
      return log(next, { at: "Tue 21:12", actor: "system", name: "Documentation", action: "Note closed", code: "DOC_COMPLETE" });
    },
  },
  {
    id: "approve",
    time: "Wed 9:05 am",
    actor: "operator",
    title: "Sam approves the time fix",
    narration: "Operations reviews Rosa's correction: the original record stays, the fix sits beside it with her reason and his approval. Sam can't approve his own requests, and Dana can't approve time fixes at all.",
    focus: "operator",
    interactive: "approve",
    apply: (w) => {
      let next: World = {
        ...w,
        evv: step(EVV, w.evv, "approve_correction", "operator", { requestedBy: w.correction?.requestedBy, approvedBy: "operator", reasonCode: w.correction?.code }),
        correction: w.correction && { ...w.correction, approvedBy: "operator" },
        clockOut: "7:30 pm (corrected)",
      };
      next = log(next, { at: "Wed 09:05", actor: "operator", name: "Sam", action: "Approved EVV correction", before: "No clock-out", after: "7:30 pm", code: w.correction?.code });
      next = { ...next, evv: step(EVV, next.evv, "send_to_aggregator", "system") };
      return log(next, { at: "Wed 09:06", actor: "system", name: "EVV", action: `Sent to ${RULES[w.state].aggregator.split(" (")[0].toLowerCase()}`, code: "EVV_SUBMITTED" });
    },
  },
  {
    id: "accepted",
    time: "Wed 9:20 am",
    actor: "system",
    title: "Care verified",
    narration: "The aggregator accepts the visit. Rosa and Dana see the same thing: care verified, with the full proof behind it. Only operations sees that it's also ready to bill.",
    focus: "operator",
    apply: (w) =>
      log({ ...w, evv: step(EVV, w.evv, "aggregator_accept", "system") }, { at: "Wed 09:20", actor: "system", name: "EVV", action: "Accepted by aggregator", code: "EVV_ACCEPTED" }),
  },
];

/** Rosa replaces an unsupported AI line with what she said. Logged with before and after. */
export function caregiverFixesLine(w: World, id: string): World {
  const line = w.draft.find((l) => l.id === id);
  if (!line?.unsupported || line.editedByCaregiver) return w;
  const draft = fixLine(w.draft, id);
  return log({ ...w, draft }, { at: "Tue 20:44", actor: "caregiver", name: "Rosa", action: "Edited an AI line", before: line.text, after: draft.find((l) => l.id === id)!.text });
}

/** The world after the first n steps, replayed from scratch. */
export function replay(n: number, state: StateCode = "PA"): World {
  return STEPS.slice(0, n).reduce((w, s) => s.apply(w), startWorld(state));
}

/* ---------- Edge case: Mateo is in the hospital ---------- */

export function inpatientWorld(state: StateCode = "PA"): World {
  let w: World = { ...startWorld(state), inpatient: true };
  w = log(w, { at: "Thu 06:30", actor: "operator", name: "Sam", action: "Recorded hospital admission", detail: "Reported by Rosa; visits on hold" });
  w = { ...w, evv: step(EVV, w.evv, "cancel_inpatient", "operator", { reasonCode: "INPATIENT" }) };
  return log(w, { at: "Thu 06:31", actor: "system", name: "Scheduling", action: "Visit cancelled: member inpatient", code: "EVV_CANCELLED_INPATIENT" });
}
