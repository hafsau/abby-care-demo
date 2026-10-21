"use client";

import { unsupportedCount } from "@/lib/draft";
import { careVerified } from "@/lib/machine";
import { RULES } from "@/lib/rules";
import type { World } from "@/lib/scenario";
import { AiDraftCard } from "../system/ai-draft-card";
import { StatusChip } from "../system/status-chip";
import { btn, Icon, IconDot } from "../ui";

export type Lang = "en" | "es";

/**
 * Rosa's phone. One next thing at a time, taps before typing, plain words,
 * Spanish one tap away. EVV is framed around her pay, never around fraud.
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
  /** Id of the last step applied, or "start". */
  last: string;
  lang: Lang;
  onLang: (l: Lang) => void;
  onAdvance: () => void;
  onFix: (id: string) => void;
  /** Whether the next step is Rosa's to take. */
  canAdvance: boolean;
}) {
  const t = lang === "es" ? ES : EN;
  const rules = RULES[world.state];
  const verified = careVerified(world);

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="rounded-[44px] bg-navy p-2.5 shadow-[0_20px_50px_-20px_rgba(8,29,76,0.45)]">
        <div className="flex h-[700px] flex-col overflow-hidden rounded-[36px] bg-cream" role="region" aria-label={t.region}>
          <div className="flex items-center justify-between px-5 pb-2 pt-4 text-[13px]">
            <span className="font-medium">AbbyAid</span>
            <div className="flex items-center gap-2">
              {world.offlineSaved && last === "voice" && (
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
            <p className="mt-1 text-[14px] text-muted">{t.date}</p>

            <div className="mt-3 rounded-[20px] bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-blue text-[18px]" aria-hidden="true">
                  M
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Mateo</p>
                  <p className="text-[13px] text-muted">{t.visitTime}</p>
                </div>
              </div>
              <div className="mt-2">
                <StatusChip status={world.inpatient ? "on_hold" : verified ? "care_verified" : world.evv} audience="caregiver" lang={lang} />
              </div>
            </div>

            <div className="mt-3">{world.inpatient ? <Inpatient t={t} /> : <Screen world={world} last={last} t={t} lang={lang} onAdvance={onAdvance} onFix={onFix} canAdvance={canAdvance} />}</div>
          </div>

          <div className="border-t border-line bg-white px-4 py-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">{t.thisWeek}</span>
              <span className="font-semibold">{world.evv === "needs_fix" ? t.hoursPending : t.hours}</span>
            </div>
            <p className="mt-0.5 text-muted">
              {world.evv === "needs_fix" || world.evv === "correction_requested"
                ? t.payWait(rules.correctionWindowDays)
                : verified
                  ? t.payCounted
                  : t.payNext}
            </p>
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

  switch (last) {
    case "start":
      return (
        <Panel icon="clock" title={t.readyTitle} body={t.readyBody}>
          {cta(t.clockIn)}
          <p className="mt-2 text-[12px] text-muted">{t.whyLocation}</p>
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
          {cta(t.atTherapy, "light")}
        </Panel>
      );
    case "community":
      return (
        <Panel icon="pin" title={t.awayTitle} body={t.awayBody}>
          <p className="mt-2 rounded-[12px] bg-ok-bg px-3 py-2 text-[13px] text-ok-ink">✓ {t.awayReason}</p>
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
            {RULES[world.state].reasonCodes.slice(0, 3).map((r, i) => (
              <li key={r.code} className={`rounded-[12px] border px-3 py-2 ${i === 0 ? "border-navy bg-blue-soft font-medium" : "border-line bg-white"}`}>
                {i === 0 ? "◉" : "○"} {lang === "es" ? REASONS_ES[r.caregiverLabel] ?? r.caregiverLabel : r.caregiverLabel}
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
            <p className="mt-2 text-[14px] italic leading-5 text-muted">
              “Hoy tuvo tres convulsiones. La más larga fue como de cuatro minutos… Se saltó la comida de las dos porque estaba dormido. Después estaba cansado, pero normal.”
            </p>
          </div>
          {world.triage && (
            <div className="rounded-[20px] border-2 border-navy bg-white p-4" role="alert">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.planCheck}</p>
              <p className="display mt-1 text-[24px]">{t.callNurse}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[14px]">
                <li>{t.r1}</li>
                <li>{t.r2}</li>
              </ul>
              <p className="mt-2 rounded-[12px] bg-ok-bg px-3 py-2 text-[13px] text-ok-ink">✓ {t.called}</p>
              <p className="mt-3 rounded-[12px] bg-danger-bg px-3 py-2 text-[13px] leading-5 text-danger-ink">
                <span className="font-semibold">{t.call911}</span> {t.call911When}
              </p>
            </div>
          )}
          {cta(t.writeNote, "light")}
        </div>
      );
    case "draft": {
      const open = unsupportedCount(world.draft);
      return (
        <div>
          <p className="font-semibold">{t.checkNote}</p>
          <p className="mb-2 text-[13px] text-muted">{t.checkNoteBody}</p>
          <AiDraftCard lines={world.draft} onFix={onFix} lang={lang} original={{ l3: "Mateo refused his 2:00 pm G-tube feed." }} />
          <details className="mt-3 rounded-[12px] bg-white p-3 text-[13px]">
            <summary className="cursor-pointer font-medium">{t.whoSees}</summary>
            <p className="mt-1.5 leading-5 text-muted">{t.whoSeesBody}</p>
          </details>
          {canAdvance && (
            <button type="button" className={`${btn("navy")} mt-3 w-full`} disabled={open > 0} onClick={onAdvance} aria-describedby="sign-help">
              {t.sign}
            </button>
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
    [t.t1, done ? "done" : "done"],
    [t.t2, done ? "done" : "todo"],
    [t.t3, done ? "skip" : "todo"],
    [t.t4, done ? "done" : "todo"],
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
      <button type="button" className={`${btn("light")} mt-3 w-full`}>
        {t.home}
      </button>
    </Panel>
  );
}

const REASONS_ES: Record<string, string> = {
  "My phone died or had no signal": "Se me apagó el teléfono o no tenía señal",
  "I forgot to clock in or out": "Se me olvidó marcar la entrada o la salida",
  "Care happened away from home": "El cuidado fue fuera de casa",
  "The time is wrong": "La hora está mal",
};

const EN = {
  region: "Rosa's phone, AbbyAid caregiver app",
  language: "Language",
  savedOnPhone: "Saved on phone",
  morning: "Good morning, Rosa",
  hi: "Hi, Rosa",
  date: "Tuesday, Oct 20",
  visitTime: "Today, 8:00 am – 8:00 pm",
  thisWeek: "Hours this pay period",
  hours: "36.5 hrs",
  hoursPending: "25 hrs + today",
  payNext: "Next paycheck Friday",
  payWait: (d: number) => `Today's hours count once your fix is reviewed. You have ${d} days.`,
  payCounted: "Today's hours count toward Friday's paycheck.",
  caption: "Rosa's phone · the same rules drive every view",
  readyTitle: "Ready when you are",
  readyBody: "Tap Clock in when you start caring for Mateo today.",
  clockIn: "Clock in",
  whyLocation: "We only check location when you clock in and out. It's how Medicaid confirms your hours, so you get paid for them.",
  clockedIn: "You're clocked in",
  tasksBody: "Mateo's plan for today. Tap each one as you go.",
  logTasks: "Log today's tasks",
  tasksDone: "Tasks logged",
  tasksDoneBody: "One feed didn't happen. You said why, so nobody has to ask.",
  t1: "Morning medications",
  t2: "G-tube feed, 8:00",
  t3: "G-tube feed, 2:00",
  t4: "Afternoon medications",
  done: "Done",
  skipped: "Not done · asleep",
  todo: "To do",
  atTherapy: "We're at therapy",
  awayTitle: "Care away from home",
  awayBody: "You're at Mateo's therapy appointment. That's still part of today's visit.",
  awayReason: "Noted: care happened away from home",
  later: "Continue",
  notLost: "Your hours aren't lost",
  notLostBody: "Your phone was off when you finished, so we didn't get a clock-out. Tell us when you stopped and why.",
  clockOut: "Clock-out",
  noClockOut: "Not recorded",
  locked: "Locked",
  lockWhy: "Clock times are recorded the moment you tap, so nobody edits them, including you. Ask for a fix and someone else reviews it.",
  when: "When did you finish?",
  what: "What happened?",
  sendFix: "Send for review",
  fixSent: "Fix sent",
  fixSentBody: "Someone at Abby will review it, usually within a day. Your original record stays as it was.",
  addNote: "Add tonight's note",
  youSaid: "You said",
  planCheck: "Mateo's seizure plan says",
  callNurse: "Call the on-call nurse",
  r1: "3 seizures today. He usually has 0 to 1.",
  r2: "The longest was about 4 minutes. Usually under 1.",
  called: "You called at 8:41 pm",
  call911: "Call 911 if",
  call911When: "a seizure lasts 5 minutes, he has trouble breathing, or he isn't back to himself.",
  writeNote: "Write my note from this",
  checkNote: "Check your note",
  checkNoteBody: "We wrote this from what you said and tapped. It's your note: change anything that isn't right.",
  whoSees: "Who sees this note?",
  whoSeesBody: "Dana, Mateo's nurse, and the people who confirm his care for Medicaid. Your voice recording stays with your note.",
  sign: "Sign my note",
  fixFirst: "Fix the yellow line first. It says something you didn't say.",
  signHelp: "After you sign, the note is locked. You can add to it later, not change it.",
  signed: "Note signed. Dana's looking at it.",
  signedBody: "Because of the seizures, Dana will review your note tonight.",
  danaReviewed: "Dana reviewed this at 9:12 pm",
  danaReviewedBody: "She called you. The plan stays the same, and she'll call again tomorrow at 10 am.",
  waitingFix: "Your clock-out fix is still being reviewed.",
  fixApproved: "Fix approved",
  fixApprovedBody: "Your clock-out is now 7:30 pm. Today's hours count toward Friday's paycheck.",
  verified: "Care verified",
  verifiedBody: "Tuesday's visit is confirmed. This is the same record Mateo's health plan sees:",
  p1: "Visit times, with your fix and its reason",
  p2: "Your signed note, in your words",
  p3: "Dana's review and what happens next",
  paused: "Visits are paused",
  pausedBody: "Mateo is in the hospital. Visits stop while he's there and start again after Dana checks in with you at home.",
  pausedWhy: "Clock in is off while Mateo is in the hospital, so nobody is asked to prove a visit that couldn't happen.",
  home: "Tell us when he's home",
};

const ES: T = {
  region: "Teléfono de Rosa, app AbbyAid para cuidadores",
  language: "Idioma",
  savedOnPhone: "Guardado en el teléfono",
  morning: "Buenos días, Rosa",
  hi: "Hola, Rosa",
  date: "Martes, 20 de oct.",
  visitTime: "Hoy, 8:00 am – 8:00 pm",
  thisWeek: "Horas de este periodo de pago",
  hours: "36.5 hrs",
  hoursPending: "25 hrs + hoy",
  payNext: "Próximo pago el viernes",
  payWait: (d: number) => `Las horas de hoy cuentan cuando revisen tu corrección. Tienes ${d} días.`,
  payCounted: "Las horas de hoy cuentan para el pago del viernes.",
  caption: "Teléfono de Rosa · las mismas reglas en todas las vistas",
  readyTitle: "Cuando estés lista",
  readyBody: "Toca Marcar entrada cuando empieces a cuidar a Mateo hoy.",
  clockIn: "Marcar entrada",
  whyLocation: "Solo revisamos la ubicación al marcar entrada y salida. Así Medicaid confirma tus horas y te las pagan.",
  clockedIn: "Ya marcaste entrada",
  tasksBody: "El plan de Mateo para hoy. Toca cada tarea al hacerla.",
  logTasks: "Anotar las tareas de hoy",
  tasksDone: "Tareas anotadas",
  tasksDoneBody: "Una comida no se dio. Dijiste por qué, así nadie tiene que preguntar.",
  t1: "Medicinas de la mañana",
  t2: "Alimentación por sonda, 8:00",
  t3: "Alimentación por sonda, 2:00",
  t4: "Medicinas de la tarde",
  done: "Hecho",
  skipped: "No se hizo · dormido",
  todo: "Pendiente",
  atTherapy: "Estamos en terapia",
  awayTitle: "Cuidado fuera de casa",
  awayBody: "Estás en la cita de terapia de Mateo. Sigue siendo parte de la visita de hoy.",
  awayReason: "Anotado: el cuidado fue fuera de casa",
  later: "Continuar",
  notLost: "Tus horas no se pierden",
  notLostBody: "Tu teléfono estaba apagado cuando terminaste, así que no se marcó la salida. Dinos a qué hora paraste y por qué.",
  clockOut: "Salida",
  noClockOut: "No se registró",
  locked: "Bloqueado",
  lockWhy: "La hora se guarda al tocar, así que nadie la edita, ni tú. Pide una corrección y otra persona la revisa.",
  when: "¿A qué hora terminaste?",
  what: "¿Qué pasó?",
  sendFix: "Enviar para revisión",
  fixSent: "Corrección enviada",
  fixSentBody: "Alguien de Abby la revisará, normalmente en un día. Tu registro original no cambia.",
  addNote: "Agregar la nota de hoy",
  youSaid: "Dijiste",
  planCheck: "El plan de convulsiones de Mateo dice",
  callNurse: "Llama a la enfermera de guardia",
  r1: "3 convulsiones hoy. Normalmente tiene de 0 a 1.",
  r2: "La más larga fue de unos 4 minutos. Normalmente menos de 1.",
  called: "Llamaste a las 8:41 pm",
  call911: "Llama al 911 si",
  call911When: "una convulsión dura 5 minutos, le cuesta respirar o no vuelve a estar como siempre.",
  writeNote: "Escribir mi nota con esto",
  checkNote: "Revisa tu nota",
  checkNoteBody: "La escribimos con lo que dijiste y tocaste. Es tu nota: cambia lo que no esté bien.",
  whoSees: "¿Quién ve esta nota?",
  whoSeesBody: "Dana, la enfermera de Mateo, y las personas que confirman su cuidado para Medicaid. Tu grabación queda con tu nota.",
  sign: "Firmar mi nota",
  fixFirst: "Primero corrige la línea amarilla. Dice algo que tú no dijiste.",
  signHelp: "Al firmar, la nota queda cerrada. Puedes agregar algo después, pero no cambiarla.",
  signed: "Nota firmada. Dana la está revisando.",
  signedBody: "Por las convulsiones, Dana revisará tu nota esta noche.",
  danaReviewed: "Dana revisó esto a las 9:12 pm",
  danaReviewedBody: "Te llamó. El plan sigue igual y te llamará mañana a las 10 am.",
  waitingFix: "Todavía están revisando tu corrección de salida.",
  fixApproved: "Corrección aprobada",
  fixApprovedBody: "Tu salida ahora es a las 7:30 pm. Las horas de hoy cuentan para el pago del viernes.",
  verified: "Cuidado verificado",
  verifiedBody: "La visita del martes está confirmada. Es el mismo registro que ve el plan de salud de Mateo:",
  p1: "Horas de la visita, con tu corrección y el motivo",
  p2: "Tu nota firmada, con tus palabras",
  p3: "La revisión de Dana y lo que sigue",
  paused: "Las visitas están en pausa",
  pausedBody: "Mateo está en el hospital. Las visitas se detienen mientras esté allí y vuelven después de que Dana te visite en casa.",
  pausedWhy: "Marcar entrada está apagado mientras Mateo está en el hospital, para que nadie tenga que probar una visita que no podía pasar.",
  home: "Avísanos cuando esté en casa",
};
