/*
 * Escalation runs on the caregiver's taps, at the moment she logs a seizure,
 * on the phone, with no AI involved. It compares the report against the
 * child's own seizure action plan. Thresholds here are illustrative; a real
 * plan comes from his neurologist.
 */

export type SeizureReport = {
  /** Seizures so far today, including this one. */
  count: number;
  /** Length of this seizure, in minutes. */
  minutes: number;
  /** Longest today, in minutes. */
  longestMinutes: number;
  breathingOk: boolean;
  backToUsual: boolean;
  rescueGiven: boolean;
};

export type ActionPlan = {
  usualMax: number;
  usualLongest: number;
  /** Call 911 at or above this length (minutes). */
  emergencyMinutes: number;
};

export const MATEO_PLAN: ActionPlan = { usualMax: 1, usualLongest: 1, emergencyMinutes: 5 };

export type ReasonId = "long" | "breathing" | "not_back" | "rescue" | "count" | "longest" | "within";
export type Reason = { id: ReasonId; n?: number; usual?: number };

export type Triage = { level: "emergency" | "nurse" | "log"; reasons: Reason[] };

export function triage(r: SeizureReport, plan: ActionPlan = MATEO_PLAN): Triage {
  const emergency: Reason[] = [];
  if (r.minutes >= plan.emergencyMinutes) emergency.push({ id: "long", n: plan.emergencyMinutes });
  if (!r.breathingOk) emergency.push({ id: "breathing" });
  if (!r.backToUsual) emergency.push({ id: "not_back" });
  if (emergency.length) return { level: "emergency", reasons: emergency };

  const nurse: Reason[] = [];
  if (r.rescueGiven) nurse.push({ id: "rescue" });
  if (r.count > plan.usualMax) nurse.push({ id: "count", n: r.count, usual: plan.usualMax });
  if (r.longestMinutes > plan.usualLongest) nurse.push({ id: "longest", n: r.longestMinutes, usual: plan.usualLongest });
  if (nurse.length) return { level: "nurse", reasons: nurse };

  return { level: "log", reasons: [{ id: "within" }] };
}

/** What Rosa taps at 3:14 pm: the third seizure today, about 4 minutes. */
export const ROSA_REPORT: SeizureReport = { count: 3, minutes: 4, longestMinutes: 4, breathingOk: true, backToUsual: true, rescueGiven: false };

export function reasonText(r: Reason, lang: "en" | "es"): string {
  const es = lang === "es";
  switch (r.id) {
    case "long":
      return es ? `Una convulsión de ${r.n} minutos o más` : `A seizure of ${r.n} minutes or longer`;
    case "breathing":
      return es ? "Le cuesta respirar" : "Trouble breathing";
    case "not_back":
      return es ? "No vuelve a estar como siempre" : "Not back to his usual self";
    case "rescue":
      return es ? "Se le dio la medicina de rescate" : "Rescue medicine was given";
    case "count":
      return es ? `${r.n} convulsiones hoy. Normalmente tiene de 0 a ${r.usual}.` : `${r.n} seizures today. He usually has 0 to ${r.usual}.`;
    case "longest":
      return es
        ? `La más larga fue de unos ${r.n} minutos. Normalmente menos de ${r.usual} minuto${r.usual === 1 ? "" : "s"}.`
        : `The longest was about ${r.n} minutes. Usually under ${r.usual} minute${r.usual === 1 ? "" : "s"}.`;
    case "within":
      return es ? "Dentro de su patrón de siempre" : "Within his usual pattern";
  }
}

export function triageTitle(t: Triage, lang: "en" | "es") {
  const es = lang === "es";
  if (t.level === "emergency") return es ? "Llama al 911 ahora" : "Call 911 now";
  if (t.level === "nurse") return es ? "Llama a la enfermera de guardia" : "Call the on-call nurse";
  return es ? "Anótalo en la nota de hoy" : "Add it to today's note";
}
