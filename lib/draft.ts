/*
 * The AI drafts the visit note from the caregiver's own words and taps,
 * in her language and in English for the clinician. Every line must trace
 * to a source. A line with no source blocks signing until she fixes it.
 * The AI never adds tasks, never diagnoses, and never touches clock times
 * or billing data.
 */

export type Lang = "en" | "es";

export type Utterance = { id: string; said: string; meaning: string; at: string };

export type TaskTap = { id: string; task: string; at: string; done: boolean; reason?: string };

export type DraftLine = {
  id: string;
  text: string;
  textEs: string;
  sources: string[];
  /** Set when the AI's wording isn't supported by any source. */
  unsupported?: { why: string; whyEs: string; suggestion: string; suggestionEs: string };
  editedByCaregiver?: boolean;
};

/** Rosa's voice note, in Spanish, recorded at 8:40 pm. */
export const UTTERANCES: Utterance[] = [
  { id: "u1", said: "Hoy tuvo tres convulsiones.", meaning: "He had three seizures today.", at: "8:40 pm" },
  { id: "u2", said: "La más larga fue como de cuatro minutos, como a las tres y diez.", meaning: "The longest was about four minutes, around 3:10.", at: "8:40 pm" },
  { id: "u3", said: "Se saltó la comida de las dos porque estaba dormido.", meaning: "He skipped the 2 o'clock feed because he was asleep.", at: "8:41 pm" },
  { id: "u4", said: "Después estaba cansado, pero normal.", meaning: "Afterwards he was tired, but normal.", at: "8:41 pm" },
];

export const TAPS: TaskTap[] = [
  { id: "t1", task: "Morning medications", at: "8:05 am", done: true },
  { id: "t2", task: "G-tube feed, 8:00 am", at: "8:20 am", done: true },
  { id: "t3", task: "G-tube feed, 2:00 pm", at: "2:10 pm", done: false, reason: "Asleep" },
  { id: "s1", task: "Seizure log", at: "3:14 pm", done: true },
  { id: "t4", task: "Afternoon medications", at: "4:45 pm", done: true },
];

export function sourceLabel(id: string, lang: Lang) {
  const u = UTTERANCES.find((x) => x.id === id);
  if (u) return `${lang === "es" ? "Voz" : "Voice"}, ${u.at}`;
  const t = TAPS.find((x) => x.id === id);
  if (t) return `${lang === "es" ? (t.id === "s1" ? "Convulsión" : "Tarea") : t.id === "s1" ? "Seizure log" : "Tap"}, ${t.at}`;
  return id;
}

export function sourceDetail(id: string) {
  const u = UTTERANCES.find((x) => x.id === id);
  if (u) return `“${u.said}” (${u.meaning})`;
  const t = TAPS.find((x) => x.id === id);
  return t ? `${t.task}: ${t.done ? "logged" : `not done, ${t.reason?.toLowerCase()}`}` : id;
}

export function initialDraft(): DraftLine[] {
  return [
    {
      id: "l1",
      text: "Mateo had 3 seizures today. The longest lasted about 4 minutes, around 3:10 pm.",
      textEs: "Mateo tuvo 3 convulsiones hoy. La más larga duró unos 4 minutos, como a las 3:10 pm.",
      sources: ["u1", "u2", "s1"],
    },
    { id: "l2", text: "Morning and afternoon medications were given.", textEs: "Se le dieron las medicinas de la mañana y de la tarde.", sources: ["t1", "t4"] },
    {
      id: "l3",
      text: "Mateo refused his 2:00 pm G-tube feed.",
      textEs: "Mateo se negó a la alimentación por sonda de las 2:00 pm.",
      sources: [],
      unsupported: {
        why: "You said he skipped it because he was asleep. “Refused” isn't what you said.",
        whyEs: "Dijiste que se la saltó porque estaba dormido. Tú no dijiste “se negó”.",
        suggestion: "The 2:00 pm G-tube feed was skipped because Mateo was asleep.",
        suggestionEs: "No se le dio la alimentación por sonda de las 2:00 pm porque Mateo estaba dormido.",
      },
    },
    { id: "l4", text: "Afterwards he was tired, but normal.", textEs: "Después estaba cansado, pero normal.", sources: ["u4"] },
  ];
}

/** The AI's original wording for lines a caregiver has replaced. */
export const ORIGINAL: Record<string, { en: string; es: string }> = {
  l3: { en: "Mateo refused his 2:00 pm G-tube feed.", es: "Mateo se negó a la alimentación por sonda de las 2:00 pm." },
};

export function unsupportedCount(lines: DraftLine[]) {
  return lines.filter((l) => l.unsupported && !l.editedByCaregiver).length;
}

/** The caregiver's fix: her wording replaces the AI's, and the line now cites her words. */
export function fixLine(lines: DraftLine[], id: string): DraftLine[] {
  return lines.map((l) =>
    l.id === id && l.unsupported ? { ...l, text: l.unsupported.suggestion, textEs: l.unsupported.suggestionEs, sources: ["u3", "t3"], editedByCaregiver: true } : l,
  );
}
