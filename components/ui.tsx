"use client";

import React from "react";

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
        {hint && <span className="text-xs text-ink/50">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; sub?: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ink/5 p-1.5" role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
              active ? "bg-white shadow-md shadow-purple-200" : "hover:bg-white/60"
            }`}
          >
            {o.icon}
            <span>
              <span className={`block font-display text-base font-semibold ${active ? "text-purple-600" : "text-ink"}`}>{o.label}</span>
              {o.sub && <span className="block text-xs text-ink/55">{o.sub}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  sub,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
  icon?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
        checked ? "border-purple-200 bg-purple-50/80" : "border-ink/10 bg-white/60"
      }`}
    >
      {icon && <span className="text-xl" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {sub && <span className="block truncate text-xs text-ink/55">{sub}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-purple-500" : "bg-ink/20"}`}>
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink/80">{label}</span>
        <span className="font-display font-semibold text-purple-600">{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="btn-magic h-full rounded-full transition-[width] duration-500 animate-shimmer"
          style={{ width: `${Math.max(3, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
