"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { btn } from "./ui";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/visit", label: "The visit" },
  { href: "/system", label: "System" },
  { href: "/notes", label: "Notes" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="bg-navy px-4 py-2 text-center text-[13px] leading-5 text-white">
        Unofficial concept by{" "}
        <a href="https://hafsausmani.com" className="link">
          Hafsa Usmani
        </a>{" "}
        for Abby Care&apos;s Product Designer role. Synthetic data; not affiliated with Abby Care.
      </div>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] items-center gap-6 px-4 py-3 sm:px-6">
          <Link href="/" className="flex flex-none items-center gap-2.5" aria-label="One Visit, Proven: overview">
            <Image src="/abby-logo.svg" alt="" width={110} height={20} priority />
            <span className="hidden rounded-full border border-line px-2 py-0.5 text-[12px] font-medium text-muted sm:inline">concept</span>
          </Link>
          <nav aria-label="Main" className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-[14px] font-medium ${active(n.href) ? "bg-blue text-navy" : "text-navy hover:bg-soft"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:block">
            <Link href="/visit" className={btn("navy")}>
              Run the visit
            </Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="mt-24 bg-navy text-white">
        <div className="mx-auto max-w-[1360px] px-4 py-10 text-[13px] leading-6 sm:px-6">
          <p className="display text-[26px]">One visit, proven.</p>
          <p className="mt-3 max-w-3xl text-white/80">
            A concept, not Abby Care&apos;s product. Rosa, Mateo, Dana and Sam are fictional. State rules, thresholds and codes are illustrative. Brand fonts, colours and the logo come from abbycare.org
            to show the work in context.{" "}
            <Link href="/notes" className="link text-white">
              What&apos;s real and what isn&apos;t
            </Link>
            .
          </p>
        </div>
      </footer>
    </>
  );
}
