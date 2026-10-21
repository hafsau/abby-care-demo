"use client";

import { ORIGINAL, sourceDetail, sourceLabel, type DraftLine, type Lang } from "@/lib/draft";
import { btn, Icon } from "../ui";

/**
 * The AI's draft, line by line, each tied to what the caregiver said or
 * tapped, shown in her language. A line with no source is marked and must be
 * fixed before signing. Read-only mode shows the signed note with the AI's
 * original wording struck through where she changed it.
 */
export function AiDraftCard({ lines, onFix, readOnly = false, lang = "en" }: { lines: DraftLine[]; onFix?: (id: string) => void; readOnly?: boolean; lang?: Lang }) {
  const t = lang === "es" ? ES : EN;
  return (
    <ol className="space-y-2.5">
      {lines.map((l) => {
        const open = l.unsupported && !l.editedByCaregiver;
        const original = ORIGINAL[l.id]?.[lang];
        return (
          <li key={l.id} className={`rounded-[12px] border p-3 ${open ? "border-gold bg-yellow" : "border-line bg-white"}`}>
            <p className="text-[15px] leading-6">{lang === "es" ? l.textEs : l.text}</p>
            {l.editedByCaregiver && original && (
              <p className="mt-1 text-[13px] leading-5 text-muted">
                <span className="font-medium">{t.aiWrote}</span> <del>{original}</del>
              </p>
            )}
            {open ? (
              <div className="mt-2">
                <p className="flex items-start gap-1.5 text-[13px] leading-5">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{lang === "es" ? l.unsupported!.whyEs : l.unsupported!.why}</span>
                </p>
                {!readOnly && onFix && (
                  <button type="button" className={`${btn("navy", "sm")} mt-2.5`} onClick={() => onFix(l.id)}>
                    {t.useWords}
                  </button>
                )}
              </div>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t.from}>
                {l.sources.map((s) => (
                  <li key={s} className="rounded-full bg-blue-soft px-2 py-0.5 text-[12px] text-navy" title={sourceDetail(s)}>
                    {sourceLabel(s, lang)}
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

const EN = { aiWrote: "AI wrote:", useWords: "Use what I said", from: "Comes from", edited: "Changed by Rosa" };
const ES = { aiWrote: "La IA escribió:", useWords: "Usar lo que dije", from: "Viene de", edited: "Cambiado por Rosa" };
