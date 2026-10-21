import { Icon } from "../ui";

export type Evidence = { label: string; today: string; usual: string; above: boolean };

/**
 * Why something reached the clinician: evidence against this child's own
 * baseline, what's missing, and the source. No risk score, no percentage.
 * It stays open until a clinician records an outcome.
 */
export function EvidenceFlag({ title, evidence, missing, source, status }: { title: string; evidence: Evidence[]; missing: string[]; source: string; status: "open" | "closed" }) {
  return (
    <section aria-label={title} className={`rounded-[16px] border p-4 ${status === "open" ? "border-gold bg-yellow/50" : "border-line bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${status === "open" ? "bg-gold/30 text-navy" : "bg-ok-bg text-ok-ink"}`}>
          {status === "open" ? "Outcome needed" : "Outcome recorded"}
        </span>
      </div>
      <table className="mt-3 w-full text-left text-[14px]">
        <caption className="sr-only">Today compared with usual</caption>
        <thead className="text-[12px] text-muted">
          <tr>
            <th scope="col" className="pb-1 font-medium">
              Reported
            </th>
            <th scope="col" className="pb-1 font-medium">
              Today
            </th>
            <th scope="col" className="pb-1 font-medium">
              His usual
            </th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((e) => (
            <tr key={e.label} className="border-t border-line/70">
              <th scope="row" className="py-1.5 pr-2 font-medium">
                {e.label}
              </th>
              <td className={`py-1.5 pr-2 ${e.above ? "font-semibold" : ""}`}>
                {e.today}
                {e.above && <span className="sr-only"> (above usual)</span>}
              </td>
              <td className="py-1.5 text-muted">{e.usual}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {missing.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-[13px] leading-5">
          <Icon name="alert" className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            <span className="font-medium">Not recorded:</span> {missing.join("; ")}.
          </span>
        </p>
      )}
      <p className="mt-2 text-[12px] text-muted">Source: {source}</p>
    </section>
  );
}
