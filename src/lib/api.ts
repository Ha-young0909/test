import { NextResponse } from "next/server";
import type { ApiError } from "@/types";

export function errorResponse(status: number, error: string, code?: ApiError["code"]) {
  return NextResponse.json<ApiError>({ error, code }, { status });
}

/** JSON 본문을 안전하게 읽는다. 깨진 본문이면 null. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 서버 설정 누락 등 예기치 못한 오류를 500 으로 정리한다. */
export function serverError(err: unknown) {
  // 내부 설정·DB 오류 문구가 클라이언트에 새지 않도록 상세는 로그에만 남긴다.
  console.error(err);
  return errorResponse(500, "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
}
