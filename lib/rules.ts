/*
 * State and payer rules as configuration. Every value here is illustrative:
 * real rules vary by state, program and managed-care plan and would come
 * from compliance. The point is that the same screens re-render from config
 * instead of being redesigned per state.
 */

export type StateCode = "PA" | "FL";

export type ReasonCode = { code: string; label: string; caregiverLabel: string };

export type StateRules = {
  code: StateCode;
  name: string;
  /** Minutes after the scheduled start before a visit counts as late. */
  graceMinutes: number;
  /** Whether live-in caregivers are excluded from EVV (CMS lets states choose). */
  liveInExempt: boolean;
  /** Days a caregiver has to request an EVV fix. */
  correctionWindowDays: number;
  /** Fields a visit note must have before it can be signed. */
  requiredNoteFields: string[];
  reasonCodes: ReasonCode[];
  aggregator: string;
};

export const RULES: Record<StateCode, StateRules> = {
  PA: {
    code: "PA",
    name: "Pennsylvania",
    graceMinutes: 15,
    liveInExempt: true,
    correctionWindowDays: 7,
    requiredNoteFields: ["Tasks done or skipped, with a reason", "How Mateo was today", "Anything unusual"],
    reasonCodes: [
      { code: "PA-01", label: "Device or connectivity issue", caregiverLabel: "My phone died or had no signal" },
      { code: "PA-02", label: "Caregiver forgot to clock in/out", caregiverLabel: "I forgot to clock in or out" },
      { code: "PA-03", label: "Service delivered in the community", caregiverLabel: "Care happened away from home" },
      { code: "PA-04", label: "Incorrect time recorded", caregiverLabel: "The time is wrong" },
    ],
    aggregator: "State EVV aggregator (varies by program and plan)",
  },
  FL: {
    code: "FL",
    name: "Florida",
    graceMinutes: 10,
    liveInExempt: false,
    correctionWindowDays: 3,
    requiredNoteFields: ["Tasks done or skipped, with a reason", "How Mateo was today", "Anything unusual", "Task codes for each service"],
    reasonCodes: [
      { code: "VM-10", label: "Mobile device failure", caregiverLabel: "My phone died or had no signal" },
      { code: "VM-20", label: "Missed clock event", caregiverLabel: "I forgot to clock in or out" },
      { code: "VM-30", label: "Visit location outside the home", caregiverLabel: "Care happened away from home" },
    ],
    aggregator: "Plan-designated EVV aggregator (varies by managed-care plan)",
  },
};

/** Map a caregiver's plain-language choice to the state's reason code. */
export function reasonFor(state: StateCode, caregiverLabel: string) {
  return RULES[state].reasonCodes.find((r) => r.caregiverLabel === caregiverLabel);
}
