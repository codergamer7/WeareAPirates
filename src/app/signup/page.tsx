"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { AuthShell, Field, SubmitButton } from "@/components/auth/AuthShell";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { signUp, configured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error, needsConfirm } = await signUp(email, password, name);
    setLoading(false);
    if (error) setError(error);
    else if (needsConfirm) setConfirm(true);
    // otherwise the app frame will surface the pending-approval screen
  }

  if (confirm) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="One more step to board."
        footer={
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Back to sign in
          </Link>
        }
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 py-4 text-center"
        >
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30">
            <MailCheck className="h-8 w-8" />
          </div>
          <p className="text-sm leading-relaxed text-muted">
            We sent a confirmation link to <b className="text-foreground">{email}</b>.
            Confirm it, then an admin will approve your account.
          </p>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Join the crew"
      subtitle="Create your account — an admin will approve you shortly."
      footer={
        <>
          Already aboard?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {!configured && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
            Supabase isn’t configured yet — add your keys to <code>.env.local</code>.
          </p>
        )}
        <Field
          label="Display name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Captain Jack"
          autoComplete="name"
        />
        <Field
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
