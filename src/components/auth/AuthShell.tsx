"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SITE_TAGLINE } from "@/lib/config";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      {/* animated aurora */}
      <motion.div
        className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, var(--accent), transparent, rgba(45,212,191,0.6), transparent, var(--accent))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="relative w-full max-w-md"
      >
        <Link href="/" className="mb-8 flex flex-col items-center gap-2">
          <Logo className="scale-110" />
          <p className="font-display text-sm italic text-muted">{SITE_TAGLINE}</p>
        </Link>

        <div className="glass rounded-3xl border p-7 shadow-[0_30px_80px_rgba(var(--shadow-color),0.4)] sm:p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </motion.div>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </span>
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-[15px] outline-none transition-all",
          "placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/30",
        )}
      />
    </label>
  );
}

export function SubmitButton({
  loading,
  children,
}: {
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-accent-bright to-accent py-3.5 text-sm font-bold text-accent-foreground shadow-[0_8px_24px_var(--glow)] transition-all hover:shadow-[0_10px_32px_var(--glow)] disabled:opacity-60"
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/40 border-t-accent-foreground" />
        )}
        {children}
      </span>
    </button>
  );
}
