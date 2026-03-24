"use client";

import { useState, useCallback } from "react";
import type {
  NameResultLite,
  Gender,
  Collection,
  GenerateNamesLiteResponse,
} from "@/lib/types";

interface UseNameGeneratorReturn {
  names: NameResultLite[];
  loading: boolean;
  error: string | null;
  batchIndex: number;
  hasMore: boolean;
  allShownNames: string[];
  generate: (
    surname: string,
    gender: Gender,
    collections: Collection[],
    designatedChar?: string
  ) => Promise<void>;
  nextBatch: () => Promise<void>;
  reset: () => void;
}

export function useNameGenerator(extraExcludeNames: string[] = []): UseNameGeneratorReturn {
  const [names, setNames] = useState<NameResultLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [allShownNames, setAllShownNames] = useState<string[]>([]);
  const [currentParams, setCurrentParams] = useState<{
    surname: string;
    gender: Gender;
    collections: Collection[];
    designatedChar?: string;
  } | null>(null);

  const fetchNames = useCallback(
    async (
      surname: string,
      gender: Gender,
      collections: Collection[],
      batch: number,
      excludeNames: string[],
      designatedChar?: string
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
            designatedChar: designatedChar || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "请求失败");
        }

        const data: GenerateNamesLiteResponse = await res.json();
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
    async (surname: string, gender: Gender, collections: Collection[], designatedChar?: string) => {
      setAllShownNames([]);
      setBatchIndex(0);
      setCurrentParams({ surname, gender, collections, designatedChar });
      await fetchNames(surname, gender, collections, 0, [], designatedChar);
    },
    [fetchNames]
  );

  const nextBatch = useCallback(async () => {
    if (!currentParams || !hasMore) return;
    const newBatch = batchIndex + 1;
    const combinedExclude = [...new Set([...allShownNames, ...extraExcludeNames])];
    await fetchNames(
      currentParams.surname,
      currentParams.gender,
      currentParams.collections,
      newBatch,
      combinedExclude,
      currentParams.designatedChar
    );
  }, [currentParams, hasMore, batchIndex, allShownNames, extraExcludeNames, fetchNames]);

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
