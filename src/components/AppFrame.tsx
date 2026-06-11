"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/nav/Navbar";
import { MobileNav } from "@/components/nav/MobileNav";
import { PageTransition } from "@/components/ui/PageTransition";
import {
  PendingApproval,
  SetupNotice,
  Splash,
  SuspensionBanner,
} from "@/components/auth/StatusOverlays";

const PUBLIC = ["/login", "/signup"];
const isPublic = (p: string) => PUBLIC.some((x) => p === x || p.startsWith(x + "/"));

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <Splash />;
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, configured } = useAuth();
  const pathname = usePathname();
  const pub = isPublic(pathname);

  // Not configured: let auth pages render (with their own hints), gate the rest.
  if (!configured) {
    return pub ? <>{children}</> : <SetupNotice />;
  }

  if (loading) return <Splash />;

  // Logged out
  if (!user) {
    return pub ? <>{children}</> : <Redirect to="/login" />;
  }

  // Logged in but visiting an auth page → go home
  if (pub) return <Redirect to="/" />;

  // Profile still resolving
  if (!profile) return <Splash />;

  // Lockdown states take over the entire app
  if (profile.status === "suspended")
    return <SuspensionBanner note={profile.suspension_note} />;
  if (profile.status === "pending") return <PendingApproval />;

  // Active — immersive (no chrome) on the watch player and inside a party room
  const immersive =
    pathname.startsWith("/watch") || pathname.startsWith("/party/");
  return (
    <>
      {!immersive && <Navbar />}
      <main className={immersive ? "" : "min-h-screen pb-16 md:pb-0"}>
        {immersive ? children : <PageTransition>{children}</PageTransition>}
      </main>
      {!immersive && <MobileNav />}
    </>
  );
}
