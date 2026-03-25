"use client";

import { useRef, useCallback } from "react";
import type { NameResultLite, NameDetailData } from "@/lib/types";

interface UseDetailPrefetchReturn {
  /** 获取缓存中的详解数据（没有则返回 null） */
  getCachedDetail: (fullName: string) => NameDetailData | null;
  /** 为一批名字启动后台预加载 */
  prefetchAll: (names: NameResultLite[]) => void;
  /** 取消所有进行中的预加载（换一批/重新开始时调用） */
  cancelAll: () => void;
}

/**
 * 名字详解预加载 Hook
 * 在名字列表返回后，后台静默请求 9 个详解并缓存
 * NameDetail 弹窗优先读缓存，没有再发即时请求
 */
export function useDetailPrefetch(): UseDetailPrefetchReturn {
  // 缓存：fullName -> NameDetailData
  const cacheRef = useRef<Map<string, NameDetailData>>(new Map());
  // 进行中的请求的 AbortController 列表
  const controllersRef = useRef<AbortController[]>([]);

  const getCachedDetail = useCallback((fullName: string): NameDetailData | null => {
    return cacheRef.current.get(fullName) ?? null;
  }, []);

  const cancelAll = useCallback(() => {
    for (const controller of controllersRef.current) {
      controller.abort();
    }
    controllersRef.current = [];
  }, []);

  const prefetchAll = useCallback((names: NameResultLite[]) => {
    // 先取消之前的预加载
    cancelAll();
    // 清空旧缓存（新一批名字，旧缓存无用）
    cacheRef.current.clear();

    for (const name of names) {
      const controller = new AbortController();
      controllersRef.current.push(controller);

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
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return; // 静默失败，用户点击时会重试
          const data: NameDetailData = await res.json();
          cacheRef.current.set(name.fullName, data);
        })
        .catch(() => {
          // 忽略 abort 和网络错误——预加载失败不影响功能
        });
    }
  }, [cancelAll]);

  return { getCachedDetail, prefetchAll, cancelAll };
}
