import { STATUS, type Status, type Tone } from "@/lib/machine";

export type Audience = "caregiver" | "clinician" | "operator";

const TONES: Record<Tone, string> = {
  neutral: "bg-soft text-navy",
  info: "bg-blue text-navy",
  progress: "bg-blue-soft text-navy",
  attention: "bg-yellow text-navy",
  success: "bg-ok-bg text-ok-ink",
  danger: "bg-danger-bg text-danger-ink",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-control",
  info: "bg-navy",
  progress: "bg-navy",
  attention: "bg-gold",
  success: "bg-ok",
  danger: "bg-danger",
};

/** Caregiver labels in Spanish. Clinician and operator views are English-only in this concept. */
const CAREGIVER_ES: Partial<Record<Status, string>> = {
  scheduled: "Próxima visita",
  clocked_in: "Ya marcaste entrada",
  clocked_out: "Salida marcada",
  confirmed: "Horas contadas",
  needs_fix: "Falta un detalle",
  correction_requested: "Corrección enviada",
  correction_approved: "Corrección aprobada",
  sent: "Horas contadas",
  accepted: "Horas contadas",
  rejected: "Estamos arreglando algo",
  cancelled: "No hace falta hoy",
  on_hold: "Visitas en pausa",
  care_verified: "Cuidado verificado",
};

/** One canonical status, three audience labels. The code is for operators, exports and engineering. */
export function StatusChip({ status, audience, showCode = false, lang = "en" }: { status: Status; audience: Audience; showCode?: boolean; lang?: "en" | "es" }) {
  const v = STATUS[status];
  const label = (audience === "caregiver" && lang === "es" && CAREGIVER_ES[status]) || v[audience];
  if (!label) return null;
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium leading-4 ${TONES[v.tone]}`}>
      <span className={`h-1.5 w-1.5 flex-none rounded-full ${DOTS[v.tone]}`} aria-hidden="true" />
      <span className="truncate">{label}</span>
      {showCode && <code className="font-mono text-[12px]">{v.code}</code>}
    </span>
  );
}
