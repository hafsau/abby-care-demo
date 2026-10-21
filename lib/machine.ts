/*
 * The visit lifecycle as data. One visit runs two independent tracks:
 *   EVV (did the visit happen, when and where) and
 *   Documentation (what care was given, in the caregiver's words).
 * They never gate each other. They meet at "Care verified" (shared with the
 * family and clinician) and, for operators only, at "Claim-ready".
 *
 * The diagram, status chips, permissions copy and the scenario all read
 * from this file, and tests/machine.test.ts checks every rule.
 */

export type Role = "caregiver" | "clinician" | "operator" | "compliance";

export const ROLES: { id: Role; name: string; person: string; surface: string }[] = [
  { id: "caregiver", name: "Family caregiver", person: "Rosa", surface: "Mobile app" },
  { id: "clinician", name: "Clinician (RN case manager, assumed)", person: "Dana", surface: "Web" },
  { id: "operator", name: "Care operations", person: "Sam", surface: "Web" },
  { id: "compliance", name: "Compliance", person: "Read-only", surface: "Web" },
];

export type EvvState =
  | "scheduled"
  | "clocked_in"
  | "clocked_out"
  | "confirmed"
  | "needs_fix"
  | "correction_requested"
  | "correction_approved"
  | "sent"
  | "accepted"
  | "rejected"
  | "cancelled";

export type DocState = "logging" | "ai_draft" | "attested" | "routed" | "outcome_recorded" | "complete";

export type Track = "evv" | "doc";

export type EvvEvent =
  | "clock_in"
  | "clock_out"
  | "auto_confirm"
  | "miss_clock_out"
  | "request_correction"
  | "approve_correction"
  | "send_to_aggregator"
  | "aggregator_accept"
  | "aggregator_reject"
  | "cancel_inpatient";

export type DocEvent = "draft_ready" | "attest" | "route_to_clinician" | "record_outcome" | "close" | "addendum";

export type Actor = Role | "system";

export type GuardId = "not_inpatient" | "all_lines_supported" | "not_own_correction" | "reason_code";

export type Transition<S extends string, E extends string> = {
  from: S;
  event: E;
  to: S;
  by: Actor[];
  guards?: GuardId[];
};

export const EVV: Transition<EvvState, EvvEvent>[] = [
  { from: "scheduled", event: "clock_in", to: "clocked_in", by: ["caregiver"], guards: ["not_inpatient"] },
  { from: "scheduled", event: "cancel_inpatient", to: "cancelled", by: ["operator", "system"], guards: ["reason_code"] },
  { from: "clocked_in", event: "clock_out", to: "clocked_out", by: ["caregiver"] },
  { from: "clocked_in", event: "miss_clock_out", to: "needs_fix", by: ["system"] },
  { from: "clocked_out", event: "auto_confirm", to: "confirmed", by: ["system"] },
  { from: "needs_fix", event: "request_correction", to: "correction_requested", by: ["caregiver"], guards: ["reason_code"] },
  { from: "correction_requested", event: "approve_correction", to: "correction_approved", by: ["operator"], guards: ["not_own_correction", "reason_code"] },
  { from: "confirmed", event: "send_to_aggregator", to: "sent", by: ["system"] },
  { from: "correction_approved", event: "send_to_aggregator", to: "sent", by: ["system"] },
  { from: "sent", event: "aggregator_accept", to: "accepted", by: ["system"] },
  { from: "sent", event: "aggregator_reject", to: "rejected", by: ["system"] },
  { from: "rejected", event: "request_correction", to: "correction_requested", by: ["operator"], guards: ["reason_code"] },
];

export const DOC: Transition<DocState, DocEvent>[] = [
  { from: "logging", event: "draft_ready", to: "ai_draft", by: ["system"] },
  { from: "ai_draft", event: "attest", to: "attested", by: ["caregiver"], guards: ["all_lines_supported"] },
  { from: "attested", event: "close", to: "complete", by: ["system"] },
  { from: "attested", event: "route_to_clinician", to: "routed", by: ["system"] },
  { from: "routed", event: "record_outcome", to: "outcome_recorded", by: ["clinician"] },
  { from: "outcome_recorded", event: "close", to: "complete", by: ["system"] },
  // An attested note is never edited; later facts are dated addenda on the same record.
  { from: "complete", event: "addendum", to: "complete", by: ["caregiver", "clinician"] },
];

