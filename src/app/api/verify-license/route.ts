import { NextRequest, NextResponse } from "next/server";
import { verifyLicense } from "@/lib/license";

/**
 * 验证密令
 * POST /api/verify-license
 */
export async function POST(req: NextRequest) {
  try {
    const { licenseKey } = (await req.json()) as { licenseKey?: string };
    if (!licenseKey) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const valid = verifyLicense(licenseKey);
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
