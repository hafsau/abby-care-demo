"use client";

import { unsupportedCount } from "@/lib/draft";
import { MATEO_PLAN, reasonText, triageTitle } from "@/lib/escalation";
import { careVerified } from "@/lib/machine";
import { RULES } from "@/lib/rules";
import type { World } from "@/lib/scenario";
import { AiDraftCard } from "../system/ai-draft-card";
import { StatusChip } from "../system/status-chip";
import { btn, Icon, IconDot } from "../ui";

export type Lang = "en" | "es";

const EVV_SETTLED = ["confirmed", "correction_approved", "sent", "accepted", "rejected"];

/** The visit is Tuesday Oct 20, 2026; the fix deadline counts from it. */
function deadline(days: number, lang: Lang) {
  const d = new Date(Date.UTC(2026, 9, 20 + days));
  return d.toLocaleDateString(lang === "es" ? "es-US" : "en-US", { weekday: lang === "es" ? "long" : "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Rosa's phone. One next thing at a time, taps before typing, plain words,
 * Spanish one tap away. Pay copy follows EVV only, never clinical review or
 * claims, because she's a W-2 employee paid for hours worked.
 */
export function CaregiverPhone({
  world,
  last,
  lang,
  onLang,
  onAdvance,
  onFix,
  canAdvance,
}: {
  world: World;
  last: string;
  lang: Lang;
  onLang: (l: Lang) => void;
  onAdvance: () => void;
  onFix: (id: string) => void;
  canAdvance: boolean;
}) {
  const t = lang === "es" ? ES : EN;
  const rules = RULES[world.state];
  const verified = careVerified(world);
  const settled = EVV_SETTLED.includes(world.evv);

  const hours = world.inpatient ? t.hoursSoFar : settled ? t.hoursFull : world.evv === "needs_fix" || world.evv === "correction_requested" ? t.hoursPending : t.hoursSoFar;
  const payLine = world.inpatient
    ? t.payHospital
    : world.evv === "needs_fix"
      ? t.payFixBy(deadline(rules.correctionWindowDays, lang))
      : world.evv === "correction_requested"
        ? t.payFixSent
        : settled
          ? t.payCounted
          : t.payNext;

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="rounded-[44px] bg-navy p-2.5 shadow-[0_20px_50px_-20px_rgba(8,29,76,0.45)]">
        <div className="flex h-[720px] flex-col overflow-hidden rounded-[36px] bg-cream" role="region" aria-label={t.region}>
          <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-4 text-[13px]">
            <span className="font-medium">
              {t.app} <span className="font-normal text-muted">· {t.concept}</span>
            </span>
            <div className="flex items-center gap-2">
              {last === "voice" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[12px]">
                  <Icon name="wifi-off" className="h-3.5 w-3.5" /> {t.savedOnPhone}
                </span>
              )}
              <div role="group" aria-label={t.language} className="flex rounded-full bg-white p-0.5">
                {(["en", "es"] as Lang[]).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => onLang(l)} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${lang === l ? "bg-navy text-white" : "text-navy"}`}>
                    {l === "en" ? "EN" : "ES"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <p className="display text-[30px]">{last === "start" ? t.morning : t.hi}</p>
            <p className="mt-1 text-[14px] text-muted">{t.date[world.day]}</p>

            <div className="mt-3 rounded-[20px] bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-blue text-[18px]" aria-hidden="true">
                  M
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Mateo</p>
                  <p className="text-[13px] text-muted">{world.inpatient ? t.visitCancelled : world.day === "wed" ? t.visitYesterday : t.visitTime}</p>
                </div>
              </div>
              <div className="mt-2">
                <StatusChip status={world.inpatient ? "cancelled" : verified ? "care_verified" : world.evv} audience="caregiver" lang={lang} />
              </div>
            </div>

            <div className="mt-3">
              {world.inpatient ? <Inpatient t={t} /> : <Screen world={world} last={last} t={t} lang={lang} onAdvance={onAdvance} onFix={onFix} canAdvance={canAdvance} />}
            </div>
          </div>

          <div className="border-t border-line bg-white px-4 py-2.5 text-[13px]" aria-live="polite">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">{t.thisPeriod}</span>
              <span className="font-semibold">{hours}</span>
            </div>
            <p className="mt-0.5 leading-5 text-muted">{payLine}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] text-muted">{t.caption}</p>
    </div>
  );
}

type T = typeof EN;

function Screen({ world, last, t, lang, onAdvance, onFix, canAdvance }: { world: World; last: string; t: T; lang: Lang; onAdvance: () => void; onFix: (id: string) => void; canAdvance: boolean }) {
  const cta = (label: string, kind: "navy" | "light" = "navy") =>
    canAdvance && (
      <button type="button" className={`${btn(kind)} mt-3 w-full`} onClick={onAdvance}>
        {label}
      </button>
    );
  const rules = RULES[world.state];

  switch (last) {
    case "start":
      return (
        <Panel icon="clock" title={t.readyTitle} body={t.readyBody}>
          {cta(t.clockIn)}
          <p className="mt-2 text-[12px] leading-4 text-muted">{t.whyLocation}</p>
        </Panel>
      );
    case "clock-in":
      return (
        <Panel icon="check" title={t.clockedIn} body={t.tasksBody}>
          <Tasks t={t} done={false} />
          {cta(t.logTasks)}
        </Panel>
      );
    case "tasks":
      return (
        <Panel icon="check" title={t.tasksDone} body={t.tasksDoneBody}>
          <Tasks t={t} done />
          {cta(t.logSeizure, "light")}
        </Panel>
      );
    case "seizure":
      return (
        <div className="space-y-3">
          <div className="rounded-[20px] bg-white p-4">
            <p className="font-semibold">{t.seizureLogged}</p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[13px]">
              {t.seizureTaps.map((x) => (
                <li key={x} className="rounded-[10px] bg-blue-soft px-2 py-1.5">
                  {x}
                </li>
              ))}
            </ul>
          </div>
          {world.triage && (
            <div className="rounded-[20px] border-2 border-navy bg-white p-4" role="alert">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.planCheck}</p>
              <p className="display mt-1 text-[24px]">{triageTitle(world.triage, lang)}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[14px]">
                {world.triage.reasons.map((r) => (
                  <li key={r.id}>{reasonText(r, lang)}</li>
                ))}
              </ul>
              <div className="mt-3 grid gap-2">
                <a href="tel:+15550100" className={`${btn("navy")} w-full`} onClick={(e) => e.preventDefault()}>
                  <Icon name="phone" className="h-4 w-4" /> {t.callDana}
                </a>
                <a href="tel:911" className={`${btn("outline")} w-full`} onClick={(e) => e.preventDefault()}>
                  {t.call911Btn}
                </a>
              </div>
              {world.calledNurseAt && <p className="mt-2 rounded-[12px] bg-ok-bg px-3 py-2 text-[13px] text-ok-ink">✓ {t.called}</p>}
              <p className="mt-3 rounded-[12px] bg-danger-bg px-3 py-2 text-[13px] leading-5 text-danger-ink">
                <span className="font-semibold">{t.call911}</span> {t.call911When(MATEO_PLAN.emergencyMinutes)}
              </p>
              <p className="mt-2 text-[12px] text-muted">{t.noAi}</p>
            </div>
          )}
          {cta(t.atTherapy, "light")}
        </div>
      );
    case "therapy":
      return (
        <Panel icon="pin" title={t.awayTitle} body={t.awayBody}>
          {cta(t.later, "light")}
        </Panel>
      );
    case "phone-died":
      return (
        <Panel icon="heart" title={t.notLost} body={t.notLostBody} tone="yellow">
          <div className="mt-3 rounded-[12px] border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] text-muted">{t.clockOut}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-[12px] font-medium text-muted">
                <Icon name="lock" className="h-3.5 w-3.5" /> {t.locked}
              </span>
            </div>
            <p className="font-medium">{t.noClockOut}</p>
            <p className="mt-1 text-[13px] leading-5 text-muted">{t.lockWhy}</p>
          </div>
          <p className="mt-3 text-[14px] font-medium">{t.when}</p>
          <p className="mt-1 rounded-[12px] border border-control bg-white px-3 py-2 text-[15px]">7:30 pm</p>
          <p className="mt-3 text-[14px] font-medium">{t.what}</p>
          <ul className="mt-1.5 space-y-1.5 text-[14px]">
            {rules.reasonCodes.map((r, i) => (
              <li key={r.code} className={`rounded-[12px] border px-3 py-2 ${i === 0 ? "border-navy bg-blue-soft font-medium" : "border-line bg-white"}`}>
                {i === 0 ? "◉" : "○"} {lang === "es" ? (REASONS_ES[r.caregiverLabel] ?? r.caregiverLabel) : r.caregiverLabel}
              </li>
            ))}
          </ul>
          {cta(t.sendFix)}
        </Panel>
      );
    case "request-fix":
      return (
        <Panel icon="clock" title={t.fixSent} body={t.fixSentBody}>
          {cta(t.addNote, "light")}
        </Panel>
      );
    case "voice":
      return (
        <div className="space-y-3">
          <div className="rounded-[20px] bg-white p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Icon name="mic" className="h-5 w-5" /> {t.youSaid}
            </p>
            <p className="mt-2 text-[14px] italic leading-5 text-muted" lang="es">
              “Hoy tuvo tres convulsiones. La más larga fue como de cuatro minutos… Se saltó la comida de las dos porque estaba dormido. Después estaba cansado, pero normal.”
            </p>
            <p className="mt-2 text-[13px] leading-5">{t.alreadyChecked}</p>
          </div>
          {cta(t.writeNote, "light")}
        </div>
      );
    case "draft": {
      const open = unsupportedCount(world.draft);
      return (
        <div>
          <p className="font-semibold">{t.checkNote}</p>
          <p className="mb-2 text-[13px] leading-5 text-muted">{t.checkNoteBody}</p>
          <AiDraftCard lines={world.draft} onFix={onFix} lang={lang} />
          <div className="mt-3 rounded-[12px] bg-white p-3 text-[13px]">
            <p className="font-medium">{t.covers}</p>
            <ul className="mt-1 space-y-0.5">
              {rules.requiredNoteFields.map((f) => (
                <li key={f}>✓ {lang === "es" ? (FIELDS_ES[f] ?? f) : f}</li>
              ))}
            </ul>
          </div>
          <details className="mt-3 rounded-[12px] bg-white p-3 text-[13px]">
            <summary className="cursor-pointer font-medium">{t.whoSees}</summary>
            <p className="mt-1.5 leading-5 text-muted">{t.whoSeesBody}</p>
          </details>
          {lang === "es" && <p className="mt-2 text-[12px] text-muted">{t.bilingual}</p>}
          {canAdvance && (
            <>
              <p className="mt-3 text-[13px] leading-5">{t.attestLine}</p>
              <button type="button" className={`${btn("navy")} mt-2 w-full`} disabled={open > 0} onClick={onAdvance} aria-describedby="sign-help">
                {t.sign}
              </button>
            </>
          )}
          <p id="sign-help" className="mt-1.5 text-center text-[12px] text-muted">
            {open > 0 ? t.fixFirst : t.signHelp}
          </p>
        </div>
      );
    }
    case "attest":
      return <Panel icon="heart" title={t.signed} body={t.signedBody} />;
    case "outcome":
      return (
        <Panel icon="user" title={t.danaReviewed} body={t.danaReviewedBody} tone="blue">
          <p className="mt-2 text-[13px] text-muted">{t.waitingFix}</p>
        </Panel>
      );
    case "approve":
      return <Panel icon="check" title={t.fixApproved} body={t.fixApprovedBody} />;
    case "accepted":
      return (
        <Panel icon="shield" title={t.verified} body={t.verifiedBody} tone="blue">
          <ul className="mt-2 space-y-1 text-[13px]">
            <li>✓ {t.p1}</li>
            <li>✓ {t.p2}</li>
            <li>✓ {t.p3}</li>
          </ul>
        </Panel>
      );
    default:
      return null;
  }
}

function Panel({ icon, title, body, tone = "white", children }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; body: string; tone?: "white" | "yellow" | "blue"; children?: React.ReactNode }) {
  const bg = { white: "bg-white", yellow: "bg-yellow", blue: "bg-blue" }[tone];
  return (
    <div className={`rounded-[20px] p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <IconDot size={36}>
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </IconDot>
        <div className="min-w-0">
          <p className="font-semibold leading-5">{title}</p>
          <p className="mt-1 text-[14px] leading-5">{body}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Tasks({ t, done }: { t: T; done: boolean }) {
  const rows: [string, "done" | "skip" | "todo"][] = [
    [t.t1, "done"],
    [t.t2, done ? "done" : "todo"],
    [t.t3, done ? "skip" : "todo"],
    [t.t4, "todo"],
  ];
  return (
    <ul className="mt-3 space-y-1.5">
      {rows.map(([label, s]) => (
        <li key={label} className="flex items-center justify-between gap-2 rounded-[12px] border border-line bg-white px-3 py-2 text-[14px]">
          <span>{label}</span>
          <span className={`text-[12px] font-medium ${s === "done" ? "text-ok-ink" : s === "skip" ? "text-navy" : "text-muted"}`}>{s === "done" ? `✓ ${t.done}` : s === "skip" ? t.skipped : t.todo}</span>
        </li>
      ))}
    </ul>
  );
}

function Inpatient({ t }: { t: T }) {
  return (
    <Panel icon="heart" title={t.paused} body={t.pausedBody} tone="yellow">
      <button type="button" disabled className={`${btn("navy")} mt-3 w-full`} aria-describedby="hold-why">
        {t.clockIn}
      </button>
      <p id="hold-why" className="mt-1.5 text-[12px] leading-4">
        {t.pausedWhy}
      </p>
      <button type="button" disabled className={`${btn("light")} mt-3 w-full`} aria-describedby="home-note">
        {t.home}
      </button>
      <p id="home-note" className="mt-1 text-center text-[12px] text-muted">
        {t.notBuilt}
      </p>
    </Panel>
  );
}

const REASONS_ES: Record<string, string> = {
  "My phone died or had no signal": "Se me apagó el teléfono o no tenía señal",
  "I forgot to clock in or out": "Se me olvidó marcar la entrada o la salida",
  "Care happened away from home": "El cuidado fue fuera de casa",
  "The time is wrong": "La hora está mal",
};

const FIELDS_ES: Record<string, string> = {
  "Tasks done or skipped, with a reason": "Tareas hechas o no, con el motivo",
  "How Mateo was today": "Cómo estuvo Mateo hoy",
  "Anything unusual": "Algo fuera de lo normal",
  "Task codes for each service": "Códigos de cada servicio (de tus tareas)",
};

const EN = {
  region: "Rosa's phone, caregiver app concept",
  app: "Caregiver app",
  concept: "concept",
  language: "Language",
  savedOnPhone: "Saved on phone",
  morning: "Good morning, Rosa",
  hi: "Hi, Rosa",
  date: { tue: "Tuesday, Oct 20", wed: "Wednesday, Oct 21", thu: "Thursday, Oct 22" },
  visitTime: "Today, 8:00 am – 8:00 pm",
  visitYesterday: "Tuesday's visit",
  visitCancelled: "Today's visit is cancelled",
  thisPeriod: "Hours this pay period",
  hoursSoFar: "25 hrs so far",
  hoursPending: "25 hrs + Tuesday (pending)",
  hoursFull: "36.5 hrs",
  payNext: "Next paycheck Friday",
  payFixBy: (d: string) => `Send your fix by ${d} so these hours count.`,
  payFixSent: "Fix sent. Tuesday's hours will be paid; the reviewed clock-out sets the final total. If that's after payroll closes, the rest comes on your next paycheck.",
  payCounted: "Tuesday's hours are in this pay period.",
  payHospital: "Hours you already worked this pay period are still paid on payday.",
  caption: "Rosa's phone · the same rules drive every view",
  readyTitle: "Ready when you are",
  readyBody: "Tap Clock in when you start caring for Mateo today.",
  clockIn: "Clock in",
  whyLocation: "Your location is saved only when you clock in and out. Medicaid asks for it on every visit.",
  clockedIn: "You're clocked in",
  tasksBody: "Mateo's plan for today. Tap each one as you go.",
  logTasks: "Log today's tasks",
  tasksDone: "Tasks logged",
  tasksDoneBody: "One feed didn't happen and you said why. If his plan says to give it later, tap when you do.",
  t1: "Morning medications",
  t2: "G-tube feed, 8:00 am",
  t3: "G-tube feed, 2:00 pm",
  t4: "Afternoon medications",
  done: "Done",
  skipped: "Not done · asleep",
  todo: "Later",
  logSeizure: "Log a seizure",
  seizureLogged: "Seizure logged, 3:14 pm",
  seizureTaps: ["About 4 minutes", "Breathing OK", "No rescue medicine", "Back to himself, tired"],
  planCheck: "Mateo's seizure plan says",
  callDana: "Call Dana, on-call nurse",
  call911Btn: "Call 911",
  called: "You talked with Dana (on call) at 3:16 pm",
  call911: "Call 911 if",
  call911When: (m: number) =>
    `a seizure lasts ${m} minutes or longer, his lips turn blue or he struggles to breathe, he doesn't wake up or respond normally after a seizure, or one seizure follows another. Give his rescue medicine when his plan says. If you're not sure, call 911.`,
  noAi: "This check uses his plan and your taps. It works offline and doesn't use AI.",
  atTherapy: "We're going to therapy",
  awayTitle: "Care away from home",
  awayBody: "You're at Mateo's therapy. It's still part of today's visit. Nothing is checked until you clock out.",
  later: "Continue",
  notLost: "Your hours aren't lost",
  notLostBody: "Tell us when you finished and why.",
  clockOut: "Clock-out",
  noClockOut: "Not recorded",
  locked: "Locked",
  lockWhy: "Clock times are saved the moment you tap, and nobody can change them, not even you. That keeps your record safe. If something's off, ask for a fix.",
  when: "When did you finish?",
  what: "What happened?",
  sendFix: "Send for review",
  fixSent: "Fix sent",
  fixSentBody: "Someone at Abby will review it, usually within a day. Your original record stays as it was.",
  addNote: "Add tonight's note",
  youSaid: "You said",
  alreadyChecked: "Mateo's seizure check already ran at 3:14 pm, on your taps. This recording only becomes your note.",
  writeNote: "Write my note from this",
  checkNote: "Check your note",
  checkNoteBody: "The app's AI wrote this from what you said and the tasks you tapped. It's your note: fix anything that isn't right before you sign.",
  covers: "Your note covers",
  whoSees: "Who sees this note?",
  whoSeesBody: "Dana (Mateo's nurse), the Abby care team, and Mateo's health plan. Your voice recording is saved with the note, and they can listen to it.",
  bilingual: "",
  attestLine: "I confirm this note is accurate and describes the care I gave Mateo today.",
  sign: "Sign my note",
  fixFirst: "Fix the yellow line first. It says something you didn't say.",
  signHelp: "After you sign, the note is locked. You can add to it later, not change it.",
  signed: "Note signed. Dana's looking at it.",
  signedBody: "Because of the seizures, Dana will look at your note tonight. You don't need to do anything else.",
  danaReviewed: "Dana reviewed this at 9:12 pm",
  danaReviewedBody: "She called you and spoke with Mateo's neurologist. His care plan stays the same for now. She'll call again tomorrow at 10 am.",
  waitingFix: "Your clock-out fix is still being reviewed.",
  fixApproved: "Fix approved",
  fixApprovedBody: "Your clock-out is now 7:30 pm. Tuesday's hours are in this pay period.",
  verified: "Care verified",
  verifiedBody: "Tuesday's visit is confirmed. This is the record Abby keeps and can show Mateo's health plan if they ask:",
  p1: "Visit times, with your fix and its reason",
  p2: "Your signed note, in your words",
  p3: "Dana's review and what happens next",
  paused: "Visits are paused",
  pausedBody: "Mateo is in the hospital. Visits stop while he's there. When he's home, Dana visits to go over any changes to his medicines, feeds and seizure plan, then visits start again.",
  pausedWhy: "Clock in is off until he's home. Hours you already worked this pay period are still paid on payday.",
  home: "Tell us he's home",
  notBuilt: "Not built in this concept",
};

const ES: T = {
  region: "Teléfono de Rosa, concepto de app para cuidadores",
  app: "App de cuidadores",
  concept: "concepto",
  language: "Idioma",
  savedOnPhone: "Guardado en el teléfono",
  morning: "Buenos días, Rosa",
  hi: "Hola, Rosa",
  date: { tue: "Martes 20 de oct.", wed: "Miércoles 21 de oct.", thu: "Jueves 22 de oct." },
  visitTime: "Hoy, 8:00 am – 8:00 pm",
  visitYesterday: "La visita del martes",
  visitCancelled: "La visita de hoy está cancelada",
  thisPeriod: "Horas de este periodo de pago",
  hoursSoFar: "25 horas hasta ahora",
  hoursPending: "25 horas + martes (pendiente)",
  hoursFull: "36.5 horas",
  payNext: "Próximo pago el viernes",
  payFixBy: (d: string) => `Envía tu corrección antes del ${d} para que cuenten estas horas.`,
  payFixSent: "Corrección enviada. Las horas del martes se pagan; la hora de salida revisada fija el total. Si se revisa después del cierre de nómina, el resto llega en tu siguiente pago.",
  payCounted: "Las horas del martes están en este periodo de pago.",
  payHospital: "Las horas que ya trabajaste en este periodo se pagan igual el día de pago.",
  caption: "Teléfono de Rosa · las mismas reglas en todas las vistas",
  readyTitle: "Cuando estés lista",
  readyBody: "Toca Marcar entrada cuando empieces a cuidar a Mateo hoy.",
  clockIn: "Marcar entrada",
  whyLocation: "Tu ubicación solo se guarda al marcar entrada y salida. Medicaid la pide en cada visita.",
  clockedIn: "Ya marcaste entrada",
  tasksBody: "El plan de Mateo para hoy. Toca cada tarea al hacerla.",
  logTasks: "Anotar las tareas de hoy",
  tasksDone: "Tareas anotadas",
  tasksDoneBody: "Una comida no se dio y dijiste por qué. Si su plan dice que se la des más tarde, toca cuando lo hagas.",
  t1: "Medicinas de la mañana",
  t2: "Alimentación por sonda, 8:00 am",
  t3: "Alimentación por sonda, 2:00 pm",
  t4: "Medicinas de la tarde",
  done: "Hecho",
  skipped: "No se hizo · estaba dormido",
  todo: "Más tarde",
  logSeizure: "Anotar una convulsión",
  seizureLogged: "Convulsión anotada, 3:14 pm",
  seizureTaps: ["Unos 4 minutos", "Respira bien", "Sin medicina de rescate", "Volvió a ser él, cansado"],
  planCheck: "El plan de convulsiones de Mateo dice",
  callDana: "Llamar a Dana, enfermera de guardia",
  call911Btn: "Llamar al 911",
  called: "Hablaste con Dana (de guardia) a las 3:16 pm",
  call911: "Llama al 911 si",
  call911When: (m: number) =>
    `una convulsión dura ${m} minutos o más, se le ponen los labios morados o le cuesta respirar, no despierta o no responde como siempre después de una convulsión, o tiene una convulsión tras otra. Dale su medicina de rescate cuando lo diga su plan. Si tienes dudas, llama al 911.`,
  noAi: "Esta revisión usa su plan y lo que tocaste. Funciona sin internet y no usa IA.",
  atTherapy: "Vamos a terapia",
  awayTitle: "Cuidado fuera de casa",
  awayBody: "Estás en la terapia de Mateo. Sigue siendo parte de la visita de hoy. No se revisa nada hasta que marques la salida.",
  later: "Continuar",
  notLost: "Tus horas no se pierden",
  notLostBody: "Dinos a qué hora terminaste y por qué.",
  clockOut: "Salida",
  noClockOut: "No se registró",
  locked: "Bloqueado",
  lockWhy: "La hora se guarda en cuanto tocas, y nadie la puede cambiar, ni tú. Así tu registro está protegido. Si algo está mal, pide una corrección.",
  when: "¿A qué hora terminaste?",
  what: "¿Qué pasó?",
  sendFix: "Enviar para revisión",
  fixSent: "Corrección enviada",
  fixSentBody: "Alguien de Abby la revisará, normalmente en un día. Tu registro original no cambia.",
  addNote: "Agregar la nota de hoy",
  youSaid: "Dijiste",
  alreadyChecked: "La revisión de convulsiones de Mateo ya se hizo a las 3:14 pm, con lo que tocaste. Esta grabación solo se convierte en tu nota.",
  writeNote: "Escribir mi nota con esto",
  checkNote: "Revisa tu nota",
  checkNoteBody: "La IA de la app la escribió con lo que dijiste y las tareas que marcaste. Es tu nota: corrige lo que no esté bien antes de firmar.",
  covers: "Tu nota incluye",
  whoSees: "¿Quién ve esta nota?",
  whoSeesBody: "Dana (la enfermera de Mateo), el equipo de Abby y el plan de salud de Mateo. Tu grabación se guarda con la nota y la pueden escuchar.",
  bilingual: "Dana lee esta nota en inglés. Las dos versiones quedan guardadas; la que firmas es la tuya.",
  attestLine: "Confirmo que esta nota es correcta y describe el cuidado que le di a Mateo hoy.",
  sign: "Firmar mi nota",
  fixFirst: "Primero corrige la línea amarilla. Dice algo que tú no dijiste.",
  signHelp: "Al firmar, la nota queda cerrada. Puedes agregar algo después, pero no cambiarla.",
  signed: "Nota firmada. Dana la está revisando.",
  signedBody: "Por las convulsiones, Dana revisará tu nota esta noche. No tienes que hacer nada más.",
  danaReviewed: "Dana revisó esto a las 9:12 pm",
  danaReviewedBody: "Te llamó y habló con el neurólogo de Mateo. Su plan de cuidado sigue igual por ahora. Te llamará mañana a las 10 am.",
  waitingFix: "Todavía están revisando tu corrección de la hora de salida.",
  fixApproved: "Corrección aprobada",
  fixApprovedBody: "Tu salida ahora es a las 7:30 pm. Las horas del martes están en este periodo de pago.",
  verified: "Cuidado verificado",
  verifiedBody: "La visita del martes está confirmada. Este es el registro que Abby guarda y puede mostrar al plan de salud de Mateo si lo pide:",
  p1: "Horas de la visita, con tu corrección y el motivo",
  p2: "Tu nota firmada, con tus palabras",
  p3: "La revisión de Dana y lo que sigue",
  paused: "Las visitas están en pausa",
  pausedBody: "Mateo está en el hospital. Las visitas se detienen mientras esté allí. Cuando vuelva a casa, Dana te visitará para revisar cambios en sus medicinas, su alimentación y su plan de convulsiones, y luego las visitas vuelven.",
  pausedWhy: "El botón Marcar entrada está desactivado hasta que vuelva a casa. Las horas que ya trabajaste en este periodo se pagan igual el día de pago.",
  home: "Avisar que ya está en casa",
  notBuilt: "No está hecho en este concepto",
};