export type GuardContext = {
  inpatient?: boolean;
  /** AI draft lines with no source in the caregiver's own words, not yet edited. */
  unsupportedLines?: number;
  requestedBy?: Actor;
  approvedBy?: Actor;
  reasonCode?: string;
};

export const GUARD_COPY: Record<GuardId, string> = {
  not_inpatient: "Visits are on hold while the member is in the hospital.",
  all_lines_supported: "Every line in the note has to come from what the caregiver said or typed.",
  not_own_correction: "No one approves their own correction.",
  reason_code: "A reason code is required.",
};

function failedGuard(guards: GuardId[] = [], ctx: GuardContext): GuardId | null {
  for (const g of guards) {
    if (g === "not_inpatient" && ctx.inpatient) return g;
    if (g === "all_lines_supported" && (ctx.unsupportedLines ?? 0) > 0) return g;
    if (g === "not_own_correction" && ctx.requestedBy && ctx.requestedBy === ctx.approvedBy) return g;
    if (g === "reason_code" && !ctx.reasonCode) return g;
  }
  return null;
}

export type Check = { ok: true; to: string } | { ok: false; reason: string };

export function check<S extends string, E extends string>(table: Transition<S, E>[], from: S, event: E, actor: Actor, ctx: GuardContext = {}): Check {
  const t = table.find((x) => x.from === from && x.event === event);
  if (!t) return { ok: false, reason: `“${event}” can't happen from “${from}”.` };
  if (!t.by.includes(actor)) return { ok: false, reason: `${actor === "system" ? "The system" : `A ${actor}`} can't do this.` };
  const g = failedGuard(t.guards, ctx);
  if (g) return { ok: false, reason: GUARD_COPY[g] };
  return { ok: true, to: t.to };
}

export function step<S extends string, E extends string>(table: Transition<S, E>[], from: S, event: E, actor: Actor, ctx: GuardContext = {}): S {
  const r = check(table, from, event, actor, ctx);
  if (!r.ok) throw new Error(r.reason);
  return r.to as S;
}

/* ---------- Where the tracks meet ---------- */

export type VisitFacts = {
  evv: EvvState;
  doc: DocState;
  inpatient: boolean;
  authMatched: boolean;
  unitsRemaining: number;
};

const EVV_OK: EvvState[] = ["confirmed", "correction_approved", "sent", "accepted"];
const DOC_OK: DocState[] = ["complete"];

/** Shared with the family and the clinician. Payer status is never part of it. */
export function careVerified(v: Pick<VisitFacts, "evv" | "doc">) {
  return EVV_OK.includes(v.evv) && DOC_OK.includes(v.doc);
}

export type Blocker = { id: string; label: string; ok: boolean; detail: string };

/** Operators only: what still stands between this visit and a claim. */
export function claimBlockers(v: VisitFacts): Blocker[] {
  return [
    { id: "evv", label: "Visit accepted by the state EVV aggregator", ok: v.evv === "accepted", detail: v.evv === "accepted" ? "Accepted" : `EVV is “${STATUS[v.evv].operator}”` },
    { id: "doc", label: "Documentation attested and closed", ok: v.doc === "complete", detail: v.doc === "complete" ? "Attested by caregiver; flag closed by clinician" : `Documentation is “${STATUS[v.doc].operator}”` },
    { id: "auth", label: "Matches an active authorization", ok: v.authMatched, detail: v.authMatched ? "Home health aide, current period" : "No matching authorization" },
    { id: "units", label: "Authorized units remain", ok: v.unitsRemaining > 0, detail: `${v.unitsRemaining} units left this period (illustrative)` },
    { id: "inpatient", label: "Member wasn't in the hospital", ok: !v.inpatient, detail: v.inpatient ? "Member inpatient on this date" : "No inpatient stay on this date" },
  ];
}

export function claimReady(v: VisitFacts) {
  return claimBlockers(v).every((b) => b.ok);
}

/* ---------- One status, three audiences ---------- */

export type Status = EvvState | DocState | "care_verified" | "claim_ready" | "on_hold";

