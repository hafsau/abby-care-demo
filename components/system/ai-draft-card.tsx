"use client";

import { SOURCES, type DraftLine } from "@/lib/draft";
import { btn, Icon } from "../ui";

/**
 * The AI's draft, line by line, each tied to what the caregiver said or
 * tapped. A line with no source is marked and must be fixed before signing.
 * Read-only mode shows the signed note with its edit history.
 */
export function AiDraftCard({
  lines,
  onFix,
  readOnly = false,
  original,
  lang = "en",
}: {
  lines: DraftLine[];
  onFix?: (id: string) => void;
  readOnly?: boolean;
  /** AI wording the caregiver replaced, by line id, shown as a diff. */
  original?: Record<string, string>;
  lang?: "en" | "es";
}) {
  const t = lang === "es" ? ES : EN;
  return (
    <ol className="space-y-2.5">
      {lines.map((l) => {
        const open = l.unsupported && !l.editedByCaregiver;
        return (
          <li key={l.id} className={`rounded-[12px] border p-3 ${open ? "border-gold bg-yellow" : "border-line bg-white"}`}>
            <p className="text-[15px] leading-6">{l.text}</p>
            {l.editedByCaregiver && original?.[l.id] && (
              <p className="mt-1 text-[13px] leading-5 text-muted">
                <span className="font-medium">{t.aiWrote}</span> <del>{original[l.id]}</del>
              </p>
            )}
            {open ? (
              <div className="mt-2">
                <p className="flex items-start gap-1.5 text-[13px] leading-5">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{lang === "es" ? "Dijiste que se la saltó porque estaba dormido. Tú no dijiste “se negó”." : l.unsupported!.why}</span>
                </p>
                {!readOnly && onFix && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button type="button" className={btn("navy", "sm")} onClick={() => onFix(l.id)}>
                      {t.useWords}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t.from}>
                {l.sources.map((s) => (
                  <li key={s} className="rounded-full bg-blue-soft px-2 py-0.5 text-[12px] text-navy" title={SOURCES[s]?.detail}>
                    {SOURCES[s]?.label}
                    {l.editedByCaregiver && <span className="sr-only">, {t.editedSr}</span>}
                  </li>
                ))}
                {l.editedByCaregiver && <li className="rounded-full bg-ok-bg px-2 py-0.5 text-[12px] text-ok-ink">{t.edited}</li>}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const EN = { aiWrote: "AI wrote:", useWords: "Use what I said", from: "Comes from", edited: "Your words", editedSr: "edited by the caregiver" };
const ES = { aiWrote: "La IA escribió:", useWords: "Usar lo que dije", from: "Viene de", edited: "Tus palabras", editedSr: "editado por la cuidadora" };
