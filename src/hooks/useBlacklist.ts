"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "shiming-blacklist";

export function useBlacklist() {
  const [blacklist, setBlacklist] = useState<string[]>([]);

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBlacklist(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存到 localStorage
  const save = useCallback((items: string[]) => {
    setBlacklist(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  const addToBlacklist = useCallback(
    (fullName: string) => {
      if (blacklist.includes(fullName)) return;
      save([...blacklist, fullName]);
    },
    [blacklist, save]
  );

  const removeFromBlacklist = useCallback(
    (fullName: string) => {
      save(blacklist.filter((n) => n !== fullName));
    },
    [blacklist, save]
  );

  const isBlacklisted = useCallback(
    (fullName: string) => {
      return blacklist.includes(fullName);
    },
    [blacklist]
  );

  const clearBlacklist = useCallback(() => {
    save([]);
  }, [save]);

  return {
    blacklist,
    addToBlacklist,
    removeFromBlacklist,
    isBlacklisted,
    clearBlacklist,
  };
}
