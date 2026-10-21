import type { Blocker } from "@/lib/machine";
import { Icon } from "../ui";

/** "Why can't this be billed yet?" Each line is a rule from the state machine, not a guess. */
export function BlockerChecklist({ blockers, title = "Why can't this be billed yet?" }: { blockers: Blocker[]; title?: string }) {
  const done = blockers.filter((b) => b.ok).length;
  return (
    <section aria-label={title} className="rounded-[16px] border border-line bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{done === blockers.length ? "Ready to bill" : title}</p>
        <p className="text-[13px] text-muted">
          {done} of {blockers.length} met
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {blockers.map((b) => (
          <li key={b.id} className="flex items-start gap-2.5">
            <span className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${b.ok ? "bg-ok-bg text-ok-ink" : "bg-yellow text-navy"}`}>
              <Icon name={b.ok ? "check" : "clock"} className="h-3.5 w-3.5" />
              <span className="sr-only">{b.ok ? "Met" : "Not yet"}</span>
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-medium leading-5">{b.label}</span>
              <span className="block text-[13px] leading-5 text-muted">{b.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
