// components/ui.tsx — Reusable UI Components for YUVI OS
import React, { type ReactNode } from "react";
import type { LeadTier } from "../lib/types/sales";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export type View =
  | "Dashboard"
  | "Approvals"
  | "Chat"
  | "AI Team"
  | "Leads"
  | "Pipeline"
  | "Clients"
  | "Proposals"
  | "Finance"
  | "Knowledge Base"
  | "Reports"
  | "Settings";

export function Panel({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  return (
    <section className={`panel rounded-xl ${className}`} {...props}>
      {children}
    </section>
  );
}

export function Avatar({
  text,
  color = "#7c5cff",
  size = "h-8 w-8",
}: {
  text: string;
  color?: string;
  size?: string;
}) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full text-[10px] font-bold`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}66` }}
    >
      {text}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const isGreen =
    status.includes("APPROVED") ||
    status.includes("COMPLETED") ||
    status === "WON" ||
    status === "INTERESTED";
  const isRed =
    status === "REJECTED" ||
    status === "LOST" ||
    status === "DISQUALIFIED" ||
    status === "DO_NOT_CONTACT";
  const isAmber =
    status === "EDITING" ||
    status === "CALLBACK" ||
    status === "PENDING" ||
    status === "WAITING_APPROVAL";

  const color = isGreen ? "emerald" : isRed ? "rose" : isAmber ? "amber" : "cyan";

  return (
    <span
      className={`inline-flex rounded-full border border-${color}-300/25 bg-${color}-300/10 px-2 py-0.5 text-[9px] font-medium text-${color}-200`}
    >
      {status}
    </span>
  );
}

export function TierPill({ tier }: { tier: LeadTier }) {
  const color = tier === "A" ? "emerald" : tier === "B" ? "cyan" : tier === "C" ? "amber" : "slate";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-${color}-300/25 bg-${color}-300/10 px-2 py-0.5 text-[9px] font-bold text-${color}-200`}
    >
      Tier {tier}
    </span>
  );
}

export function ViewHeading({
  view,
  description,
  action,
}: {
  view: View;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div className="text-[10px] uppercase tracking-[.2em] text-violet-300">YUVI / {view}</div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{view}</h2>
        <p className="mt-1 max-w-xl text-xs text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "primary" | "danger" | "success";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const style =
    variant === "primary"
      ? "bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
      : variant === "danger"
      ? "border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
      : variant === "success"
      ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
      : "border border-white/10 bg-white/[.04] text-slate-200 hover:border-violet-400/30 hover:bg-white/[.08] hover:text-white";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${style} ${className}`}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  delta,
  icon: Icon,
  color = "#a87cff",
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-300">
        <ArrowUpRight size={11} />
        {delta}
      </div>
    </Panel>
  );
}

export function Sparkline({ color = "#43e6d0" }: { color?: string }) {
  return (
    <svg viewBox="0 0 260 70" className="h-16 w-full">
      <path
        d="M0 56 C25 52 22 31 43 42 S70 57 83 39 S103 27 115 45 S136 30 147 35 S160 52 176 27 S198 30 205 19 S229 25 260 4"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M0 56 C25 52 22 31 43 42 S70 57 83 39 S103 27 115 45 S136 30 147 35 S160 52 176 27 S198 30 205 19 S229 25 260 4 V70 H0"
        fill={`${color}15`}
        stroke="none"
      />
    </svg>
  );
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-semibold text-slate-100">{label}</div>
        <div className="mt-0.5 max-w-lg text-[10px] leading-4 text-slate-400">{description}</div>
      </div>
      {children}
    </div>
  );
}
