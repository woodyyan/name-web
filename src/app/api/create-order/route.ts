import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  getXorPayConfig,
  xorPaySign,
  XORPAY_API,
  PRODUCT_NAME,
  PRICE,
} from "@/lib/xorpay";

export async function POST(req: NextRequest) {
  try {
    const { payType } = (await req.json()) as { payType?: string };

    // 验证支付类型
    const validTypes = ["native", "alipay"];
    const type = validTypes.includes(payType || "") ? payType! : "native";

    const { aid, secret } = getXorPayConfig();

    // 生成唯一订单号
    const orderId = `sm-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    // 回调地址（使用请求的 origin 拼接）
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const notifyUrl = `${origin}/api/payment-notify`;

    // XorPay 签名：name + pay_type + price + order_id + notify_url + secret
    const sign = xorPaySign([PRODUCT_NAME, type, PRICE, orderId, notifyUrl, secret]);

    // 请求 XorPay
    const params = new URLSearchParams({
      name: PRODUCT_NAME,
      pay_type: type,
      price: PRICE,
      order_id: orderId,
      notify_url: notifyUrl,
      sign,
    });

    const xorRes = await fetch(`${XORPAY_API}/pay/${aid}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const xorData = await xorRes.json();

    if (xorData.status !== "ok") {
      console.error("XorPay 创建订单失败:", xorData);
      return NextResponse.json(
        { error: `支付接口错误: ${xorData.status}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId,
      qrUrl: xorData.info?.qr || "",
      expiresIn: xorData.expires_in || 7200,
    });
  } catch (err) {
    console.error("创建订单异常:", err);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
