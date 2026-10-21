/*
 * Append-only audit trail. Entries are never edited or deleted; a correction
 * is a new entry that records before and after values, the reason code, who
 * asked and who approved. Device time and server time are both kept, so an
 * offline action that synced later is still honest about when it happened.
 */
import type { Actor } from "./machine";

export type AuditEntry = {
  seq: number;
  at: string;
  /** Set when the action happened offline and reached the server later. */
  syncedAt?: string;
  actor: Actor;
  name: string;
  action: string;
  detail?: string;
  before?: string;
  after?: string;
  code?: string;
  /** Whether the AI was involved, and how. */
  ai?: "drafted" | "translated";
};

export type AuditLog = readonly AuditEntry[];

export function append(log: AuditLog, entry: Omit<AuditEntry, "seq">): AuditLog {
  const next = [...log, Object.freeze({ ...entry, seq: log.length + 1 })];
  return Object.freeze(next);
}
