"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Clapperboard, Users } from "lucide-react";

function newCode() {
  // 6-char room code, no easily-confused chars.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function PartyLobby() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length >= 4) router.push(`/party/${c}`);
  };

  return (
    <div className="min-h-screen pt-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30">
            <Clapperboard className="h-8 w-8" />
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Watch Party
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Start a room, share the code, and watch together in sync — with live
            chat and a shared remote.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* create */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => router.push(`/party/${newCode()}?host=1`)}
            className="group rounded-3xl border border-border bg-surface/50 p-6 text-left transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_18px_40px_rgba(var(--shadow-color),0.25)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Clapperboard className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">Create a party</h2>
            <p className="mt-1 text-sm text-muted">
              You’ll be the host and control what plays.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
              New room <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </motion.button>

          {/* join */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-border bg-surface/50 p-6"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-foreground/10">
              <Users className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">Join a party</h2>
            <p className="mt-1 text-sm text-muted">Enter the code a friend shared.</p>
            <div className="mt-4 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="ABC123"
                maxLength={8}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-4 py-2.5 text-center text-lg font-bold uppercase tracking-[0.3em] outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                onClick={join}
                disabled={code.trim().length < 4}
                className="shrink-0 rounded-xl bg-accent px-4 text-accent-foreground transition-transform hover:scale-105 disabled:opacity-40"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
