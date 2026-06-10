"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 500, damping: 32 };

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "glass relative flex h-8 w-[60px] items-center rounded-full p-1 transition-colors",
        isDark ? "justify-end" : "justify-start",
      )}
    >
      {/* faint static hints behind the knob */}
      <Sun
        className={cn(
          "pointer-events-none absolute left-1.5 h-3.5 w-3.5 transition-opacity",
          isDark ? "opacity-30 text-muted" : "opacity-0",
        )}
      />
      <Moon
        className={cn(
          "pointer-events-none absolute right-1.5 h-3.5 w-3.5 transition-opacity",
          isDark ? "opacity-0" : "opacity-30 text-muted",
        )}
      />
      <motion.span
        layout
        transition={spring}
        className="relative z-10 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_2px_10px_var(--glow)]"
      >
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {isDark ? (
            <Moon className="h-3.5 w-3.5" fill="currentColor" />
          ) : (
            <Sun className="h-3.5 w-3.5" fill="currentColor" />
          )}
        </motion.span>
      </motion.span>
    </button>
  );
}
