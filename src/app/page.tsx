"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { NameResultLite, Gender, Collection } from "@/lib/types";
import { useNameGenerator } from "@/hooks/useNameGenerator";
import { useFavorites } from "@/hooks/useFavorites";
import { useBlacklist } from "@/hooks/useBlacklist";
import { useDetailPrefetch } from "@/hooks/useDetailPrefetch";
import PreferenceForm from "@/components/PreferenceForm";
import NameGrid from "@/components/NameGrid";
import NameDetail from "@/components/NameDetail";
import FavoriteBar from "@/components/FavoriteBar";

export default function Home() {
  const { blacklist, addToBlacklist, isBlacklisted } = useBlacklist();

  const {
    names,
    loading,
    error,
    batchIndex,
    hasMore,
    generate,
    nextBatch,
    reset,
  } = useNameGenerator(blacklist);

  const { favorites, addFavorite, removeFavorite, isFavorite, getFavoriteDetail, updateFavoriteDetail } =
    useFavorites();

  const { getCachedDetail, prefetchAll, cancelAll } = useDetailPrefetch();

  const [selectedName, setSelectedName] = useState<NameResultLite | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // 名字列表变化时，后台预加载所有详解
  useEffect(() => {
    if (names.length > 0 && !loading) {
      prefetchAll(names);
    }
  }, [names, loading, prefetchAll]);

  // 过滤掉黑名单中的名字
  const visibleNames = names.filter((n) => !isBlacklisted(n.fullName));

  const handleGenerate = async (
    surname: string,
    gender: Gender,
    collections: Collection[],
    designatedChar?: string
  ) => {
    setHasGenerated(true);
    await generate(surname, gender, collections, designatedChar);
  };

  const handleToggleFavorite = (name: NameResultLite) => {
    if (isFavorite(name.fullName)) {
      removeFavorite(name.fullName);
    } else {
      // 收藏时，把预加载缓存中的详解一并存入
      const detail = getCachedDetail(name.fullName);
      addFavorite(name, detail ?? undefined);
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

          <div className="divider-ornament max-w-xs mx-auto mt-6 mb-2">❀</div>

          <p className="text-sm text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed px-4">
            从《诗经》《楚辞》《唐诗》《宋词》等经典古籍中
            <br />
            AI 为你精选有意境、有出处的好名字
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
            {visibleNames.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mb-8"
              >
                <div className="divider-ornament max-w-sm mx-auto mb-2">✿</div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  第 {batchIndex + 1} 批 · 为您精选了 {visibleNames.length} 个名字
                </p>
              </motion.div>
            )}

            {/* 名字网格 */}
            <NameGrid
              names={visibleNames}
              loading={loading}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onViewDetail={setSelectedName}
              onBlacklist={(name) => addToBlacklist(name.fullName)}
            />

            {/* 换一批 / 操作区 */}
            {visibleNames.length > 0 && !loading && (
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
                    cancelAll();
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
        <p className="text-xs text-[var(--color-ink-muted)]/60 mt-1">
          AI 驱动 · 古典诗词智能取名
        </p>
      </footer>

      {/* ===== 名字详情弹窗（异步加载详解） ===== */}
      <NameDetail
        name={selectedName}
        isFavorite={selectedName ? isFavorite(selectedName.fullName) : false}
        onToggleFavorite={() => {
          if (selectedName) handleToggleFavorite(selectedName);
        }}
        onClose={() => setSelectedName(null)}
        onBlacklist={
          selectedName
            ? () => addToBlacklist(selectedName.fullName)
            : undefined
        }
        cachedDetail={selectedName ? (getCachedDetail(selectedName.fullName) ?? getFavoriteDetail(selectedName.fullName) ?? null) : null}
        onDetailLoaded={(fullName, detail) => {
          // 如果该名字已被收藏但还没有详解，回填到收藏中
          if (isFavorite(fullName)) {
            updateFavoriteDetail(fullName, detail);
          }
        }}
      />
    </div>
  );
}
