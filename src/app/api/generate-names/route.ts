import { NextRequest, NextResponse } from "next/server";
import type { GenerateNamesRequest, GenerateNamesResponse } from "@/lib/types";
import { generateNames } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateNamesRequest = await request.json();

    // 校验必填参数
    if (!body.surname || body.surname.trim().length === 0) {
      return NextResponse.json(
        { error: "请输入姓氏" },
        { status: 400 }
      );
    }

    if (body.surname.length > 2) {
      return NextResponse.json(
        { error: "姓氏最多两个字" },
        { status: 400 }
      );
    }

    // 校验指定字：最多一个字
    if (body.designatedChar && body.designatedChar.trim().length > 1) {
      return NextResponse.json(
        { error: "指定字只能输入一个字" },
        { status: 400 }
      );
    }

    // 设置默认值
    const request_data: GenerateNamesRequest = {
      surname: body.surname.trim(),
      gender: body.gender || "neutral",
      collections: body.collections || [],
      excludeNames: body.excludeNames || [],
      batchIndex: body.batchIndex || 0,
      designatedChar: body.designatedChar?.trim() || undefined,
    };

    const names = await generateNames(request_data);

    const response: GenerateNamesResponse = {
      names,
      batchIndex: request_data.batchIndex,
      hasMore: request_data.batchIndex < 5,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成名字失败:", error);

    const message =
      error instanceof Error ? error.message : "生成名字时出现异常";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
