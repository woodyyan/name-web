"use client";

import { useState, useCallback } from "react";
import type {
  NameResult,
  Gender,
  Collection,
  GenerateNamesResponse,
} from "@/lib/types";

interface UseNameGeneratorReturn {
  names: NameResult[];
  loading: boolean;
  error: string | null;
  batchIndex: number;
  hasMore: boolean;
  allShownNames: string[];
  generate: (
    surname: string,
    gender: Gender,
    collections: Collection[]
  ) => Promise<void>;
  nextBatch: () => Promise<void>;
  reset: () => void;
}

export function useNameGenerator(): UseNameGeneratorReturn {
  const [names, setNames] = useState<NameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [allShownNames, setAllShownNames] = useState<string[]>([]);
  const [currentParams, setCurrentParams] = useState<{
    surname: string;
    gender: Gender;
    collections: Collection[];
  } | null>(null);

  const fetchNames = useCallback(
    async (
      surname: string,
      gender: Gender,
      collections: Collection[],
      batch: number,
      excludeNames: string[]
    ) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/generate-names", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            surname,
            gender,
            collections,
            excludeNames,
            batchIndex: batch,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "请求失败");
        }

        const data: GenerateNamesResponse = await res.json();
        setNames(data.names);
        setBatchIndex(data.batchIndex);
        setHasMore(data.hasMore);
        setAllShownNames((prev) => [
          ...prev,
          ...data.names.map((n) => n.fullName),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const generate = useCallback(
    async (surname: string, gender: Gender, collections: Collection[]) => {
      setAllShownNames([]);
      setBatchIndex(0);
      setCurrentParams({ surname, gender, collections });
      await fetchNames(surname, gender, collections, 0, []);
    },
    [fetchNames]
  );

  const nextBatch = useCallback(async () => {
    if (!currentParams || !hasMore) return;
    const newBatch = batchIndex + 1;
    await fetchNames(
      currentParams.surname,
      currentParams.gender,
      currentParams.collections,
      newBatch,
      allShownNames
    );
  }, [currentParams, hasMore, batchIndex, allShownNames, fetchNames]);

  const reset = useCallback(() => {
    setNames([]);
    setLoading(false);
    setError(null);
    setBatchIndex(0);
    setHasMore(true);
    setAllShownNames([]);
    setCurrentParams(null);
  }, []);

  return {
    names,
    loading,
    error,
    batchIndex,
    hasMore,
    allShownNames,
    generate,
    nextBatch,
    reset,
  };
}
