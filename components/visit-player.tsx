"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { careVerified } from "@/lib/machine";
import type { StateCode } from "@/lib/rules";
import { caregiverFixesLine, inpatientWorld, replay, STEPS, type World } from "@/lib/scenario";
import { AuditTimeline } from "./system/audit-timeline";
import { CaregiverPhone, type Lang } from "./surfaces/caregiver-phone";
import { ClinicianView } from "./surfaces/clinician-view";
import { OperatorView } from "./surfaces/operator-view";
import { btn, Icon } from "./ui";

type View = "clinician" | "operator" | "audit";

export type PlayerInit = { step: number; state: StateCode; view: View; hospital: boolean; lang: Lang };

const ROLE_OF: Record<string, string> = { caregiver: "Rosa", clinician: "Dana", operator: "Sam", system: "System" };

export function VisitPlayer({ init }: { init: PlayerInit }) {
  const router = useRouter();
  const [i, setI] = useState(init.step);
  const [state, setState] = useState<StateCode>(init.state);
  const [hospital, setHospital] = useState(init.hospital);
  const [world, setWorld] = useState<World>(() => (init.hospital ? inpatientWorld(init.state) : replay(init.step, init.state)));
  const [view, setView] = useState<View>(init.view);
  const [follow, setFollow] = useState(true);
  const [lang, setLang] = useState<Lang>(init.lang);

  const nextStep = hospital ? undefined : STEPS[i];
  const last = hospital ? "hospital" : i === 0 ? "start" : STEPS[i - 1].id;
  const verified = !hospital && careVerified(world);

  useEffect(() => {
    const q = new URLSearchParams();
    if (i) q.set("step", String(i));
    if (state !== "PA") q.set("state", state);
    if (view !== "clinician") q.set("view", view);
    if (hospital) q.set("hospital", "1");
    if (lang !== "en") q.set("lang", lang);
    const s = q.toString();
    router.replace(s ? `/visit?${s}` : "/visit", { scroll: false });
  }, [i, state, view, hospital, lang, router]);

  function go(n: number) {
    const target = Math.max(0, Math.min(STEPS.length, n));
    setHospital(false);
    setWorld(target === i + 1 && !hospital ? STEPS[i].apply(world) : replay(target, state));
    setI(target);
    const focus = STEPS[target - 1]?.focus;
    if (follow && focus && focus !== "caregiver") setView(focus);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">The visit</p>
          <h1 className="display mt-1 text-[40px] sm:text-[52px]">One visit, three views</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="State rules" className="flex items-center gap-1 rounded-full border border-line p-1">
            <span className="px-2 text-[13px] text-muted">Rules</span>
            {(["PA", "FL"] as StateCode[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={state === s}
                onClick={() => {
                  setState(s);
                  setWorld(hospital ? inpatientWorld(s) : replay(i, s));
                }}
                className={`rounded-full px-3 py-1 text-[13px] font-medium ${state === s ? "bg-navy text-white" : ""}`}
              >
                {s === "PA" ? "Pennsylvania" : "Florida"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={hospital}
              onChange={(e) => {
                setHospital(e.target.checked);
                setWorld(e.target.checked ? inpatientWorld(state) : replay(i, state));
              }}
              className="h-4 w-4 accent-navy"
            />
            Edge case: Mateo is in the hospital
          </label>
        </div>
      </div>

      <section aria-label="Scenario" className="mt-6 rounded-[20px] bg-cream p-4 sm:p-5">
        {hospital ? (
          <div aria-live="polite">
            <p className="text-[13px] font-medium text-muted">Edge case · Thursday</p>
            <p className="display mt-1 text-[28px]">Mateo is admitted to the hospital</p>
            <p className="mt-2 max-w-3xl text-[15px] leading-6">
              One fact changes three views. Rosa&apos;s clock-in is off and she&apos;s told why. Dana gets a resumption-of-care task for after discharge. Operations cancels the visit with a reason, and nothing
              from these days can reach a claim.
            </p>
          </div>
        ) : (
          <>
            <ol className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Steps">
              {STEPS.map((s, k) => (
                <li key={s.id} className="flex-none">
                  <button
                    type="button"
                    onClick={() => go(k + 1)}
                    aria-current={k + 1 === i ? "step" : undefined}
                    aria-label={`Step ${k + 1}: ${s.title}`}
                    className={`h-2.5 w-8 rounded-full sm:w-11 ${k < i ? "bg-navy" : "bg-white"} ${k + 1 === i ? "ring-2 ring-gold ring-offset-2 ring-offset-cream" : ""}`}
                  />
                </li>
              ))}
            </ol>
            <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end" aria-live="polite">
              <div>
                <p className="text-[13px] font-medium text-muted">
                  {i === 0 ? "Before the visit" : `Step ${i} of ${STEPS.length} · ${STEPS[i - 1].time} · ${ROLE_OF[STEPS[i - 1].actor]}`}
                </p>
                <p className="display mt-1 text-[28px]">{i === 0 ? "Tuesday morning. Rosa is about to start." : STEPS[i - 1].title}</p>
                <p className="mt-2 max-w-3xl text-[15px] leading-6">
                  {i === 0 ? "Press Next, or act on the screens yourself: Rosa's buttons, Dana's form and Sam's approval all move the story forward." : STEPS[i - 1].narration}
                </p>
                {verified && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-[14px] font-medium text-ok-ink">
                    <Icon name="check" className="h-4 w-4" /> Care verified for Rosa and Dana · claim-ready for operations
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btn("outline")} onClick={() => go(i - 1)} disabled={i === 0}>
                  Back
                </button>
                {nextStep ? (
                  <button type="button" className={btn("navy")} onClick={() => go(i + 1)}>
                    Next: {nextStep.title} <Icon name="arrow" className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" className={btn("navy")} onClick={() => go(0)}>
                    Start over
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-[12px] text-muted">Tip: ← and → move through the steps.</p>
          </>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Rosa · caregiver app</p>
          <CaregiverPhone
            world={world}
            last={last}
            lang={lang}
            onLang={setLang}
            canAdvance={nextStep?.actor === "caregiver" || nextStep?.actor === "system"}
            onAdvance={() => go(i + 1)}
            onFix={(id) => setWorld((w) => caregiverFixesLine(w, id))}
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Views" className="flex flex-wrap gap-1.5">
              {(
                [
                  ["clinician", "Dana · clinician"],
                  ["operator", "Sam · operations"],
                  ["audit", "Audit trail"],
                ] as [View, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={view === id}
                  aria-controls="view-panel"
                  onClick={() => setView(id)}
                  className={`rounded-full px-4 py-2 text-[14px] font-medium ${view === id ? "bg-blue text-navy" : "border border-line text-navy"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="h-4 w-4 accent-navy" />
              Follow the story
            </label>
          </div>
          <div id="view-panel" role="tabpanel" aria-labelledby={`tab-${view}`} className="mt-3">
            {view === "clinician" && <ClinicianView world={world} last={last} canAdvance={nextStep?.actor === "clinician"} onAdvance={() => go(i + 1)} />}
            {view === "operator" && <OperatorView world={world} canAdvance={nextStep?.actor === "operator"} onAdvance={() => go(i + 1)} />}
            {view === "audit" && (
              <div className="rounded-[20px] border border-line bg-white p-5">
                <p className="font-semibold">Audit trail · newest first</p>
                <p className="mb-4 text-[13px] text-muted">Append-only. Every edit, correction and AI action is a new entry with who, when and what changed.</p>
                <AuditTimeline entries={world.audit} newest="first" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
