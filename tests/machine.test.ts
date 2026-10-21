import { describe, expect, it } from "vitest";
import { append } from "@/lib/audit";
import { fixLine, initialDraft, unsupportedCount } from "@/lib/draft";
import { triage } from "@/lib/escalation";
import { careVerified, check, claimBlockers, claimReady, DOC, EVV, STATUS, step } from "@/lib/machine";
import { can, explain, MATRIX } from "@/lib/permissions";
import { reasonFor, RULES } from "@/lib/rules";
import { AT, inpatientWorld, recordOutcome, replay, SCRIPTED_OUTCOME, STEPS } from "@/lib/scenario";

describe("EVV track", () => {
  it("allows the happy path", () => {
    let s = step(EVV, "scheduled", "clock_in", "caregiver");
    s = step(EVV, s, "clock_out", "caregiver");
    s = step(EVV, s, "auto_confirm", "system");
    s = step(EVV, s, "send_to_aggregator", "system");
    expect(step(EVV, s, "aggregator_accept", "system")).toBe("accepted");
  });
  it("blocks clock-in while the member is in the hospital", () => {
    expect(check(EVV, "scheduled", "clock_in", "caregiver", { inpatient: true })).toEqual({ ok: false, reason: expect.stringContaining("hospital") });
  });
  it("only operations approves a correction, never a person their own, and always with a reason", () => {
    const ok = { requestedById: "u-rosa", approvedById: "u-sam", reasonCode: "PA-01" };
    expect(check(EVV, "correction_requested", "approve_correction", "clinician", ok).ok).toBe(false);
    expect(check(EVV, "correction_requested", "approve_correction", "caregiver", ok).ok).toBe(false);
    expect(check(EVV, "correction_requested", "approve_correction", "operator", { ...ok, reasonCode: undefined }).ok).toBe(false);
    expect(check(EVV, "correction_requested", "approve_correction", "operator", ok).ok).toBe(true);
  });
  it("lets one operations person approve another's request, but not their own", () => {
    expect(check(EVV, "correction_requested", "approve_correction", "operator", { requestedById: "u-sam", approvedById: "u-jo", reasonCode: "PA-04" }).ok).toBe(true);
    expect(check(EVV, "correction_requested", "approve_correction", "operator", { requestedById: "u-sam", approvedById: "u-sam", reasonCode: "PA-04" })).toEqual({
      ok: false,
      reason: "No one approves a correction they requested.",
    });
  });
  it("has no transition that skips verification or deletes a record", () => {
    expect(check(EVV, "clocked_in", "aggregator_accept", "system").ok).toBe(false);
    expect(EVV.some((t) => /delete|void/.test(t.event))).toBe(false);
    expect(check(EVV, "scheduled", "clock_in", "operator").ok).toBe(false);
  });
});

describe("Documentation track", () => {
  it("won't let the caregiver sign while an AI line has no source", () => {
    const draft = initialDraft();
    expect(unsupportedCount(draft)).toBe(1);
    expect(check(DOC, "ai_draft", "attest", "caregiver", { unsupportedLines: 1 })).toEqual({ ok: false, reason: expect.stringContaining("caregiver said") });
    const fixed = fixLine(draft, "l3");
    expect(unsupportedCount(fixed)).toBe(0);
    expect(fixed.find((l) => l.id === "l3")).toMatchObject({ editedByCaregiver: true, sources: ["u3", "t3"] });
    expect(check(DOC, "ai_draft", "attest", "caregiver", { unsupportedLines: 0 }).ok).toBe(true);
  });
  it("only a clinician records an outcome, and the AI never attests or closes a flag", () => {
    expect(check(DOC, "routed", "record_outcome", "operator").ok).toBe(false);
    expect(check(DOC, "routed", "record_outcome", "system").ok).toBe(false);
    expect(check(DOC, "ai_draft", "attest", "system").ok).toBe(false);
    expect(check(DOC, "routed", "record_outcome", "clinician").ok).toBe(true);
  });
  it("never reopens a signed note; changes are addenda", () => {
    expect(check(DOC, "attested", "draft_ready", "system").ok).toBe(false);
    expect(check(DOC, "complete", "addendum", "clinician")).toEqual({ ok: true, to: "complete" });
  });
});

describe("escalation runs on taps, with no AI", () => {
  const base = { count: 1, minutes: 1, longestMinutes: 1, breathingOk: true, backToUsual: true, rescueGiven: false };
  it("sends 911 at the plan's threshold, for breathing trouble, or not coming back", () => {
    expect(triage({ ...base, minutes: 5, longestMinutes: 5 })).toEqual({ level: "emergency", reasons: [{ id: "long", n: 5 }] });
    expect(triage({ ...base, breathingOk: false }).level).toBe("emergency");
    expect(triage({ ...base, backToUsual: false }).level).toBe("emergency");
  });
  it("offers the nurse above baseline or after rescue medicine, and just logs within it", () => {
    expect(triage({ ...base, count: 3, minutes: 4, longestMinutes: 4 }).level).toBe("nurse");
    expect(triage({ ...base, rescueGiven: true }).level).toBe("nurse");
    expect(triage(base).level).toBe("log");
  });
  it("runs at the seizure, hours before the voice note and the AI draft", () => {
    expect(AT.seizure).toBeLessThan(AT.voice);
    const w = replay(AT.seizure);
    expect(w.triage?.level).toBe("nurse");
    expect(w.draft).toEqual([]);
    expect(w.audit.some((a) => a.ai)).toBe(false);
  });
});

