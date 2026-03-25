"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NameResultLite, NameDetailData } from "@/lib/types";

interface NameDetailProps {
  name: NameResultLite | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onBlacklist?: () => void;
  /** 预加载缓存中的详解数据（可选） */
  cachedDetail?: NameDetailData | null;
}

export default function NameDetail({
  name,
  isFavorite,
  onToggleFavorite,
  onClose,
  onBlacklist,
  cachedDetail,
}: NameDetailProps) {
  const [detail, setDetail] = useState<NameDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 当选中名字变化时，优先使用缓存，否则异步加载详解
  useEffect(() => {
    if (!name) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    // 如果有预加载缓存，直接使用，无需请求
    if (cachedDetail) {
      setDetail(cachedDetail);
      setLoadingDetail(false);
      setDetailError(null);
      return;
    }

    // 缓存未命中，走即时请求
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(null);
    setDetail(null);

    fetch("/api/name-detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: name.fullName,
        givenName: name.givenName,
        sourceText: name.source.text,
        sourceTitle: name.source.title,
        sourceAuthor: name.source.author,
        sourceDynasty: name.source.dynasty,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "加载详解失败");
        }
        return res.json();
      })
      .then((data: NameDetailData) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "加载详解失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [name, cachedDetail]);

  if (!name) return null;

  // 在原文中高亮取名的字
  const highlightChars = (text: string, givenName: string) => {
    const chars = givenName.split("");
    let result = text;
    chars.forEach((char) => {
      result = result.replace(
        new RegExp(char, "g"),
        `<mark class="bg-[var(--color-gold)] text-[var(--color-rust)] px-0.5 rounded">${char}</mark>`
      );
    });
    return result;
  };

  return (
    <AnimatePresence>
      {name && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                       md:w-[600px] md:max-h-[85vh] overflow-y-auto
                       bg-[var(--color-paper)] border border-[var(--color-gold)] rounded-xl
                       shadow-2xl z-50 p-6 md:p-8"
          >
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                         text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]
                         rounded-full hover:bg-[var(--color-gold)]/30 transition-colors"
            >
              ✕
            </button>

            {/* 姓名大字 */}
            <div className="text-center mb-6">
              <h2
                className="text-5xl font-bold tracking-[0.4em] text-[var(--color-ink)] mb-2"
                style={{
                  fontFamily: "var(--font-kai), 'Ma Shan Zheng', serif",
                }}
              >
                {name.fullName}
              </h2>
              <p className="text-lg text-[var(--color-ink-muted)] tracking-[0.2em]">
                {name.pinyin}
              </p>
              <p className="text-sm text-[var(--color-rust-light)] mt-1">
                {name.tonePattern}
              </p>
            </div>

            <div className="divider-ornament text-sm mb-6">❖</div>

            {/* 出处（基础信息，来自轻量版，立即显示） */}
            <section className="mb-6">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-rust)] mb-3">
                <span>📖</span> 出处
              </h4>
              <p className="text-sm text-[var(--color-ink-muted)] mb-2">
                {name.source.author}（{name.source.dynasty}）·《{name.source.title}》
              </p>

              {/* 完整诗文：等详解加载后显示，否则显示核心诗句 */}
              <div
                className="bg-[var(--color-silk)] border-l-3 border-[var(--color-rust-light)] p-4 rounded-r-lg
                           text-[var(--color-ink-light)] leading-relaxed whitespace-pre-line"
                style={{ fontFamily: "var(--font-kai), serif" }}
                dangerouslySetInnerHTML={{
                  __html: highlightChars(
                    detail?.sourceFullText || name.source.text,
                    name.givenName
                  ),
                }}
              />
            </section>

            {/* 详解区域 */}
            {loadingDetail ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse-soft">
                    <div className="h-4 bg-[var(--color-gold)]/30 rounded w-24 mb-3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-[var(--color-gold)]/20 rounded w-full" />
                      <div className="h-3 bg-[var(--color-gold)]/20 rounded w-4/5" />
                    </div>
                  </div>
                ))}
                <p className="text-center text-xs text-[var(--color-ink-muted)] mt-2">
                  AI 正在为您解读...
                </p>
              </div>
            ) : detailError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-500">{detailError}</p>
                <button
                  onClick={() => {
                    // 重试：触发 useEffect 重新请求
                    setDetail(null);
                    setDetailError(null);
                    setLoadingDetail(true);
                    fetch("/api/name-detail", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        fullName: name.fullName,
                        givenName: name.givenName,
                        sourceText: name.source.text,
                        sourceTitle: name.source.title,
                        sourceAuthor: name.source.author,
                        sourceDynasty: name.source.dynasty,
                      }),
                    })
                      .then(async (res) => {
                        if (!res.ok) throw new Error("重试失败");
                        return res.json();
                      })
                      .then(setDetail)
                      .catch((err) =>
                        setDetailError(
                          err instanceof Error ? err.message : "重试失败"
                        )
                      )
                      .finally(() => setLoadingDetail(false));
                  }}
                  className="mt-2 text-xs text-[var(--color-rust)] hover:underline"
                >
                  点击重试
                </button>
              </div>
            ) : detail ? (
              <>
                {/* 取名释义 */}
                <section className="mb-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-rust)] mb-3">
                    <span>💡</span> 取名释义
                  </h4>
                  <p className="text-[var(--color-ink-light)] leading-relaxed text-sm">
                    {detail.nameReason}
                  </p>
                </section>

                {/* 寓意解读 */}
                <section className="mb-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-rust)] mb-3">
                    <span>🌸</span> 寓意
                  </h4>
                  <p className="text-[var(--color-ink-light)] leading-relaxed text-sm">
                    {detail.meaning}
                  </p>
                </section>

                {/* 意境描绘 */}
                <section className="mb-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-rust)] mb-3">
                    <span>🎨</span> 意境
                  </h4>
                  <p
                    className="text-[var(--color-ink-light)] leading-relaxed text-sm italic"
                    style={{ fontFamily: "var(--font-kai), serif" }}
                  >
                    {detail.imagery}
                  </p>
                </section>
              </>
            ) : null}

            {/* 音韵分析（来自轻量版数据，立即显示） */}
            <section className="mb-6">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-rust)] mb-3">
                <span>🎵</span> 音韵
              </h4>
              <div className="flex items-center justify-center gap-6 py-3">
                {name.fullName.split("").map((char, i) => (
                  <div key={i} className="text-center">
                    <span
                      className="block text-2xl text-[var(--color-ink)]"
                      style={{
                        fontFamily: "var(--font-kai), 'Ma Shan Zheng', serif",
                      }}
                    >
                      {char}
                    </span>
                    <span className="block text-xs text-[var(--color-ink-muted)] mt-1">
                      {name.pinyin.split(" ")[i]}
                    </span>
                    <span className="block text-xs text-[var(--color-rust-light)] mt-0.5">
                      {name.tonePattern[i]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 底部操作 */}
            <div className="flex justify-center items-center gap-4 pt-4 border-t border-[var(--color-gold)]/50">
              <button
                onClick={onToggleFavorite}
                className={`px-6 py-2.5 rounded-full text-sm transition-all ${
                  isFavorite
                    ? "bg-[var(--color-rust)] text-white"
                    : "bg-[var(--color-gold)]/50 text-[var(--color-rust)] hover:bg-[var(--color-gold)]"
                }`}
              >
                {isFavorite ? "❤️ 已收藏" : "🤍 收藏此名"}
              </button>
            </div>
            {onBlacklist && (
              <div className="text-center mt-3">
                <button
                  onClick={() => {
                    onBlacklist();
                    onClose();
                  }}
                  className="text-[11px] text-[var(--color-ink-muted)]/40
                             hover:text-[var(--color-ink-muted)] transition-colors"
                >
                  不喜欢，不再推荐
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
