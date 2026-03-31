"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "shiming-payment";
const FREE_LIMIT = 3;

interface PaymentState {
  usageCount: number;
  licenseKey?: string;
}

function loadState(): PaymentState {
  if (typeof window === "undefined") return { usageCount: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { usageCount: 0 };
}

function saveState(state: PaymentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function usePayment() {
  const [state, setState] = useState<PaymentState>({ usageCount: 0 });
  const [showPaywall, setShowPaywall] = useState(false);

  // 初始化读取 localStorage
  useEffect(() => {
    setState(loadState());
  }, []);

  const isPaid = !!state.licenseKey;

  /** 剩余免费次数 */
  const remaining = Math.max(0, FREE_LIMIT - state.usageCount);

  /** 能否使用（已付费 or 还有免费次数） */
  const canUse = isPaid || state.usageCount < FREE_LIMIT;

  /** 消耗一次使用次数，返回 true 表示允许继续，false 表示需付费 */
  const consume = useCallback((): boolean => {
    if (isPaid) return true;

    const current = loadState(); // 重新读取确保最新
    if (current.usageCount < FREE_LIMIT) {
      const updated = { ...current, usageCount: current.usageCount + 1 };
      saveState(updated);
      setState(updated);
      return true;
    }

    // 额度用完，弹出付费弹窗
    setShowPaywall(true);
    return false;
  }, [isPaid]);

  /** 激活密令 */
  const activateLicense = useCallback((licenseKey: string) => {
    const updated = { ...loadState(), licenseKey };
    saveState(updated);
    setState(updated);
    setShowPaywall(false);
  }, []);

  /** 关闭付费弹窗 */
  const closePaywall = useCallback(() => {
    setShowPaywall(false);
  }, []);

  /** 手动打开付费弹窗 */
  const openPaywall = useCallback(() => {
    setShowPaywall(true);
  }, []);

  return {
    isPaid,
    canUse,
    remaining,
    usageCount: state.usageCount,
    showPaywall,
    consume,
    activateLicense,
    closePaywall,
    openPaywall,
  };
}
