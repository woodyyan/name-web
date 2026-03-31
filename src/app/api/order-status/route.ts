import { NextRequest, NextResponse } from "next/server";
import { getXorPayConfig, xorPaySign, XORPAY_API } from "@/lib/xorpay";
import { generateLicense } from "@/lib/license";

/**
 * 轮询订单状态
 * GET /api/order-status?orderId=xxx
 *
 * 后端用 order_id + sign 调 XorPay query2 接口查询，
 * 已支付则即时生成密令返回。
 */
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });
    }

    const { aid, secret } = getXorPayConfig();

    // XorPay 订单查询签名：MD5(order_id + secret)
    const sign = xorPaySign([orderId, secret]);

    const queryUrl = `${XORPAY_API}/query2/${aid}?order_id=${encodeURIComponent(orderId)}&sign=${sign}`;
    const xorRes = await fetch(queryUrl);
    const xorData = await xorRes.json();

    // 已支付状态：payed 或 success
    if (xorData.status === "payed" || xorData.status === "success") {
      const licenseKey = generateLicense(orderId);
      return NextResponse.json({ paid: true, licenseKey });
    }

    // 未支付
    return NextResponse.json({ paid: false, status: xorData.status });
  } catch (err) {
    console.error("查询订单状态异常:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
