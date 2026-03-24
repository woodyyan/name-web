import { NextRequest, NextResponse } from "next/server";
import { generateNameDetail } from "@/lib/ai";

interface NameDetailRequest {
  fullName: string;
  givenName: string;
  sourceText: string;
  sourceTitle: string;
  sourceAuthor: string;
  sourceDynasty: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NameDetailRequest = await request.json();

    // 校验必填参数
    if (!body.fullName || !body.givenName || !body.sourceText) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const detail = await generateNameDetail(
      body.fullName,
      body.givenName,
      body.sourceText,
      body.sourceTitle,
      body.sourceAuthor,
      body.sourceDynasty
    );

    return NextResponse.json(detail);
  } catch (error) {
    console.error("生成名字详解失败:", error);

    const message =
      error instanceof Error ? error.message : "生成详解时出现异常";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
