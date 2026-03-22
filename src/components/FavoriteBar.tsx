"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { FavoriteItem, NameResult } from "@/lib/types";

interface FavoriteBarProps {
  favorites: FavoriteItem[];
  onRemove: (fullName: string) => void;
  onViewDetail: (name: NameResult) => void;
}

export default function FavoriteBar({
  favorites,
  onRemove,
  onViewDetail,
}: FavoriteBarProps) {
  if (favorites.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto mt-10"
    >
      <div className="divider-ornament text-sm mb-4">♡</div>
      <h3 className="text-center text-sm text-[var(--color-ink-muted)] mb-4">
        我的收藏（{favorites.length}）
      </h3>
      <div className="flex flex-wrap justify-center gap-3">
        <AnimatePresence>
          {favorites.map((fav) => (
            <motion.div
              key={fav.name.fullName}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="group relative bg-[var(--color-silk)] border border-[var(--color-gold)]
                         rounded-full px-5 py-2 flex items-center gap-2 cursor-pointer
                         hover:border-[var(--color-rust-light)] transition-all"
              onClick={() => onViewDetail(fav.name)}
            >
              <span
                className="text-base text-[var(--color-ink)]"
                style={{ fontFamily: "var(--font-kai), serif" }}
              >
                {fav.name.fullName}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {fav.name.pinyin}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(fav.name.fullName);
                }}
                className="ml-1 text-[var(--color-ink-muted)] hover:text-[var(--color-crimson)]
                           opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                title="取消收藏"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
