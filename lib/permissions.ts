/*
 * Who can do what, to which record. The matrix renders on the System page,
 * and LockedField reads explain() so a locked control always says why it's
 * locked and who can change it. Minimum necessary: each role sees what its
 * job needs, and the caregiver never sees payer data.
 */
import type { Role } from "./machine";

export type Action = "view" | "edit" | "attest" | "request" | "approve" | "record" | "export";

export type ObjectId = "clock_times" | "visit_note" | "change_flag" | "correction" | "plan_of_care" | "audit_trail" | "claim_status" | "access_log";

export const OBJECTS: { id: ObjectId; name: string }[] = [
  { id: "clock_times", name: "Clock-in and clock-out times" },
  { id: "visit_note", name: "Visit note" },
  { id: "change_flag", name: "Change-in-condition report" },
  { id: "correction", name: "EVV correction" },
  { id: "plan_of_care", name: "Plan of care" },
  { id: "audit_trail", name: "Audit trail and proof packet" },
  { id: "claim_status", name: "Claim and payer status" },
  { id: "access_log", name: "Record access log" },
];

export const MATRIX: Record<ObjectId, Partial<Record<Role, Action[]>>> = {
  clock_times: { caregiver: ["view"], clinician: ["view"], operator: ["view"], compliance: ["view"] },
  visit_note: { caregiver: ["view", "edit", "attest"], clinician: ["view"], operator: ["view"], compliance: ["view"] },
  change_flag: { caregiver: ["view"], clinician: ["view", "record"], operator: ["view"], compliance: ["view"] },
  correction: { caregiver: ["view", "request"], clinician: ["view"], operator: ["view", "request", "approve"], compliance: ["view"] },
  plan_of_care: { caregiver: ["view"], clinician: ["view", "edit"], operator: ["view"], compliance: ["view"] },
  audit_trail: { caregiver: ["view"], clinician: ["view"], operator: ["view", "export"], compliance: ["view", "export"] },
  claim_status: { operator: ["view"], compliance: ["view"] },
  access_log: { operator: ["view"], compliance: ["view", "export"] },
};

/** Extra conditions a role's permission carries, shown as footnotes in the matrix. */
export const CONDITIONS: Partial<Record<`${ObjectId}:${Role}:${Action}`, string>> = {
  "visit_note:caregiver:edit": "Only while it's a draft. After signing, changes are dated addenda.",
  "visit_note:operator:view": "Status and signature only, not the note's clinical content.",
  "change_flag:caregiver:view": "Sees that Dana reviewed it and what happens next.",
  "change_flag:operator:view": "Status only.",
  "correction:operator:approve": "Never their own request.",
  "correction:operator:request": "Only for aggregator rejections.",
  "plan_of_care:clinician:edit": "With the ordering practitioner's orders. The AI never edits it.",
  "audit_trail:caregiver:view": "Her own visits: the same proof the health plan sees.",
};

export function can(role: Role, object: ObjectId, action: Action) {
  return MATRIX[object][role]?.includes(action) ?? false;
}

const REASONS: Partial<Record<`${ObjectId}:${Role}:${Action}`, string>> = {
  "clock_times:caregiver:edit": "Clock times are recorded the moment you tap, so nobody edits them, including you. If something's off, ask for a fix and someone else reviews it.",
  "clock_times:clinician:edit": "Clinicians don't change visit times. Care operations reviews EVV fixes.",
  "clock_times:operator:edit": "Original EVV records never change. Operations approves a correction, which is stored alongside the original.",
  "correction:clinician:approve": "EVV fixes are an operations decision, not a clinical one.",
  "correction:caregiver:approve": "No one approves their own fix.",
  "visit_note:clinician:edit": "The note is Rosa's record in her words. Clinicians add a dated addendum instead.",
  "visit_note:operator:edit": "Operations can see that a note is signed, not change it.",
  "change_flag:operator:record": "Only a clinician records the outcome of a change-in-condition report.",
  "plan_of_care:caregiver:edit": "The plan of care comes from Mateo's doctor and his nurse. Tell Dana if something should change.",
  "claim_status:caregiver:view": "Your pay doesn't depend on insurance claims, so this isn't shown to you.",
  "claim_status:clinician:view": "Payer details aren't needed for clinical review (minimum necessary).",
};

/** Why a role can't take an action, and who can. Null when it's allowed. */
export function explain(role: Role, object: ObjectId, action: Action): { why: string; who: Role[] } | null {
  if (can(role, object, action)) return null;
  const who = (Object.keys(MATRIX[object]) as Role[]).filter((r) => can(r, object, action));
  const why = REASONS[`${object}:${role}:${action}`] ?? (who.length ? `Only ${who.join(" and ")} can do this.` : "Nobody can do this; it's recorded once and kept as is.");
  return { why, who };
}
