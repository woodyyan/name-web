"use client";

import { useState, useEffect, useCallback } from "react";
import type { NameResultLite, FavoriteItem } from "@/lib/types";

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
    (name: NameResultLite) => {
      if (favorites.some((f) => f.name.fullName === name.fullName)) return;
      save([...favorites, { name, savedAt: Date.now() }]);
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

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites,
  };
}
