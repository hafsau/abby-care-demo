/*
 * The AI drafts the visit note from the caregiver's own words and taps.
 * Every line must trace to a source. A line with no source blocks signing
 * until the caregiver edits or removes it. The AI never adds tasks, never
 * diagnoses, and never touches clock times or billing data.
 */

export type Utterance = { id: string; said: string; meaning: string; at: string };

export type TaskTap = { id: string; task: string; at: string; done: boolean; reason?: string };

export type DraftLine = {
  id: string;
  text: string;
  sources: string[];
  /** Set when the AI's wording isn't supported by any source. */
  unsupported?: { why: string; suggestion: string };
  editedByCaregiver?: boolean;
};

/** Rosa's voice note, in Spanish, recorded at 8:40 pm. */
export const UTTERANCES: Utterance[] = [
  { id: "u1", said: "Hoy tuvo tres convulsiones.", meaning: "He had three seizures today.", at: "20:40" },
  { id: "u2", said: "La más larga fue como de cuatro minutos, como a las tres y diez.", meaning: "The longest was about four minutes, around 3:10.", at: "20:40" },
  { id: "u3", said: "Se saltó la comida de las dos porque estaba dormido.", meaning: "He skipped the 2 o'clock feed because he was asleep.", at: "20:41" },
  { id: "u4", said: "Después estaba cansado, pero normal.", meaning: "Afterwards he was tired, but normal.", at: "20:41" },
];

export const TAPS: TaskTap[] = [
  { id: "t1", task: "Morning medications", at: "08:05", done: true },
  { id: "t2", task: "G-tube feed, 8:00", at: "08:20", done: true },
  { id: "t3", task: "G-tube feed, 2:00", at: "14:10", done: false, reason: "Asleep" },
  { id: "t4", task: "Afternoon medications", at: "16:45", done: true },
];

export const SOURCES: Record<string, { label: string; detail: string }> = {
  ...Object.fromEntries(UTTERANCES.map((u) => [u.id, { label: `Voice, ${u.at}`, detail: `“${u.said}” (${u.meaning})` }])),
  ...Object.fromEntries(TAPS.map((t) => [t.id, { label: `Tap, ${t.at}`, detail: `${t.task}: ${t.done ? "done" : `not done, ${t.reason?.toLowerCase()}`}` }])),
};

export function initialDraft(): DraftLine[] {
  return [
    { id: "l1", text: "Mateo had 3 seizures today. The longest lasted about 4 minutes, around 3:10 pm.", sources: ["u1", "u2"] },
    { id: "l2", text: "Morning and afternoon medications were given.", sources: ["t1", "t4"] },
    {
      id: "l3",
      text: "Mateo refused his 2:00 pm G-tube feed.",
      sources: [],
      unsupported: {
        why: "You said he skipped it because he was asleep. “Refused” isn't what you said.",
        suggestion: "The 2:00 pm G-tube feed was skipped because Mateo was asleep.",
      },
    },
    { id: "l4", text: "Afterwards he was tired but otherwise like his usual self.", sources: ["u4"] },
  ];
}

export function unsupportedCount(lines: DraftLine[]) {
  return lines.filter((l) => l.unsupported && !l.editedByCaregiver).length;
}

/** The caregiver's fix: her wording replaces the AI's, and the line now cites her words. */
export function fixLine(lines: DraftLine[], id: string, text?: string): DraftLine[] {
  return lines.map((l) =>
    l.id === id && l.unsupported ? { ...l, text: text ?? l.unsupported.suggestion, sources: ["u3", "t3"], editedByCaregiver: true } : l,
  );
}
