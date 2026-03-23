"use client";

import { motion } from "framer-motion";
import type { NameResult } from "@/lib/types";
import NameCard from "./NameCard";

interface NameGridProps {
  names: NameResult[];
  loading: boolean;
  isFavorite: (name: string) => boolean;
  onToggleFavorite: (name: NameResult) => void;
  onViewDetail: (name: NameResult) => void;
}

export default function NameGrid({
  names,
  loading,
  isFavorite,
  onToggleFavorite,
  onViewDetail,
}: NameGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--color-silk)] border border-[var(--color-gold)]/50 rounded-lg p-6 animate-pulse-soft"
          >
            <div className="text-center">
              <div className="h-9 bg-[var(--color-gold)]/30 rounded w-24 mx-auto mb-3" />
              <div className="h-4 bg-[var(--color-gold)]/20 rounded w-20 mx-auto mb-2" />
              <div className="h-3 bg-[var(--color-gold)]/20 rounded w-16 mx-auto mb-4" />
              <div className="h-px bg-[var(--color-gold)]/30 my-3" />
              <div className="h-4 bg-[var(--color-gold)]/20 rounded w-40 mx-auto mb-2" />
              <div className="h-3 bg-[var(--color-gold)]/20 rounded w-28 mx-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (names.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
    >
      {names.map((name, index) => (
        <NameCard
          key={name.id}
          name={name}
          index={index}
          isFavorite={isFavorite(name.fullName)}
          onToggleFavorite={() => onToggleFavorite(name)}
          onViewDetail={() => onViewDetail(name)}
        />
      ))}
    </motion.div>
  );
}