export type Tone = "neutral" | "info" | "progress" | "attention" | "success" | "danger";

export type Vocab = { caregiver: string; clinician: string; operator: string; code: string; tone: Tone; caregiverHidden?: boolean };

/*
 * The caregiver never sees "exception", "violation" or "flagged". The code
 * column is what engineering and the audit export use.
 */
export const STATUS: Record<Status, Vocab> = {
  scheduled: { caregiver: "Coming up", clinician: "Scheduled", operator: "Scheduled", code: "EVV_SCHEDULED", tone: "neutral" },
  clocked_in: { caregiver: "You're clocked in", clinician: "In progress", operator: "In progress", code: "EVV_IN_PROGRESS", tone: "progress" },
  clocked_out: { caregiver: "Clocked out", clinician: "Visit ended", operator: "Clocked out", code: "EVV_CLOCKED_OUT", tone: "progress" },
  confirmed: { caregiver: "Hours counted", clinician: "Visit confirmed", operator: "EVV complete", code: "EVV_CONFIRMED", tone: "success" },
  needs_fix: { caregiver: "Needs a quick fix", clinician: "EVV: missing clock-out", operator: "Exception: missing clock-out", code: "EVV_EXC_MISSING_OUT", tone: "attention" },
  correction_requested: { caregiver: "Fix sent, waiting on review", clinician: "Correction pending", operator: "Correction requested", code: "EVV_CORR_REQUESTED", tone: "attention" },
  correction_approved: { caregiver: "Fix approved", clinician: "Correction approved", operator: "Correction approved", code: "EVV_CORR_APPROVED", tone: "success" },
  sent: { caregiver: "Hours counted", clinician: "Visit confirmed", operator: "Sent to aggregator", code: "EVV_SUBMITTED", tone: "progress" },
  accepted: { caregiver: "Hours counted", clinician: "Visit confirmed", operator: "Accepted by aggregator", code: "EVV_ACCEPTED", tone: "success" },
  rejected: { caregiver: "We're fixing something", clinician: "Visit confirmed", operator: "Rejected by aggregator", code: "EVV_REJECTED", tone: "danger" },
  cancelled: { caregiver: "Not needed today", clinician: "Cancelled: inpatient", operator: "Cancelled (member inpatient)", code: "EVV_CANCELLED_INPATIENT", tone: "neutral" },
  on_hold: { caregiver: "Visits paused", clinician: "On hold: inpatient", operator: "On hold (inpatient)", code: "VISIT_ON_HOLD", tone: "attention" },
  logging: { caregiver: "Add today's notes", clinician: "Notes in progress", operator: "Notes in progress", code: "DOC_LOGGING", tone: "neutral" },
  ai_draft: { caregiver: "Check your note", clinician: "Awaiting caregiver", operator: "Awaiting caregiver", code: "DOC_DRAFT", tone: "progress" },
  attested: { caregiver: "Note signed", clinician: "Note attested", operator: "Attested", code: "DOC_ATTESTED", tone: "success" },
  routed: { caregiver: "Dana's looking at this", clinician: "Needs your review", operator: "With clinician", code: "DOC_ROUTED", tone: "attention" },
  outcome_recorded: { caregiver: "Dana reviewed this", clinician: "Outcome recorded", operator: "Clinician reviewed", code: "DOC_OUTCOME", tone: "success" },
  complete: { caregiver: "Note done", clinician: "Closed", operator: "Documentation complete", code: "DOC_COMPLETE", tone: "success" },
  care_verified: { caregiver: "Care verified", clinician: "Care verified", operator: "Care verified", code: "VISIT_VERIFIED", tone: "success" },
  claim_ready: { caregiver: "", clinician: "", operator: "Claim-ready", code: "VISIT_CLAIM_READY", tone: "success", caregiverHidden: true },
};

/** States drawn on the front-door diagram, in reading order. */
export const DIAGRAM: { track: Track; states: Status[]; branch?: Status[] }[] = [
  { track: "evv", states: ["scheduled", "clocked_in", "clocked_out", "confirmed", "sent", "accepted"], branch: ["needs_fix", "correction_requested", "correction_approved"] },
  { track: "doc", states: ["logging", "ai_draft", "attested", "complete"], branch: ["routed", "outcome_recorded"] },
];
