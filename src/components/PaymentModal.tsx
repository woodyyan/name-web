"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";

type ModalStage = "intro" | "qrcode" | "success" | "license-input";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onActivate: (licenseKey: string) => void;
  remaining: number;
}

export default function PaymentModal({
  open,
  onClose,
  onActivate,
  remaining,
}: PaymentModalProps) {
  const [stage, setStage] = useState<ModalStage>("intro");
  const [payType, setPayType] = useState<"native" | "alipay">("native");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [licenseInput, setLicenseInput] = useState("");
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setStage("intro");
      setOrderId(null);
      setQrDataUrl(null);
      setPolling(false);
      setLicenseKey(null);
      setLicenseInput("");
      setLicenseError(null);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open]);

  // 创建订单 + 生成二维码
  const handlePay = useCallback(
    async (type: "native" | "alipay") => {
      setPayType(type);
      setCreating(true);
      try {
        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payType: type }),
        });
        const data = await res.json();
        if (!res.ok || !data.qrUrl) {
          throw new Error(data.error || "创建订单失败");
        }

        setOrderId(data.orderId);

        // 生成二维码图片
        const dataUrl = await QRCode.toDataURL(data.qrUrl, {
          width: 240,
          margin: 2,
          color: { dark: "#2c2c2c", light: "#fdf8f0" },
        });
        setQrDataUrl(dataUrl);
        setStage("qrcode");

        // 开始轮询
        setPolling(true);
        startPolling(data.orderId);
      } catch (err) {
        console.error("创建订单失败:", err);
        alert("创建支付订单失败，请稍后重试");
      } finally {
        setCreating(false);
      }
    },
    []
  );

  // 轮询订单状态
  const startPolling = useCallback((oid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    const maxAttempts = 120; // 最多轮询 6 分钟（3秒×120）

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setPolling(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/order-status?orderId=${encodeURIComponent(oid)}`
        );
        const data = await res.json();
        if (data.paid && data.licenseKey) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPolling(false);
          setLicenseKey(data.licenseKey);
          setStage("success");
        }
      } catch {
        // 网络错误，继续轮询
      }
    }, 3000);
  }, []);

  // 验证密令
  const handleVerifyLicense = useCallback(async () => {
    const input = licenseInput.trim().toUpperCase();
    if (!input) return;

    setVerifying(true);
    setLicenseError(null);
    try {
      const res = await fetch("/api/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: input }),
      });
      const data = await res.json();
      if (data.valid) {
        onActivate(input);
      } else {
        setLicenseError("密令无效，请检查后重试");
      }
    } catch {
      setLicenseError("验证失败，请稍后重试");
    } finally {
      setVerifying(false);
    }
  }, [licenseInput, onActivate]);

  // 复制密令
  const handleCopy = useCallback(() => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey).catch(() => {});
    }
  }, [licenseKey]);

  // 支付成功，确认保存
  const handleConfirmSaved = useCallback(() => {
    if (licenseKey) {
      onActivate(licenseKey);
    }
  }, [licenseKey, onActivate]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                       md:w-[420px] md:max-h-[85vh] overflow-y-auto
                       bg-[var(--color-paper)] border border-[var(--color-gold)] rounded-xl
                       shadow-2xl z-[51] p-6 md:p-8"
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

            {/* ===== 状态1：付费引导 ===== */}
            {stage === "intro" && (
              <div className="text-center">
                <div className="text-4xl mb-4">🎋</div>
                <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-2">
                  {remaining > 0
                    ? `还剩 ${remaining} 次免费机会`
                    : "已用完 3 次免费机会"}
                </h3>
                <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">
                  「诗名」从万首古诗词中精选
                  <br />
                  有出处、有意境的好名字
                </p>

                {/* 价格卡片 */}
                <div className="bg-[var(--color-silk)] border border-[var(--color-gold)] rounded-lg p-4 mb-6">
                  <div className="text-2xl font-bold text-[var(--color-rust)]">
                    ¥9.9
                  </div>
                  <div className="text-sm text-[var(--color-ink-muted)] mt-1">
                    解锁无限取名 · 一次付费 永久使用
                  </div>
                </div>

                {/* 支付按钮 */}
                <div className="flex justify-center gap-3 mb-4">
                  <button
                    onClick={() => handlePay("native")}
                    disabled={creating}
                    className="px-6 py-2.5 bg-[#07C160] text-white rounded-full text-sm
                               hover:bg-[#06AD56] transition-colors disabled:opacity-50"
                  >
                    {creating && payType === "native"
                      ? "创建中..."
                      : "💬 微信支付"}
                  </button>
                  <button
                    onClick={() => handlePay("alipay")}
                    disabled={creating}
                    className="px-6 py-2.5 bg-[#1677FF] text-white rounded-full text-sm
                               hover:bg-[#0E5FCC] transition-colors disabled:opacity-50"
                  >
                    {creating && payType === "alipay"
                      ? "创建中..."
                      : "💙 支付宝"}
                  </button>
                </div>

                {/* 密令入口 */}
                <div className="divider-ornament text-xs mb-3">或</div>
                <button
                  onClick={() => setStage("license-input")}
                  className="text-sm text-[var(--color-rust-light)] hover:text-[var(--color-rust)]
                             transition-colors underline underline-offset-2"
                >
                  已有密令？点此输入
                </button>
              </div>
            )}

            {/* ===== 状态2：扫码支付 ===== */}
            {stage === "qrcode" && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-4">
                  {payType === "native" ? "💬 微信扫码支付" : "💙 支付宝扫码支付"}
                </h3>

                {qrDataUrl && (
                  <div className="inline-block bg-white p-3 rounded-lg shadow-md mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="支付二维码"
                      width={240}
                      height={240}
                    />
                  </div>
                )}

                <p className="text-sm text-[var(--color-ink-muted)] mb-1">
                  请使用{payType === "native" ? "微信" : "支付宝"}扫码支付{" "}
                  <span className="font-semibold text-[var(--color-rust)]">
                    ¥9.9
                  </span>
                </p>
                <p className="text-xs text-[var(--color-ink-muted)]/60 mb-4">
                  {polling ? "⏳ 等待支付中..." : "支付超时，请重试"}
                </p>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      if (pollingRef.current) clearInterval(pollingRef.current);
                      handlePay(payType === "native" ? "alipay" : "native");
                    }}
                    className="text-sm text-[var(--color-rust-light)] hover:text-[var(--color-rust)]
                               transition-colors"
                  >
                    切换{payType === "native" ? "支付宝" : "微信"}
                  </button>
                  <span className="text-[var(--color-gold)]">|</span>
                  <button
                    onClick={() => {
                      if (pollingRef.current) clearInterval(pollingRef.current);
                      setStage("intro");
                    }}
                    className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]
                               transition-colors"
                  >
                    返回
                  </button>
                </div>
              </div>
            )}

            {/* ===== 状态3：支付成功 ===== */}
            {stage === "success" && licenseKey && (
              <div className="text-center">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-2">
                  支付成功！
                </h3>
                <p className="text-sm text-[var(--color-ink-muted)] mb-4">
                  你的专属密令：
                </p>

                {/* 密令展示 */}
                <div
                  className="bg-[var(--color-silk)] border-2 border-[var(--color-gold-deep)] rounded-lg
                             p-4 mb-3 select-all cursor-pointer"
                  onClick={handleCopy}
                >
                  <span className="text-2xl font-mono font-bold tracking-[0.15em] text-[var(--color-rust)]">
                    {licenseKey}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="text-sm text-[var(--color-rust-light)] hover:text-[var(--color-rust)]
                             transition-colors mb-4 inline-block"
                >
                  📋 点击复制
                </button>

                {/* 提示 */}
                <div className="bg-[var(--color-gold)]/20 rounded-lg p-3 mb-6 text-left">
                  <p className="text-xs text-[var(--color-ink-light)] leading-relaxed">
                    ⚠️ 请截图或复制保存此密令。
                    <br />
                    清除浏览器缓存或更换设备后，可通过输入密令恢复使用权限。
                  </p>
                </div>

                <button
                  onClick={handleConfirmSaved}
                  className="px-8 py-2.5 bg-[var(--color-rust)] text-white rounded-full text-sm
                             hover:bg-[var(--color-walnut)] transition-colors"
                >
                  我已保存，开始取名
                </button>
              </div>
            )}

            {/* ===== 状态4：输入密令 ===== */}
            {stage === "license-input" && (
              <div className="text-center">
                <div className="text-3xl mb-3">🔑</div>
                <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-4">
                  输入密令
                </h3>

                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => {
                    setLicenseInput(e.target.value.toUpperCase());
                    setLicenseError(null);
                  }}
                  placeholder="SM-XXXX-XXXX"
                  maxLength={12}
                  className="w-full h-12 text-center text-lg tracking-[0.2em] font-mono
                             bg-[var(--color-silk)] border border-[var(--color-gold)] rounded-lg
                             outline-none text-[var(--color-ink)]
                             placeholder:text-[var(--color-ink-muted)]/40
                             focus:border-[var(--color-rust)] transition-colors mb-2"
                />

                {licenseError && (
                  <p className="text-sm text-red-500 mb-3">{licenseError}</p>
                )}

                <button
                  onClick={handleVerifyLicense}
                  disabled={!licenseInput.trim() || verifying}
                  className="w-full py-2.5 bg-[var(--color-rust)] text-white rounded-full text-sm
                             hover:bg-[var(--color-walnut)] transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed mt-2 mb-4"
                >
                  {verifying ? "验证中..." : "验证并解锁"}
                </button>

                <button
                  onClick={() => setStage("intro")}
                  className="text-sm text-[var(--color-rust-light)] hover:text-[var(--color-rust)]
                             transition-colors underline underline-offset-2"
                >
                  还没有密令？去付费
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
