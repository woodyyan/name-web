import crypto from "crypto";

export function getXorPayConfig() {
  const aid = process.env.XORPAY_AID;
  const secret = process.env.XORPAY_SECRET;
  if (!aid || !secret) {
    throw new Error("XORPAY_AID / XORPAY_SECRET 环境变量未配置");
  }
  return { aid, secret };
}

/**
 * XorPay 签名：纯 value 拼接后 MD5
 */
export function xorPaySign(values: string[]): string {
  return crypto
    .createHash("md5")
    .update(values.join(""))
    .digest("hex");
}

/** XorPay API 基础地址 */
export const XORPAY_API = "https://xorpay.com/api";

/** 商品名称 */
export const PRODUCT_NAME = "诗名-无限取名";

/** 价格 */
export const PRICE = "9.90";
