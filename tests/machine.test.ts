import { describe, expect, it } from "vitest";
import { append } from "@/lib/audit";
import { fixLine, initialDraft, unsupportedCount } from "@/lib/draft";
import { triage } from "@/lib/escalation";
import { careVerified, check, claimBlockers, claimReady, DOC, EVV, STATUS, step } from "@/lib/machine";
import { can, explain, MATRIX } from "@/lib/permissions";
import { reasonFor, RULES } from "@/lib/rules";
import { inpatientWorld, replay, STEPS } from "@/lib/scenario";

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
  it("only operations approves a correction, never their own, and always with a reason", () => {
    expect(check(EVV, "correction_requested", "approve_correction", "clinician", { reasonCode: "PA-01" }).ok).toBe(false);
    expect(check(EVV, "correction_requested", "approve_correction", "caregiver", { reasonCode: "PA-01" }).ok).toBe(false);
    expect(check(EVV, "correction_requested", "approve_correction", "operator", { requestedBy: "operator", approvedBy: "operator", reasonCode: "PA-01" })).toEqual({
      ok: false,
      reason: "No one approves their own correction.",
    });
    expect(check(EVV, "correction_requested", "approve_correction", "operator", { requestedBy: "caregiver", approvedBy: "operator" }).ok).toBe(false);
    expect(check(EVV, "correction_requested", "approve_correction", "operator", { requestedBy: "caregiver", approvedBy: "operator", reasonCode: "PA-01" }).ok).toBe(true);
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

describe("escalation runs before AI", () => {
  it("sends 911 for a long seizure or breathing trouble", () => {
    expect(triage({ count: 1, longestMinutes: 5, breathingTrouble: false, backToBaseline: true }).level).toBe("emergency");
    expect(triage({ count: 1, longestMinutes: 1, breathingTrouble: true, backToBaseline: true }).level).toBe("emergency");
  });
  it("offers the nurse above baseline, and just logs within it", () => {
    expect(triage({ count: 3, longestMinutes: 4, breathingTrouble: false, backToBaseline: true }).level).toBe("nurse");
    expect(triage({ count: 1, longestMinutes: 1, breathingTrouble: false, backToBaseline: true }).level).toBe("log");
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
  it("reaches care verified and claim-ready only at the end", () => {
    const mid = replay(STEPS.findIndex((s) => s.id === "outcome") + 1);
    expect(careVerified(mid)).toBe(false);
    const approved = replay(STEPS.findIndex((s) => s.id === "approve") + 1);
    expect(careVerified(approved)).toBe(true);
    expect(claimReady({ ...approved })).toBe(false);
    const end = replay(STEPS.length);
    expect(claimReady(end)).toBe(true);
    expect(claimBlockers({ ...end, unitsRemaining: 0 }).find((b) => b.id === "units")?.ok).toBe(false);
  });
  it("keeps an append-only trail with before/after for the AI edit and the correction", () => {
    const end = replay(STEPS.length);
    expect(end.audit.map((a) => a.seq)).toEqual(end.audit.map((_, i) => i + 1));
    expect(Object.isFrozen(end.audit)).toBe(true);
    expect(end.audit.find((a) => a.action === "Edited an AI line")).toMatchObject({ before: expect.stringContaining("refused"), after: expect.stringContaining("asleep") });
    expect(end.audit.find((a) => a.action === "Approved EVV correction")).toMatchObject({ before: "No clock-out", after: "7:30 pm", code: "PA-01" });
    expect(end.audit.find((a) => a.syncedAt)).toBeTruthy();
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
