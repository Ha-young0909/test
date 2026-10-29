import { mergeResults, searchKakao } from "./kakao";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ results: [] });
  }
  if (q.length > 100) {
    return Response.json({ error: "검색어가 너무 깁니다." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "카카오 API 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const [keyword, address] = await Promise.allSettled([
      searchKakao("keyword", q, apiKey),
      searchKakao("address", q, apiKey),
    ]);
    if (keyword.status === "rejected" && address.status === "rejected") {
      throw keyword.reason;
    }
    const results = mergeResults(
      [
        keyword.status === "fulfilled" ? keyword.value : [],
        address.status === "fulfilled" ? address.value : [],
      ],
      8,
    );
    return Response.json({ results });
  } catch {
    return Response.json(
      { error: "장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
