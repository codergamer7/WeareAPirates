"use client";

import { Check } from "lucide-react";
import {
  SUB_COLORS,
  SUB_LANGUAGES,
  SUB_SIZES,
  subtitleStyle,
  useSubs,
  type SubShadow,
  type SubSize,
} from "@/lib/subtitle-context";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/settings/AppearanceSection";

const SHADOWS: { value: SubShadow; label: string }[] = [
  { value: "none", label: "None" },
  { value: "drop", label: "Drop" },
  { value: "outline", label: "Outline" },
];

export function SubtitlesSection() {
  const { prefs, update, reset } = useSubs();

  return (
    <div>
      <SectionHeader
        title="Subtitles"
        subtitle="Customize how subtitles appear in the player."
        action={
          <button
            onClick={reset}
            className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            Reset Defaults
          </button>
        }
      />

      {/* live preview */}
      <div className="relative mt-6 grid h-44 place-items-center overflow-hidden rounded-2xl border border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-background" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(30rem 18rem at 70% 20%, var(--glow), transparent 60%)",
          }}
        />
        <p className="relative max-w-[80%] text-center">
          <span style={subtitleStyle(prefs)}>
            Here is a preview of your subtitles
            <br />
            Second line looks like this
          </span>
        </p>
      </div>

      <div className="mt-8 grid gap-x-10 gap-y-8 lg:grid-cols-2">
        {/* SIZE */}
        <Field label="Size">
          <Segmented
            options={SUB_SIZES.map((s) => ({ value: s, label: s }))}
            value={prefs.size}
            onChange={(v) => update({ size: v as SubSize })}
            wrap
          />
        </Field>

        {/* SHADOW */}
        <Field label="Shadow">
          <Segmented
            options={SHADOWS}
            value={prefs.shadow}
            onChange={(v) => update({ shadow: v as SubShadow })}
          />
        </Field>

        {/* COLOR */}
        <Field label="Color">
          <div className="flex flex-wrap gap-2.5">
            {SUB_COLORS.map((c) => {
              const active = prefs.color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => update({ color: c })}
                  aria-label={c}
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                    active ? "ring-accent" : "ring-transparent hover:ring-border",
                  )}
                  style={{ background: c }}
                >
                  {active && (
                    <Check
                      className="h-4 w-4"
                      style={{ color: c === "#ffffff" ? "#000" : "#fff" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Field>

        {/* toggles + language */}
        <div className="space-y-5">
          <ToggleRow
            label="Background"
            hint="Add a semi-transparent background box"
            value={prefs.background}
            onChange={(v) => update({ background: v })}
          />
          <ToggleRow
            label="Auto-detect"
            hint="Auto-load subtitles in your default language — works on the Vidking player only"
            value={prefs.autoDetect}
            onChange={(v) => update({ autoDetect: v })}
          />
          <div>
            <p className="font-semibold">Default Language</p>
            <p className="mb-2 text-sm text-muted">
              Subtitles in this language will be auto-selected
            </p>
            <div className="relative">
              <select
                value={prefs.language}
                onChange={(e) => update({ language: e.target.value })}
                className="w-full appearance-none rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm outline-none focus:border-accent"
              >
                {SUB_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* video glow */}
      <div className="mt-8 border-t border-border pt-6">
        <ToggleRow
          label="Video Glow"
          hint="Ambient color effect around the video player"
          value={prefs.videoGlow}
          onChange={(v) => update({ videoGlow: v })}
        />
      </div>

      {/* opacity */}
      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Opacity
        </p>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={prefs.opacity}
          onChange={(e) => update({ opacity: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
        <div className="mt-1.5 flex justify-between text-xs text-muted">
          {[0, 25, 50, 75, 100].map((m) => (
            <span key={m}>{m}%</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  wrap,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  return (
    <div
      className={cn(
        "gap-1 rounded-2xl border border-border bg-surface/40 p-1.5",
        wrap ? "flex flex-wrap" : "inline-flex",
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-[3rem] flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            value === o.value
              ? "bg-foreground text-background shadow"
              : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <Switch value={value} onChange={onChange} />
    </div>
  );
}

export function Switch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        value ? "bg-emerald-500" : "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
          value ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}
