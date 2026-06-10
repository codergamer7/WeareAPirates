"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TmdbItem } from "@/lib/types";
import { MediaCard } from "@/components/media/MediaCard";

interface Props {
  title: string;
  items: TmdbItem[];
  getProgress?: (item: TmdbItem) => number | undefined;
}

export function MediaRow({ title, items, getProgress }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  if (!items?.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="group/row relative py-4"
    >
      <div className="mb-3 flex items-baseline justify-between px-4 sm:px-8">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 h-11 w-11 place-items-center rounded-full glass text-foreground opacity-0 transition-opacity duration-300 hover:text-accent group-hover/row:opacity-100 md:grid"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div
          ref={ref}
          className="row-scroll flex gap-3.5 overflow-x-auto px-4 pb-3 pt-2 sm:px-8"
        >
          {items.map((item, i) => (
            <MediaCard
              key={`${item.id}-${i}`}
              item={item}
              index={i}
              progress={getProgress?.(item)}
            />
          ))}
        </div>

        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 h-11 w-11 place-items-center rounded-full glass text-foreground opacity-0 transition-opacity duration-300 hover:text-accent group-hover/row:opacity-100 md:grid"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </motion.section>
  );
}
