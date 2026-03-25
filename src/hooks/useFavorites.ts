"use client";

import { useState, useEffect, useCallback } from "react";
import type { NameResultLite, NameDetailData, FavoriteItem } from "@/lib/types";

const STORAGE_KEY = "shiming-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存到 localStorage
  const save = useCallback((items: FavoriteItem[]) => {
    setFavorites(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  const addFavorite = useCallback(
    (name: NameResultLite, detail?: NameDetailData) => {
      if (favorites.some((f) => f.name.fullName === name.fullName)) return;
      save([...favorites, { name, savedAt: Date.now(), detail }]);
    },
    [favorites, save]
  );

  const removeFavorite = useCallback(
    (fullName: string) => {
      save(favorites.filter((f) => f.name.fullName !== fullName));
    },
    [favorites, save]
  );

  const isFavorite = useCallback(
    (fullName: string) => {
      return favorites.some((f) => f.name.fullName === fullName);
    },
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    save([]);
  }, [save]);

  /** 获取某个收藏名字的已保存详解 */
  const getFavoriteDetail = useCallback(
    (fullName: string): NameDetailData | undefined => {
      return favorites.find((f) => f.name.fullName === fullName)?.detail;
    },
    [favorites]
  );

  /** 为已收藏的名字补充详解数据（预加载完成后回填） */
  const updateFavoriteDetail = useCallback(
    (fullName: string, detail: NameDetailData) => {
      const updated = favorites.map((f) =>
        f.name.fullName === fullName ? { ...f, detail } : f
      );
      // 只有实际变化了才保存
      if (updated.some((f, i) => f !== favorites[i])) {
        save(updated);
      }
    },
    [favorites, save]
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites,
    getFavoriteDetail,
    updateFavoriteDetail,
  };
}
