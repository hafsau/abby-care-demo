"use client";

import { useState } from "react";
import { careVerified, claimBlockers, claimReady } from "@/lib/machine";
import { RULES } from "@/lib/rules";
import type { World } from "@/lib/scenario";
import { AuditTimeline } from "../system/audit-timeline";
import { BlockerChecklist } from "../system/blocker-checklist";
import { StatusChip } from "../system/status-chip";
import { btn, Icon } from "../ui";

/**
 * Sam's view, kept thin: the EVV record with the original capture and any
 * correction side by side, the approval, what stands between the visit and a
 * claim, and Audit Mode for anyone who has to prove it later.
 */
export function OperatorView({ world, canAdvance, onAdvance }: { world: World; canAdvance: boolean; onAdvance: () => void }) {
  const [audit, setAudit] = useState(false);
  const rules = RULES[world.state];
  const blockers = claimBlockers({ ...world });
  const c = world.correction;

  function exportPacket() {
    const packet = {
      concept: "Unofficial concept. Synthetic data.",
      visit: "V-1021",
      state: rules.name,
      evv: { status: world.evv, clockIn: world.clockIn, clockOut: world.clockOut ?? null, correction: c ?? null },
      // Minimum necessary: operations exports status and signatures, not clinical text.
      documentation: { status: world.doc, attestedAt: world.attestedAt ?? null, signedBy: world.attestedAt ? "Rosa (caregiver)" : null, lineCount: world.draft.length },
      clinicianReview: world.flag ? { status: world.flag.open ? "open" : "closed", closedAt: world.flag.at ?? null } : null,
      careVerified: careVerified(world),
      claimReady: claimReady(world),
      audit: world.audit.map((e) => (e.clinical ? { seq: e.seq, at: e.at, actor: e.actor, name: e.name, action: e.action, code: e.code, clinical: true } : e)),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "proof-packet-V-1021.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="@container rounded-[20px] border border-line bg-white" role="region" aria-label="Operations web view, Sam">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="font-semibold">Sam Lee, care operations</p>
          <p className="text-[13px] text-muted">
            Visit V-1021 · Mateo R. · Tue Oct 20 · rules: {rules.name} (illustrative){world.day === "wed" ? " · today: Wed Oct 21" : ""}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusChip status={world.inpatient ? "cancelled" : world.evv} audience="operator" showCode />
          <button type="button" aria-pressed={audit} onClick={() => setAudit((a) => !a)} className={btn(audit ? "navy" : "outline", "sm")}>
            <Icon name="shield" className="h-4 w-4" /> Audit mode
          </button>
        </div>
      </div>

      {world.inpatient && (
        <p className="border-b border-gold bg-yellow px-5 py-2.5 text-[14px]">
          <span className="font-semibold">Member inpatient since Thursday 6:30 am.</span> Visits cancelled with reason; none are billable until discharge and reassessment.
        </p>
      )}

      <div className="grid gap-5 p-4 sm:p-5 @4xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="evv-h">
            <h2 id="evv-h" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
              EVV record · the six required facts
            </h2>
            <dl className="mt-2 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line @xl:grid-cols-2">
              {[
                ["Type of service", "Home health aide (illustrative)"],
                ["Member", "Mateo R."],
                ["Caregiver", "Rosa R. (mother; legal guardian)"],
                ["Date", world.inpatient ? "Thu Oct 22" : "Tue Oct 20"],
                ["Location", world.inpatient ? "Not captured (cancelled)" : c?.approvedById ? "Captured at home (clock-in); clock-out by approved fix" : world.clockIn ? "Captured at home (clock-in)" : "–"],
                ["Start / end", world.inpatient ? "Cancelled: member inpatient" : `${world.clockIn ?? "–"} / ${world.clockOut ?? (world.evv === "clocked_in" ? "in progress" : world.evv === "scheduled" ? "–" : "not recorded")}`],
              ].map(([k, v]) => (
                <div key={k} className="bg-white px-3 py-2.5">
                  <dt className="text-[12px] text-muted">{k}</dt>
                  <dd className="text-[14px] font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-1.5 text-[12px] leading-4 text-muted">
              Rosa is both caregiver and guardian, so she can&apos;t verify her own visit. Verification rests on device capture, a second person reviewing any fix, and clinician oversight.
            </p>
          </section>

          {c && (
            <section aria-labelledby="corr-h">
              <h2 id="corr-h" className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                Correction
              </h2>
              <div className="mt-2 grid gap-3 @xl:grid-cols-2">
                <div className="rounded-[12px] border border-line p-3">
                  <p className="text-[12px] text-muted">Original capture · never changes</p>
                  <p className="mt-0.5 font-medium">Clock-out: none</p>
                  <p className="text-[13px] text-muted">Device offline from about 7:20 pm</p>
                </div>
                <div className={`rounded-[12px] border p-3 ${c.approvedById ? "border-ok bg-ok-bg" : "border-gold bg-yellow"}`}>
                  <p className="text-[12px] text-muted">Requested by Rosa · Tue 8:12 pm</p>
                  <p className="mt-0.5 font-medium">Clock-out: {c.to}</p>
                  <p className="text-[13px]">
                    {c.code} · {rules.reasonCodes.find((r) => r.code === c.code)?.label}
                  </p>
                  <p className="text-[13px] text-muted">In her words: “{c.reason}”</p>
                </div>
              </div>
              {world.evv === "correction_requested" && (
                <div className="mt-3 rounded-[12px] bg-soft p-3 text-[13px] leading-5">
                  <p className="font-semibold">Evidence to check</p>
                  <p>Last app activity 7:18 pm, at home · scheduled end 8:00 pm · requested 7:30 pm is 12 min after last activity.</p>
                  <p className="text-muted">Self-reported times more than 30 min after last device activity need a second reviewer (illustrative).</p>
                </div>
              )}
              {world.evv === "correction_requested" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canAdvance && (
                    <button type="button" className={btn("navy")} onClick={onAdvance}>
                      Approve correction · {c.code}
                    </button>
                  )}
                  <button type="button" className={btn("outline")} disabled title="Illustrative">
                    Ask Rosa for more detail
                  </button>
                  <p className="w-full text-[13px] text-muted">You can&apos;t approve a correction you requested. Clinicians can&apos;t approve time fixes.</p>
                </div>
              )}
              {c.approvedById && <p className="mt-2 text-[13px] text-ok-ink">Approved by Sam · Wed 9:05 am · stored beside the original</p>}
            </section>
          )}

          {audit && (
            <section aria-labelledby="audit-h" className="rounded-[16px] bg-cream p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="audit-h" className="font-semibold">
                  Audit trail · append-only
                </h2>
                <button type="button" className={btn("navy", "sm")} onClick={exportPacket}>
                  Export proof packet
                </button>
              </div>
              <div className="mt-3">
                <AuditTimeline entries={world.audit} viewer="operator" />
              </div>
              <h3 className="mt-5 font-semibold">Who opened this record</h3>
              <ul className="mt-2 space-y-1 text-[13px]">
                <li>Tue 21:05 · Dana Reyes, RN · viewed note and voice note (clinical review)</li>
                <li>Wed 09:04 · Sam Lee, operations · viewed EVV record (correction review)</li>
                <li>Wed 09:30 · Compliance · viewed audit trail (read-only)</li>
              </ul>
              <p className="mt-2 text-[12px] text-muted">Access entries are illustrative. Operations sees that the note is signed, not its clinical content.</p>
            </section>
          )}
        </div>

        <div className="space-y-3">
          <BlockerChecklist blockers={world.inpatient ? blockers.map((b) => (b.id === "inpatient" ? { ...b, ok: false, detail: "Member inpatient on this date" } : b)) : blockers} />
          <p className="text-[12px] leading-4 text-muted">Billing readiness is operations-only. Caregiver pay never waits on a claim.</p>
          <div className="rounded-[12px] bg-soft p-3 text-[13px] leading-5">
            <p className="font-semibold">{rules.name} rules in effect</p>
            <p>Late after {rules.graceMinutes} min · fix window {rules.correctionWindowDays} days</p>
            <p>Live-in exemption: {rules.liveInExempt ? `available in ${rules.code}` : "not available"} (illustrative) · not applied; EVV is captured on every visit (assumed)</p>
            <p className="text-muted">{rules.aggregator}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
