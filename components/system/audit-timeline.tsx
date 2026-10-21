import type { AuditEntry } from "@/lib/audit";

const ACTOR: Record<AuditEntry["actor"], string> = { caregiver: "Caregiver", clinician: "Clinician", operator: "Operations", compliance: "Compliance", system: "System" };

/** Append-only. Corrections and edits are new entries with before and after; nothing is overwritten. */
export function AuditTimeline({ entries, newest = "last", compact = false }: { entries: readonly AuditEntry[]; newest?: "first" | "last"; compact?: boolean }) {
  const list = newest === "first" ? [...entries].reverse() : entries;
  return (
    <ol className="relative space-y-3 border-l border-line pl-4" aria-label="Audit trail">
      {list.map((e) => (
        <li key={e.seq} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-navy" aria-hidden="true" />
          <p className="text-[12px] text-muted">
            <span className="font-mono">#{e.seq}</span> · {e.at}
            {e.syncedAt && <> · saved offline, synced {e.syncedAt.replace(/^\w+ /, "")}</>}
          </p>
          <p className="text-[14px] font-medium leading-5">
            {e.action}
            {e.ai && <span className="ml-1.5 rounded bg-blue px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">AI {e.ai}</span>}
          </p>
          <p className="text-[13px] leading-5 text-muted">
            {e.name} ({ACTOR[e.actor]})
            {e.detail && !compact && <> · {e.detail}</>}
          </p>
          {(e.before || e.after) && !compact && (
            <p className="mt-1 text-[13px] leading-5">
              {e.before && (
                <>
                  <span className="text-muted">Before:</span> <del className="text-muted">{e.before}</del>{" "}
                </>
              )}
              {e.after && (
                <>
                  <span className="text-muted">After:</span> {e.after}
                </>
              )}
            </p>
          )}
          {e.code && !compact && <p className="font-mono text-[12px] text-muted">{e.code}</p>}
        </li>
      ))}
    </ol>
  );
}
