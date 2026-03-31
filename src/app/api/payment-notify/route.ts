import { NextRequest, NextResponse } from "next/server";
import { getXorPayConfig, xorPaySign, PRICE } from "@/lib/xorpay";

/**
 * XorPay 支付成功回调通知
 * POST, Content-Type: application/x-www-form-urlencoded
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const aoid = formData.get("aoid") as string;
    const orderId = formData.get("order_id") as string;
    const payPrice = formData.get("pay_price") as string;
    const payTime = formData.get("pay_time") as string;
    const sign = formData.get("sign") as string;

    if (!aoid || !orderId || !payPrice || !payTime || !sign) {
      return new NextResponse("missing params", { status: 400 });
    }

    const { secret } = getXorPayConfig();

    // 验签：MD5(aoid + order_id + pay_price + pay_time + secret)
    const expectedSign = xorPaySign([aoid, orderId, payPrice, payTime, secret]);
    if (sign !== expectedSign) {
      console.error("XorPay 回调验签失败:", { sign, expectedSign });
      return new NextResponse("sign error", { status: 400 });
    }

    // 验证金额
    if (payPrice !== PRICE) {
      console.error("XorPay 回调金额不匹配:", { payPrice, expected: PRICE });
      return new NextResponse("price mismatch", { status: 400 });
    }

    // 记录日志（无数据库，仅打印）
    console.log("[支付成功]", {
      aoid,
      orderId,
      payPrice,
      payTime,
    });

    // 返回 200 + ok，通知 XorPay 接收成功
    return new NextResponse("ok", { status: 200 });
  } catch (err) {
    console.error("支付回调处理异常:", err);
    return new NextResponse("error", { status: 500 });
  }
}
