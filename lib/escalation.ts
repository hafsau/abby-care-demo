/*
 * Escalation runs before, and independently of, any AI. It compares what the
 * caregiver reported against the child's own seizure action plan, written by
 * his care team. Thresholds here are illustrative, not clinical guidance.
 */

export type SeizureReport = {
  count: number;
  longestMinutes: number;
  breathingTrouble: boolean;
  backToBaseline: boolean;
};

export type ActionPlan = {
  /** Usual seizures per day for this child. */
  usualMax: number;
  /** Usual longest seizure, in minutes. */
  usualLongest: number;
  /** Call 911 at or above this length (minutes). */
  emergencyMinutes: number;
};

export const MATEO_PLAN: ActionPlan = { usualMax: 1, usualLongest: 1, emergencyMinutes: 5 };

export type Triage =
  | { level: "emergency"; title: string; reasons: string[] }
  | { level: "nurse"; title: string; reasons: string[] }
  | { level: "log"; title: string; reasons: string[] };

export function triage(r: SeizureReport, plan: ActionPlan = MATEO_PLAN): Triage {
  const emergency: string[] = [];
  if (r.longestMinutes >= plan.emergencyMinutes) emergency.push(`A seizure lasted ${r.longestMinutes} minutes or more`);
  if (r.breathingTrouble) emergency.push("Trouble breathing");
  if (!r.backToBaseline) emergency.push("He isn't back to his usual self");
  if (emergency.length) return { level: "emergency", title: "Call 911 now", reasons: emergency };

  const nurse: string[] = [];
  if (r.count > plan.usualMax) nurse.push(`${r.count} seizures today; he usually has ${plan.usualMax === 1 ? "0 to 1" : `up to ${plan.usualMax}`}`);
  if (r.longestMinutes > plan.usualLongest) nurse.push(`The longest was about ${r.longestMinutes} minutes; usually under ${plan.usualLongest}`);
  if (nurse.length) return { level: "nurse", title: "Call the on-call nurse", reasons: nurse };

  return { level: "log", title: "Within his usual pattern", reasons: ["Add it to today's note"] };
}

export const ROSA_REPORT: SeizureReport = { count: 3, longestMinutes: 4, breathingTrouble: false, backToBaseline: true };
