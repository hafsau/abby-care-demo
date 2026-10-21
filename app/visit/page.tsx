import type { Metadata } from "next";
import { VisitPlayer, type PlayerInit } from "@/components/visit-player";
import { STEPS } from "@/lib/scenario";

export const metadata: Metadata = { title: "The visit" };

export default async function VisitPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const n = Number(sp.step);
  const init: PlayerInit = {
    step: Number.isInteger(n) && n >= 0 && n <= STEPS.length ? n : 0,
    state: sp.state === "FL" ? "FL" : "PA",
    view: sp.view === "operator" || sp.view === "audit" ? sp.view : "clinician",
    hospital: sp.hospital === "1",
    lang: sp.lang === "es" ? "es" : "en",
  };
  // Keyed so links to another step (e.g. the proof shortcuts) start fresh at that step.
  return <VisitPlayer key={JSON.stringify(init)} init={init} />;
}
