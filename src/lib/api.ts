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
  const message = err instanceof Error ? err.message : "서버 오류";
  console.error(err);
  return errorResponse(500, message);
}
