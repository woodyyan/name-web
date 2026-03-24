"use client";

import { motion } from "framer-motion";
import type { NameResult } from "@/lib/types";

interface NameCardProps {
  name: NameResult;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onViewDetail: () => void;
  onBlacklist?: () => void;
}

export default function NameCard({
  name,
  index,
  isFavorite,
  onToggleFavorite,
  onViewDetail,
  onBlacklist,
}: NameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative bg-[var(--color-silk)] border border-[var(--color-gold)] rounded-lg p-6 cursor-pointer
                 hover:shadow-lg hover:border-[var(--color-rust-light)] transition-all duration-300
                 hover:-translate-y-1"
      onClick={onViewDetail}
    >
      {/* 收藏按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="absolute top-3 right-3 text-xl transition-transform hover:scale-125"
        title={isFavorite ? "取消收藏" : "收藏"}
      >
        {isFavorite ? "❤️" : "🤍"}
      </button>

      {/* 姓名 - 大字展示 */}
      <div className="text-center mb-4">
        <h3
          className="text-3xl font-bold tracking-[0.3em] text-[var(--color-ink)]"
          style={{ fontFamily: "var(--font-kai), 'Ma Shan Zheng', serif" }}
        >
          {name.fullName}
        </h3>
        {/* 拼音 */}
        <p className="text-sm text-[var(--color-ink-muted)] mt-1.5 tracking-[0.15em]">
          {name.pinyin}
        </p>
        {/* 声调 */}
        <p className="text-xs text-[var(--color-rust-light)] mt-0.5">
          {name.tonePattern}
        </p>
      </div>

      {/* 分隔线 */}
      <div className="divider-ornament text-sm my-3">✦</div>

      {/* 核心诗句 */}
      <p
        className="text-center text-[var(--color-ink-light)] text-sm leading-relaxed mb-3"
        style={{ fontFamily: "var(--font-kai), serif" }}
      >
        「{name.source.text}」
      </p>

      {/* 出处 */}
      <p className="text-center text-xs text-[var(--color-ink-muted)]">
        ◇ {name.source.author} ·《{name.source.title}》
      </p>

      {/* 底部操作区：查看详解 + 不喜欢 */}
      <div className="flex items-center justify-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-center text-xs text-[var(--color-rust-light)]">
          点击查看详解 →
        </p>
        {onBlacklist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBlacklist();
            }}
            className="absolute bottom-3 right-3 text-[10px] text-[var(--color-ink-muted)]/40
                       hover:text-[var(--color-ink-muted)] transition-colors"
            title="不再推荐这个名字"
          >
            不喜欢
          </button>
        )}
      </div>
    </motion.div>
  );
}