describe("permissions", () => {
  it("nobody edits clock times, and the caregiver never sees payer data", () => {
    for (const role of ["caregiver", "clinician", "operator", "compliance"] as const) expect(can(role, "clock_times", "edit")).toBe(false);
    expect(can("caregiver", "claim_status", "view")).toBe(false);
    expect(can("clinician", "claim_status", "view")).toBe(false);
    expect(can("compliance", "visit_note", "edit")).toBe(false);
  });
  it("explains every locked action in plain words and names who can", () => {
    expect(explain("caregiver", "clock_times", "edit")?.why).toMatch(/ask for a fix/);
    expect(explain("clinician", "correction", "approve")).toEqual({ why: expect.stringContaining("operations decision"), who: ["operator"] });
    expect(explain("caregiver", "visit_note", "attest")).toBeNull();
    for (const [obj, roles] of Object.entries(MATRIX)) for (const acts of Object.values(roles)) expect(acts?.length, obj).toBeGreaterThan(0);
  });
});

describe("state rules", () => {
  it("maps the caregiver's words to each state's code", () => {
    expect(reasonFor("PA", "My phone died or had no signal")?.code).toBe("PA-01");
    expect(reasonFor("FL", "My phone died or had no signal")?.code).toBe("VM-10");
    expect(RULES.FL.requiredNoteFields.length).toBeGreaterThan(RULES.PA.requiredNoteFields.length);
  });
});

describe("the scenario", () => {
  it("replays every step through legal transitions in both states", () => {
    for (const s of ["PA", "FL"] as const) {
      const end = replay(STEPS.length, s);
      expect(end.evv).toBe("accepted");
      expect(end.doc).toBe("complete");
      expect(end.correction?.code).toBe(s === "PA" ? "PA-01" : "VM-10");
    }
  });
  it("verifies care for the family before it's claim-ready for operations", () => {
    expect(careVerified(replay(AT.outcome))).toBe(false);
    const approved = replay(AT.approve);
    expect(careVerified(approved)).toBe(true);
    expect(claimReady(approved)).toBe(false);
    const end = replay(STEPS.length);
    expect(claimReady(end)).toBe(true);
    expect(careVerified({ ...end, evv: "rejected" })).toBe(true);
    expect(claimBlockers({ ...end, unitsRemaining: 40 }).find((b) => b.id === "units")?.ok).toBe(false);
  });
  it("records Dana's own choice, and requires a reason only when she changes the suggestion", () => {
    const routed = replay(AT.attest);
    expect(routed.flag).toMatchObject({ open: true, suggested: "home_visit" });
    const kept = recordOutcome(routed, { next: "home_visit", practitionerNotified: true, note: "Visit booked" });
    expect(kept.audit.at(-2)?.action).toBe("Recorded outcome; kept the suggested next step");
    expect(() => recordOutcome(routed, { next: "phone_followup", practitionerNotified: true, note: "x" })).toThrow(/reason/);
    expect(() => recordOutcome(routed, { next: "home_visit", practitionerNotified: false, note: "x" })).toThrow(/practitioner/);
    const changed = recordOutcome(routed, SCRIPTED_OUTCOME);
    expect(changed.audit.at(-2)).toMatchObject({ before: "Suggested: Nurse home visit within 24 hours", after: expect.stringContaining("Phone follow-up") });
  });
  it("keeps an append-only trail with before/after for the AI edit and the correction", () => {
    const end = replay(STEPS.length);
    expect(end.audit.map((a) => a.seq)).toEqual(end.audit.map((_, i) => i + 1));
    expect(Object.isFrozen(end.audit)).toBe(true);
    expect(end.audit.find((a) => a.action === "Edited an AI line")).toMatchObject({ before: expect.stringContaining("refused"), after: expect.stringContaining("asleep") });
    expect(end.audit.find((a) => a.action === "Approved EVV correction")).toMatchObject({ before: "No clock-out", after: "7:30 pm", code: "PA-01" });
    expect(end.audit.find((a) => a.syncedAt)).toMatchObject({ at: "Tue 20:40", syncedAt: "Tue 20:41" });
    expect(end.audit.find((a) => a.ai === "translated")).toBeTruthy();
    expect(() => (end.audit as unknown as unknown[]).push({})).toThrow();
    expect(append([], { at: "x", actor: "system", name: "x", action: "x" })[0].seq).toBe(1);
  });
  it("puts visits on hold in the hospital", () => {
    const w = inpatientWorld();
    expect(w.evv).toBe("cancelled");
    expect(careVerified(w)).toBe(false);
  });
  it("never uses exception or flag language on the caregiver side", () => {
    for (const v of Object.values(STATUS)) expect(v.caregiver).not.toMatch(/exception|flag|violation|reject/i);
  });
});
