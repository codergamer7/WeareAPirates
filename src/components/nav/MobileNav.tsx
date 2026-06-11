"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clapperboard, Home, Search, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Item =
  | { type: "link"; href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean }
  | { type: "action"; action: "search"; label: string; icon: React.ReactNode };

const ITEMS: Item[] = [
  { type: "link", href: "/", label: "Home", icon: <Home className="h-5 w-5" />, match: (p) => p === "/" },
  { type: "action", action: "search", label: "Search", icon: <Search className="h-5 w-5" /> },
  { type: "link", href: "/sports", label: "Sports", icon: <Trophy className="h-5 w-5" />, match: (p) => p.startsWith("/sports") },
  { type: "link", href: "/party", label: "Party", icon: <Clapperboard className="h-5 w-5" />, match: (p) => p.startsWith("/party") },
  { type: "link", href: "/account", label: "Me", icon: <User className="h-5 w-5" />, match: (p) => p.startsWith("/account") },
];

// Fixed bottom navigation — phones only (hidden at md+).
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.type === "link" && item.match(pathname);
          const inner = (
            <>
              {active && (
                <motion.span
                  layoutId="mobilenav-active"
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={cn("transition-transform", active && "-translate-y-px scale-110")}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </>
          );
          const cls = cn(
            "relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
            active ? "text-accent" : "text-muted",
          );

          if (item.type === "action") {
            return (
              <button
                key={item.label}
                onClick={() => window.dispatchEvent(new CustomEvent("calypso:search"))}
                className={cls}
              >
                {inner}
              </button>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
