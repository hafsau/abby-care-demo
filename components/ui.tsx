import type { ReactNode } from "react";

/* Class helpers and small primitives matching abbycare.org. Server-safe. */

export function btn(kind: "navy" | "light" | "ghost" | "outline" = "navy", size: "md" | "sm" = "md") {
  const base = "lift inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45";
  const sizes = { md: "h-[38px] px-4 text-[14px]", sm: "h-8 px-3 text-[13px]" };
  const kinds = {
    navy: "bg-navy text-white",
    light: "bg-blue text-navy",
    ghost: "text-navy hover:underline",
    outline: "border border-control bg-white text-navy",
  };
  return `${base} ${sizes[size]} ${kinds[kind]}`;
}

export function Card({ tone = "white", className = "", children }: { tone?: "white" | "cream" | "blue" | "yellow"; className?: string; children: ReactNode }) {
  const bg = { white: "bg-white border border-line", cream: "bg-cream", blue: "bg-blue", yellow: "bg-yellow" }[tone];
  return <div className={`rounded-[20px] ${bg} ${className}`}>{children}</div>;
}

/** The icon treatment from abbycare.org: a 2px-stroke icon in a 20% gold circle. */
export function IconDot({ children, size = 40 }: { children: ReactNode; size?: number }) {
  return (
    <span className="inline-flex flex-none items-center justify-center rounded-full bg-gold/20 text-navy" style={{ width: size, height: size }} aria-hidden="true">
      {children}
    </span>
  );
}

type IconName = "lock" | "check" | "mic" | "phone" | "alert" | "clock" | "pin" | "doc" | "arrow" | "shield" | "user" | "heart" | "wifi-off" | "x";

const PATHS: Record<IconName, string> = {
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  check: "M5 12l5 5L20 7",
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  doc: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  "wifi-off": "M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.6a10 10 0 0 1 4.5-2.4M12 20h.01M15.5 10.4A10 10 0 0 1 19 12.6",
  x: "M6 6l12 12M18 6L6 18",
};

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-1.5 pr-3 text-[14px] font-medium ${className}`}>{children}</span>;
}
