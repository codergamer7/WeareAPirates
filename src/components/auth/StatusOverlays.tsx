"use client";

import { motion } from "framer-motion";
import { Ban, Clock, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/ui/Logo";
import { SITE_NAME } from "@/lib/config";

export function Splash() {
  return (
    <div className="grid min-h-screen place-items-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.98, 1, 0.98] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Logo />
      </motion.div>
    </div>
  );
}

// Full-screen lock banner shown to suspended accounts — blocks the entire app.
export function SuspensionBanner({ note }: { note: string | null }) {
  const { signOut } = useAuth();
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background px-6">
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{
          background:
            "radial-gradient(50rem 40rem at 50% 0%, rgba(220,38,38,0.22), transparent 60%)",
        }}
      />
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="relative w-full max-w-lg rounded-3xl border border-red-500/30 bg-surface/90 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <motion.div
          initial={{ rotate: -12, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
          className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-red-500/15 text-red-400 ring-1 ring-red-500/40"
        >
          <Ban className="h-10 w-10" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-red-400">
          Account Suspended
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your access to {SITE_NAME} has been put on hold by an administrator.
        </p>

        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400/80">
            Message from the administrator
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {note || "Your account has been suspended. Please contact support."}
          </p>
        </div>

        <button
          onClick={signOut}
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </motion.div>
    </div>
  );
}

// Shown to accounts awaiting admin approval.
export function PendingApproval() {
  const { signOut, profile } = useAuth();
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md rounded-3xl border border-border bg-surface/80 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/30"
        >
          <Clock className="h-9 w-9" />
        </motion.div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Awaiting Approval
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Thanks for signing up{profile?.display_name ? `, ${profile.display_name}` : ""}.
          Your account is pending review. An administrator will grant you access to{" "}
          {SITE_NAME} shortly — this page will unlock automatically the moment you're approved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-accent"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <button
          onClick={signOut}
          className="mt-7 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </motion.div>
    </div>
  );
}

// Shown when Supabase env vars aren't configured yet.
export function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface/70 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30">
          <KeyRound className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Almost ready to set sail</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Add your Supabase + TMDB keys to <code className="text-accent">.env.local</code>,
          run <code className="text-accent">supabase/schema.sql</code>, then restart the dev
          server. Full steps are in <code className="text-accent">SETUP.md</code>.
        </p>
      </div>
    </div>
  );
}
