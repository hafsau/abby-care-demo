import type { ReactNode } from "react";
import type { Role } from "@/lib/machine";
import { explain, type Action, type ObjectId } from "@/lib/permissions";
import { Icon } from "../ui";

const WHO: Record<Role, string> = { caregiver: "the caregiver", clinician: "the clinician", operator: "care operations", compliance: "compliance" };

/**
 * A value this role can see but not change. It always says why, and who can,
 * and offers the next best action instead of a dead end.
 */
export function LockedField({ role, object, action = "edit", label, value, children }: { role: Role; object: ObjectId; action?: Action; label: string; value: ReactNode; children?: ReactNode }) {
  const lock = explain(role, object, action);
  const id = `lock-${object}-${role}`;
  return (
    <div className="rounded-[12px] border border-line bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">{label}</p>
          <p className="mt-0.5 font-medium" aria-describedby={lock ? id : undefined}>
            {value}
          </p>
        </div>
        {lock && (
          <span className="inline-flex flex-none items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-[12px] font-medium text-muted">
            <Icon name="lock" className="h-3.5 w-3.5" /> Locked
          </span>
        )}
      </div>
      {lock && (
        <p id={id} className="mt-2 text-[13px] leading-5 text-muted">
          {lock.why}
          {lock.who.length > 0 && !/only|operations|nobody|clinicians|doctor/i.test(lock.why) && <> Who can: {lock.who.map((r) => WHO[r]).join(", ")}.</>}
        </p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
