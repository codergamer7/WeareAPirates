"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, LogOut, Search, Settings, Shield, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/browse/movie", label: "Films" },
  { href: "/browse/tv", label: "Series" },
  { href: "/sports", label: "Sports" },
  { href: "/account", label: "My List" },
];

export function Navbar() {
  const { profile, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // "/" opens search anywhere; mobile bottom-nav dispatches a custom event too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !/input|textarea/i.test((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    const onSearch = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("calypso:search", onSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("calypso:search", onSearch);
    };
  }, []);

  const initial = (profile?.display_name || profile?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all duration-500",
          scrolled
            ? "glass border-b shadow-[0_8px_30px_rgba(var(--shadow-color),0.18)]"
            : "border-b border-transparent bg-gradient-to-b from-black/40 to-transparent",
        )}
      >
        <nav className="mx-auto flex h-16 max-w-[1500px] items-center gap-6 px-4 sm:px-8">
          <Link href="/" className="group">
            <Logo className="transition-transform duration-300 group-hover:scale-[1.03]" />
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={cn(
                      "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-foreground/8"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="group flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden rounded bg-foreground/10 px-1.5 text-[10px] lg:inline">
                /
              </kbd>
            </button>

            <ThemeToggle />

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-bright to-accent text-sm font-bold text-accent-foreground shadow-[0_2px_12px_var(--glow)] transition-transform hover:scale-105"
              >
                {initial}
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="glass absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border p-1.5 shadow-2xl"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold">
                        {profile?.display_name || "Guest"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {profile?.email}
                      </p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    <MenuItem href="/account" icon={<UserIcon className="h-4 w-4" />}>
                      Account & Lists
                    </MenuItem>
                    <MenuItem href="/party" icon={<Clapperboard className="h-4 w-4" />}>
                      Watch Party
                    </MenuItem>
                    <MenuItem href="/settings" icon={<Settings className="h-4 w-4" />}>
                      Settings
                    </MenuItem>
                    {isAdmin && (
                      <MenuItem href="/admin" icon={<Shield className="h-4 w-4" />}>
                        Control Panel
                      </MenuItem>
                    )}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={async () => {
                        await signOut();
                        router.push("/login");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-foreground/5 hover:text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
