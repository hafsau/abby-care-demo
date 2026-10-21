import Link from "next/link";
import { StateDiagram } from "@/components/state-diagram";
import { btn, Icon, IconDot, Pill } from "@/components/ui";

const CAST = [
  { tone: "bg-blue", who: "Rosa", role: "Family caregiver · mobile", line: "Mateo's mom and his paid caregiver. Taps first, voice second, Spanish one tap away. Her screen is about her hours and her son, never about suspicion." },
  { tone: "bg-cream", who: "Dana", role: "Clinician · web", line: "Reviews by exception. Only changes against Mateo's own baseline reach her, each with the evidence and how soon it needs her." },
  { tone: "bg-yellow", who: "Sam", role: "Care operations · web", line: "Approves EVV fixes he didn't ask for, sees what stands between a visit and a claim, and can prove all of it later." },
];

const UNDER = [
  { icon: "doc" as const, title: "The lifecycle is config", body: "One TypeScript state machine drives the diagram, every status chip and the scenario. Tests prove the rules." },
  { icon: "lock" as const, title: "Locks explain themselves", body: "Every control a role can't use says why and who can. Nobody edits clock times; fixes sit beside the original." },
  { icon: "mic" as const, title: "AI that cites her words", body: "Each line of the note links to what Rosa said or tapped. A line she didn't say blocks signing. Escalation runs before any AI." },
  { icon: "pin" as const, title: "State rules are data", body: "Switch Pennsylvania to Florida and reason codes, fix windows and required fields change without a redesign." },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto grid max-w-[1360px] gap-8 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:pt-20">
        <div>
          <Pill>
            <IconDot size={24}>
              <Icon name="check" className="h-3.5 w-3.5" />
            </IconDot>
            Unofficial concept · Product Designer
          </Pill>
          <h1 className="display mt-6 text-[52px] sm:text-[72px] lg:text-[80px]">
            One visit,
            <br />
            proven.
          </h1>
        </div>
        <div>
          <p className="text-[20px] leading-[1.35] tracking-[-0.01em]">
            One family&apos;s Tuesday, seen by the parent who gave the care, the nurse who oversees it and the team that verifies it. Every screen reads from the same rules.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/visit" className={btn("navy")}>
              Run the visit
            </Link>
            <Link href="/system" className={btn("light")}>
              See the system
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="cast-h">
        <div className="mx-auto max-w-[1360px] px-4 py-14 sm:px-6">
          <h2 id="cast-h" className="display text-[40px] sm:text-[52px]">
            Three people, one record
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {CAST.map((c) => (
              <li key={c.who} className={`rounded-[30px] p-7 sm:p-10 ${c.tone}`}>
                <p className="display text-[38px]">{c.who}</p>
                <p className="mt-1 text-[14px] font-medium">{c.role}</p>
                <p className="mt-4 text-[16px] leading-6">{c.line}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-muted">Rosa, Mateo (9, seizure disorder), Dana and Sam are fictional.</p>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="life-h">
        <div className="mx-auto max-w-[1360px] px-4 py-14 sm:px-6">
          <h2 id="life-h" className="display text-[40px] sm:text-[52px]">
            The lifecycle, from every side
          </h2>
          <p className="mt-3 max-w-2xl text-[18px] leading-7">Pick any state to see what Rosa, Dana and Sam each see, and what each of them can do there.</p>
          <div className="mt-8">
            <StateDiagram />
          </div>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="under-h">
        <div className="mx-auto max-w-[1360px] px-4 py-14 sm:px-6">
          <h2 id="under-h" className="display text-[40px] sm:text-[52px]">
            Systems, not just screens
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {UNDER.map((u) => (
              <li key={u.title} className="rounded-[30px] bg-cream p-7">
                <IconDot size={52}>
                  <Icon name={u.icon} className="h-6 w-6" />
                </IconDot>
                <p className="mt-5 text-[22px] font-medium leading-7">{u.title}</p>
                <p className="mt-2 text-[16px] leading-6">{u.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/system" className={btn("navy")}>
              Components, permissions and rules
            </Link>
            <Link href="/notes" className={btn("light")}>
              Assumptions and decisions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
