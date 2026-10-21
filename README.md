# One Visit, Proven

**An Abby Care concept.** An unofficial concept by [Hafsa Usmani](https://hafsausmani.com) for Abby Care's **Product Designer** role.

> **Not affiliated with Abby Care.** Rosa, Mateo, Dana and Sam are fictional, and the data is synthetic. State rules, reason codes and seizure thresholds are illustrative. Abby Care's fonts, colours and logo come from abbycare.org to show the work in context. The site is noindexed.

## The idea

The role asks for "systems and workflows, not just screens". This concept follows **one family's visit** through three views that share one record:

- **Rosa** (caregiver), on mobile
- **Dana** (clinician), on web
- **Sam** (care operations), on web

Every screen reads from the same tested rules.

| Page | What's there |
|---|---|
| **Overview** (`/`) | A two-track state diagram. Pick any state to see what each role sees and can do there. |
| **The visit** (`/visit`) | The 12-step scenario, which you can drive from the screens themselves. Rosa clocks in, logs tasks by tap, notes care away from home, and asks for a fix when her phone dies. She logs a seizure by tap and the seizure-plan check runs on the phone with no AI; that night she voice-logs her note in Spanish. She fixes a line the AI got wrong, then signs. Dana reviews the evidence against Mateo's baseline and records an outcome. Sam approves the time fix. Care is verified. Also here: a Pennsylvania/Florida rules switch, a hospital-stay edge case and an append-only audit trail. |
| **System** (`/system`) | Generated from the code: the state machine, the status vocabulary (one status, three audiences), the permission matrix, state rules, and six documented components (states, accessibility, voice). Also tokens with contrast adaptations, and voice rules. |
| **Notes** (`/notes`) | What I'd validate in weeks 1–2, the decision log, guardrails, edge cases, a 90-day plan, how AI was used, and what's real vs illustrative. |

Deep links: `/visit?step=8`, `/visit?step=8&lang=es`, `/visit?step=12&view=operator`, `/visit?hospital=1`, `/visit?state=FL`.

## How it's built

- **`lib/machine.ts`:** the EVV and documentation tracks as transition tables with guards:
  - no clock-in while the member is in the hospital
  - nobody approves their own correction
  - a reason code is required
  - every AI line must trace to the caregiver's words before she can sign

  It also holds where the tracks converge (`careVerified`, `claimBlockers`) and the status vocabulary.
- **`lib/permissions.ts`:** role × record × action, plus `explain()`, so every locked control says why and who can.
- **`lib/rules.ts`:** per-state config (illustrative).
- **`lib/scenario.ts`:** the visit as steps that apply real transitions, replayable from scratch.
- **`lib/escalation.ts`:** the seizure action-plan check, run on taps (rules, not AI).
- **`lib/draft.ts`:** the AI draft with sources.
- **`lib/audit.ts`:** the append-only, frozen trail.

## Quality gates

- **Stack:** Next.js 16, React 19, Tailwind 4, Vercel Analytics. Fonts are STIX Two Text and Inter, as on abbycare.org.
- **Unit tests:** `npm test` runs 20 Vitest tests: legal and illegal transitions, guards (people, not roles, for self-approval), permissions, state rules, escalation, full scenario replay in both states, the append-only audit, and no blame language on the caregiver side.
- **End-to-end:** `npm run e2e` runs 35 Playwright tests across desktop, tablet and mobile:
  - the full visit driven from the UI, Spanish including the signed note, the state switch, the hospital hold, operations redaction, and the proof shortcuts
  - axe at WCAG 2.2 AA on every page and state
  - 200% text, and no horizontal scroll
- **Lighthouse:** `npx @lhci/cli autorun` scores accessibility 100 on every page, CLS 0, performance 97–99. SEO is low on purpose, because the site is noindexed.

```bash
npm ci && npm run dev
```
