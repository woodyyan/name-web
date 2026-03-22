"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { NameResult, Gender, Collection } from "@/lib/types";
import { useNameGenerator } from "@/hooks/useNameGenerator";
import { useFavorites } from "@/hooks/useFavorites";
import PreferenceForm from "@/components/PreferenceForm";
import NameGrid from "@/components/NameGrid";
import NameDetail from "@/components/NameDetail";
import FavoriteBar from "@/components/FavoriteBar";

export default function Home() {
  const {
    names,
    loading,
    error,
    batchIndex,
    hasMore,
    generate,
    nextBatch,
    reset,
  } = useNameGenerator();

  const { favorites, addFavorite, removeFavorite, isFavorite } =
    useFavorites();

  const [selectedName, setSelectedName] = useState<NameResult | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async (
    surname: string,
    gender: Gender,
    collections: Collection[]
  ) => {
    setHasGenerated(true);
    await generate(surname, gender, collections);
  };

  const handleToggleFavorite = (name: NameResult) => {
    if (isFavorite(name.fullName)) {
      removeFavorite(name.fullName);
    } else {
      addFavorite(name);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ===== 顶部标题区 ===== */}
      <header className="relative py-12 md:py-20 text-center overflow-hidden">
        {/* 装饰性背景 */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, var(--color-bamboo) 0%, transparent 50%),
                               radial-gradient(circle at 80% 50%, var(--color-rust-light) 0%, transparent 50%)`,
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo */}
          <h1
            className="text-5xl md:text-7xl font-bold tracking-[0.5em] text-[var(--color-ink)] mb-4"
            style={{ fontFamily: "'Ma Shan Zheng', var(--font-kai), serif" }}
          >
            诗名
          </h1>

          {/* 副标题 */}
          <p
            className="text-lg md:text-xl text-[var(--color-ink-light)] tracking-[0.3em]"
            style={{ fontFamily: "var(--font-kai), serif" }}
          >
            以诗为名，不负韶华
          </p>

          <div className="divider-ornament max-w-xs mx-auto mt-6 mb-2">❀</div>

          <p className="text-sm text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed px-4">
            从《诗经》《楚辞》《唐诗》《宋词》等经典古籍中
            <br />
            为你精选有意境、有出处的好名字
          </p>
        </motion.div>
      </header>

      {/* ===== 主体区 ===== */}
      <main className="flex-1 px-4 md:px-8 pb-16 max-w-5xl mx-auto w-full">
        {/* 输入表单 */}
        <PreferenceForm onSubmit={handleGenerate} loading={loading} />

        {/* 错误提示 */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <div className="inline-block bg-red-50 border border-red-200 text-red-700 rounded-lg px-6 py-3 text-sm">
              {error}
            </div>
          </motion.div>
        )}

        {/* 名字结果区 */}
        {hasGenerated && (
          <div className="mt-12">
            {/* 结果标题 */}
            {names.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mb-8"
              >
                <div className="divider-ornament max-w-sm mx-auto mb-2">✿</div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  第 {batchIndex + 1} 批 · 为您精选了 {names.length} 个名字
                </p>
              </motion.div>
            )}

            {/* 名字网格 */}
            <NameGrid
              names={names}
              loading={loading}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onViewDetail={setSelectedName}
            />

            {/* 换一批 / 操作区 */}
            {names.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-8 space-y-3"
              >
                {hasMore ? (
                  <button
                    onClick={nextBatch}
                    className="px-8 py-2.5 bg-transparent border border-[var(--color-gold-deep)]
                               text-[var(--color-rust)] rounded-full text-sm tracking-[0.15em]
                               hover:bg-[var(--color-gold)]/30 hover:border-[var(--color-rust-light)]
                               transition-all"
                  >
                    🔄 换一批灵感
                  </button>
                ) : (
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    已为您展示所有精选名字，试试调整偏好条件？
                  </p>
                )}

                <button
                  onClick={() => {
                    reset();
                    setHasGenerated(false);
                  }}
                  className="block mx-auto text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-rust)] transition-colors"
                >
                  重新开始
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* 收藏栏 */}
        <FavoriteBar
          favorites={favorites}
          onRemove={removeFavorite}
          onViewDetail={setSelectedName}
        />
      </main>

      {/* ===== 底部 ===== */}
      <footer className="py-6 text-center border-t border-[var(--color-gold)]/30">
        <p className="text-xs text-[var(--color-ink-muted)]">
          「诗名」— 以诗为名，不负韶华
        </p>
      </footer>

      {/* ===== 名字详情弹窗 ===== */}
      <NameDetail
        name={selectedName}
        isFavorite={selectedName ? isFavorite(selectedName.fullName) : false}
        onToggleFavorite={() => {
          if (selectedName) handleToggleFavorite(selectedName);
        }}
        onClose={() => setSelectedName(null)}
      />
    </div>
  );
}
