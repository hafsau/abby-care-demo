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

/** People in the story. Guards compare people, not roles. */
export const PEOPLE = { rosa: "u-rosa", dana: "u-dana", sam: "u-sam" } as const;

export type NextAction = "home_visit" | "phone_followup" | "er_now";

export const NEXT_ACTIONS: { id: NextAction; label: string }[] = [
  { id: "home_visit", label: "Nurse home visit within 24 hours" },
  { id: "phone_followup", label: "Phone follow-up tomorrow" },
  { id: "er_now", label: "Same-night ER evaluation" },
];

export type Outcome = { next: NextAction; reason?: string; practitionerNotified: boolean; notNotifiedBecause?: string; note: string };

export const SCRIPTED_OUTCOME: Outcome = {
  next: "phone_followup",
  reason: "Back to his usual on tonight's call, no fever, neurology notified, supervisory visit already due Friday.",
  practitionerNotified: true,
  note: "Spoke with Rosa on the on-call line at 3:16 pm and again tonight. Handled per his seizure action plan. Temp 98.4°F, taken by Rosa during tonight's call. Neurology on-call notified; no new orders. Discussed the missed 2 pm feed; make-up feed per plan tonight. Follow-up call tomorrow at 10 am.",
};

export type World = {
  state: StateCode;
  evv: EvvState;
  doc: DocState;
  day: "tue" | "wed" | "thu";
  clockIn?: string;
  clockOut?: string;
  correction?: { requestedById: string; reason: string; code: string; from: string; to: string; approvedById?: string };
  therapy?: boolean;
  tasksLogged: boolean;
  triage?: Triage;
  calledNurseAt?: string;
  voiceNote?: boolean;
  draft: DraftLine[];
  attestedAt?: string;
  flag?: { open: boolean; suggested: NextAction; outcome?: Outcome; at?: string };
  audit: AuditLog;
  authMatched: boolean;
  unitsRemaining: number;
  visitUnits: number;
  inpatient: boolean;
};

export type Step = {
  id: string;
  time: string;
  actor: Actor;
  title: string;
  narration: string;
  focus: Surface;
  apply: (w: World) => World;
};

export function startWorld(state: StateCode = "PA"): World {
  return {
    state,
    evv: "scheduled",
    doc: "logging",
    day: "tue",
    tasksLogged: false,
    draft: [],
    audit: append([], { at: "Tue 07:00", actor: "system", name: "Scheduling", action: "Visit scheduled", detail: "Home health aide, 8:00 am – 8:00 pm, at home", code: "EVV_SCHEDULED" }),
    authMatched: true,
    unitsRemaining: 88,
    // 8:02 am to 7:30 pm is 11 h 28 min, or 46 fifteen-minute units.
    visitUnits: 46,
    inpatient: false,
  };
}

const log = (w: World, e: Parameters<typeof append>[1]): World => ({ ...w, audit: append(w.audit, e) });

/** Dana records what she did. The choice and reasons are hers; nothing is preselected for her. */
export function recordOutcome(w: World, o: Outcome = SCRIPTED_OUTCOME): World {
  const suggested = w.flag?.suggested ?? "home_visit";
  const changed = o.next !== suggested;
  if (changed && !o.reason) throw new Error("A reason is required when the next step differs from the suggestion.");
  if (!o.practitionerNotified && !o.notNotifiedBecause) throw new Error("Say why the ordering practitioner wasn't notified.");
  const label = (id: NextAction) => NEXT_ACTIONS.find((a) => a.id === id)!.label;
  let next: World = { ...w, doc: step(DOC, w.doc, "record_outcome", "clinician"), flag: { open: false, suggested, outcome: o, at: "9:12 pm" } };
  next = log(next, {
    at: "Tue 21:12",
    actor: "clinician",
    name: "Dana, RN",
    action: changed ? "Recorded outcome; changed the suggested next step" : "Recorded outcome; kept the suggested next step",
    detail: `${o.practitionerNotified ? "Ordering practitioner notified" : `Practitioner not notified: ${o.notNotifiedBecause}`}`,
    before: changed ? `Suggested: ${label(suggested)}` : undefined,
    after: label(o.next) + (changed ? ` · ${o.reason}` : ""),
    code: "DOC_OUTCOME",
    clinical: true,
  });
  next = { ...next, doc: step(DOC, next.doc, "close", "system") };
  return log(next, { at: "Tue 21:12", actor: "system", name: "Documentation", action: "Note closed", code: "DOC_COMPLETE" });
}

/** Rosa replaces an unsupported AI line with what she said. Logged with before and after. */
export function caregiverFixesLine(w: World, id: string): World {
  const line = w.draft.find((l) => l.id === id);
  if (!line?.unsupported || line.editedByCaregiver) return w;
  const draft = fixLine(w.draft, id);
  return log({ ...w, draft }, { at: "Tue 20:44", actor: "caregiver", name: "Rosa", action: "Edited an AI line", before: line.text, after: draft.find((l) => l.id === id)!.text, clinical: true });
}

