"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

// Shared YouTube trailer lightbox. Render with a youtube key + onClose;
// pass null/empty key to keep it closed.
export function TrailerModal({
  youtubeKey,
  title,
  onClose,
}: {
  youtubeKey: string | null;
  title?: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {youtubeKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-border shadow-2xl"
          >
            <button
              onClick={onClose}
              aria-label="Close trailer"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0`}
              title={title ? `${title} — Trailer` : "Trailer"}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
