import crypto from "crypto";

/**
 * 密令（License Key）生成与验证
 *
 * 格式：SM-XXXX-XXXX（大写字母+数字）
 *
 * 原理：
 * - payload = HMAC-SHA256(orderId, SECRET) 的前 4 字符（base32）
 * - check   = HMAC-SHA256(payload, SECRET) 的前 4 字符（base32）
 * - 验证时：从密令拆出 payload，用同样的 SECRET 重算 check，匹配即有效
 * - 同一个 orderId 永远生成同一个密令（确定性）
 */

const BASE32_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉 I/O/0/1 避免混淆

function bytesToBase32(bytes: Uint8Array, length: number): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && result.length < length) {
      bits -= 5;
      result += BASE32_CHARS[(value >> bits) & 0x1f];
    }
  }
  // 处理剩余 bits
  if (bits > 0 && result.length < length) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }
  return result.substring(0, length);
}

function getSecret(): string {
  const secret = process.env.LICENSE_SECRET;
  if (!secret) {
    throw new Error("LICENSE_SECRET 环境变量未配置");
  }
  return secret;
}

/**
 * 根据 orderId 生成密令
 * 同一个 orderId 永远返回同一个密令
 */
export function generateLicense(orderId: string): string {
  const secret = getSecret();

  // payload: HMAC(orderId) → 取前3字节 → base32 → 4位
  const payloadHash = crypto
    .createHmac("sha256", secret)
    .update(orderId)
    .digest();
  const payload = bytesToBase32(payloadHash.subarray(0, 3), 4);

  // check: HMAC(payload) → 取前3字节 → base32 → 4位
  const checkHash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest();
  const check = bytesToBase32(checkHash.subarray(0, 3), 4);

  return `SM-${payload}-${check}`;
}

/**
 * 验证密令是否有效（纯算法，零数据库）
 */
export function verifyLicense(key: string): boolean {
  try {
    const match = key
      .trim()
      .toUpperCase()
      .match(/^SM-([A-Z2-9]{4})-([A-Z2-9]{4})$/);
    if (!match) return false;

    const [, payload, check] = match;
    const secret = getSecret();

    const checkHash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest();
    const expectedCheck = bytesToBase32(checkHash.subarray(0, 3), 4);

    return check === expectedCheck;
  } catch {
    return false;
  }
}