export const STEPS: Step[] = [
  {
    id: "clock-in",
    time: "8:02 am",
    actor: "caregiver",
    title: "Rosa clocks in",
    narration: "One tap at home. The app records the EVV facts it has so far: service, member, caregiver, date, location and start time. The end time comes at clock-out.",
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
    time: "8:05 am – 2:10 pm",
    actor: "caregiver",
    title: "Tasks, by tap",
    narration: "Meds and feeds are a tap each. The 2:00 feed didn't happen: she taps “Not done” and picks why. He was asleep.",
    focus: "caregiver",
    apply: (w) => log({ ...w, tasksLogged: true }, { at: "Tue 08:05–14:10", actor: "caregiver", name: "Rosa", action: "Logged care-plan tasks", detail: "Morning meds and 8:00 feed done · 2:00 feed not done (asleep)", clinical: true }),
  },
  {
    id: "seizure",
    time: "3:14 pm",
    actor: "caregiver",
    title: "A seizure, logged by tap",
    narration: "Four taps: how long, breathing OK, rescue medicine or not, back to himself. The app checks Mateo's seizure plan right there, on the phone, with no AI. Third today, about 4 minutes: above his usual, under the 911 line. It puts the on-call nurse one tap away.",
    focus: "caregiver",
    apply: (w) => {
      const t = triage(ROSA_REPORT);
      let next = log({ ...w, triage: t }, { at: "Tue 15:14", actor: "caregiver", name: "Rosa", action: "Logged a seizure", detail: "3rd today · about 4 min · breathing OK · no rescue medicine · back to himself", clinical: true });
      next = log(next, { at: "Tue 15:14", actor: "system", name: "Seizure plan check", action: "Plan check: call the on-call nurse", detail: "Rules on the phone, no AI · above usual, under emergency threshold", clinical: true });
      return log({ ...next, calledNurseAt: "3:16 pm" }, { at: "Tue 15:16", actor: "caregiver", name: "Rosa", action: "Called the on-call nurse (Dana)", clinical: true });
    },
  },
  {
    id: "therapy",
    time: "5:15 pm",
    actor: "caregiver",
    title: "Therapy, away from home",
    narration: "Care carries on at Mateo's therapy appointment. Nothing is checked mid-visit: location is captured only at clock-in and clock-out. If she clocked out there, the app would ask why and map it to the state's code.",
    focus: "caregiver",
    apply: (w) => log({ ...w, therapy: true }, { at: "Tue 17:15", actor: "caregiver", name: "Rosa", action: "Noted: therapy appointment", detail: "No location reading; a note fact only" }),
  },
  {
    id: "phone-died",
    time: "8:10 pm",
    actor: "system",
    title: "Her phone died before clock-out",
    narration: "The visit ended around 7:30, but the phone was dead. When it comes back on, the app tells her the hours aren't lost and offers a fix. Nowhere on her side does it say “exception”.",
    focus: "caregiver",
    apply: (w) => log({ ...w, evv: step(EVV, w.evv, "miss_clock_out", "system") }, { at: "Tue 20:10", actor: "system", name: "EVV", action: "No clock-out recorded", code: "EVV_EXC_MISSING_OUT" }),
  },
  {
    id: "request-fix",
    time: "8:12 pm",
    actor: "caregiver",
    title: "Rosa asks for a fix",
    narration: "Nobody can edit clock times, Rosa included. She proposes 7:30 pm and picks a reason in her own words; the app maps it to the state's code.",
    focus: "caregiver",
    apply: (w) => {
      const r = reasonFor(w.state, "My phone died or had no signal")!;
      return log(
        {
          ...w,
          evv: step(EVV, w.evv, "request_correction", "caregiver", { reasonCode: r.code }),
          correction: { requestedById: PEOPLE.rosa, reason: r.caregiverLabel, code: r.code, from: "No clock-out", to: "7:30 pm" },
        },
        { at: "Tue 20:12", actor: "caregiver", name: "Rosa", action: "Requested an EVV correction", before: "No clock-out", after: "7:30 pm", code: r.code },
      );
    },
  },
  {
    id: "voice",
    time: "8:40 pm",
    actor: "caregiver",
    title: "Tonight's note, by voice, in Spanish",
    narration: "She talks instead of typing. The seizure check already ran at 3:14 on her taps; this recording only becomes her draft. No signal, so it's saved on the phone and synced a minute later.",
    focus: "caregiver",
    apply: (w) =>
      log({ ...w, voiceNote: true }, { at: "Tue 20:40", syncedAt: "Tue 20:41", actor: "caregiver", name: "Rosa", action: "Recorded a voice note (Spanish)", detail: "Saved on the phone offline", clinical: true }),
  },
  {
    id: "draft",
    time: "8:42 pm",
    actor: "system",
    title: "The AI drafts her note",
    narration: "Every line links to what she said or tapped, in Spanish and in English. One line says Mateo “refused” his feed. She never said that. It's marked, and she can't sign until it's fixed.",
    focus: "caregiver",
    apply: (w) =>
      log({ ...w, doc: step(DOC, w.doc, "draft_ready", "system"), draft: initialDraft() }, {
        at: "Tue 20:42",
        actor: "system",
        name: "AI assistant",
        action: "Drafted the note in Spanish and English",
        detail: "4 lines from 4 voice clips and 5 taps · 1 line not supported",
        ai: "drafted",
        clinical: true,
      }),
  },
  {
    id: "attest",
    time: "8:45 pm",
    actor: "caregiver",
    title: "Rosa fixes one line and signs",
    narration: "She changes “refused” to what she said, then signs. Her signed version is the record; the English is a labelled AI translation for Dana. Because of the seizures, the note goes to Dana.",
    focus: "caregiver",
    apply: (w) => {
      let next = unsupportedCount(w.draft) ? caregiverFixesLine(w, "l3") : w;
      next = { ...next, doc: step(DOC, next.doc, "attest", "caregiver", { unsupportedLines: unsupportedCount(next.draft) }), attestedAt: "8:45 pm" };
      next = log(next, { at: "Tue 20:45", actor: "caregiver", name: "Rosa", action: "Signed the visit note", detail: "Locked. Later changes become dated addenda.", code: "DOC_ATTESTED" });
      next = log(next, { at: "Tue 20:45", actor: "system", name: "AI assistant", action: "Translated the signed note for clinical review", detail: "Spanish original kept as the signed record", ai: "translated", clinical: true });
      next = { ...next, doc: step(DOC, next.doc, "route_to_clinician", "system"), flag: { open: true, suggested: "home_visit" } };
      return log(next, { at: "Tue 20:45", actor: "system", name: "Routing", action: "Sent to Dana for review", detail: "Seizures above his usual · suggested: nurse home visit within 24 hours", code: "DOC_ROUTED", clinical: true });
    },
  },
  {
    id: "outcome",
    time: "9:12 pm",
    actor: "clinician",
    title: "Dana reviews and decides",
    narration: "Dana sees evidence, not a score: three seizures against his usual 0 to 1, the longest about 4 minutes, a missed feed, and what wasn't recorded. She calls, then picks the next step herself and says why if it differs from the suggestion.",
    focus: "clinician",
    apply: (w) => recordOutcome(w),
  },
  {
    id: "approve",
    time: "Wed 9:05 am",
    actor: "operator",
    title: "Sam approves the time fix",
    narration: "Rosa says she finished at 7:30, but her phone had died. Sam checks the last app activity against the request. The original record stays; the fix sits beside it with her reason and his approval.",
    focus: "operator",
    apply: (w) => {
      let next: World = {
        ...w,
        day: "wed",
        evv: step(EVV, w.evv, "approve_correction", "operator", { requestedById: w.correction?.requestedById, approvedById: PEOPLE.sam, reasonCode: w.correction?.code }),
        correction: w.correction && { ...w.correction, approvedById: PEOPLE.sam },
        clockOut: "7:30 pm (corrected)",
      };
      next = log(next, {
        at: "Wed 09:05",
        actor: "operator",
        name: "Sam",
        action: "Approved EVV correction",
        detail: "Checked: last app activity 7:18 pm at home; requested end 12 min later",
        before: "No clock-out",
        after: "7:30 pm",
        code: w.correction?.code,
      });
      next = { ...next, evv: step(EVV, next.evv, "send_to_aggregator", "system") };
      return log(next, { at: "Wed 09:06", actor: "system", name: "EVV", action: `Sent to the ${RULES[w.state].aggregator.split(" (")[0]}`, code: "EVV_SUBMITTED" });
    },
  },
  {
    id: "accepted",
    time: "Wed 9:20 am",
    actor: "system",
    title: "The aggregator accepts: ready to bill",
    narration: "Rosa and Dana saw “Care verified” as soon as the fix was approved and the note was closed. The aggregator's acceptance changes only what operations sees: every claim condition is now met.",
    focus: "operator",
    apply: (w) => log({ ...w, evv: step(EVV, w.evv, "aggregator_accept", "system") }, { at: "Wed 09:20", actor: "system", name: "EVV", action: "Accepted by aggregator", code: "EVV_ACCEPTED" }),
  },
];

/** The world after the first n steps, replayed from scratch. */
export function replay(n: number, state: StateCode = "PA"): World {
  return STEPS.slice(0, n).reduce((w, s) => s.apply(w), startWorld(state));
}

/** Step numbers for deep links, so they never drift from the list above. */
export const AT = Object.fromEntries(STEPS.map((s, i) => [s.id, i + 1])) as Record<string, number>;

/* ---------- Edge case: Mateo is in the hospital ---------- */

export function inpatientWorld(state: StateCode = "PA"): World {
  let w: World = { ...startWorld(state), inpatient: true, day: "thu" };
  w = log(w, { at: "Thu 06:30", actor: "operator", name: "Sam", action: "Recorded hospital admission", detail: "Reported by Rosa; visits on hold" });
  w = { ...w, evv: step(EVV, w.evv, "cancel_inpatient", "operator", { reasonCode: "INPATIENT" }) };
  return log(w, { at: "Thu 06:31", actor: "system", name: "Scheduling", action: "Visit cancelled: member inpatient", code: "EVV_CANCELLED_INPATIENT" });
}
