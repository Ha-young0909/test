import { NextRequest, NextResponse } from "next/server";

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number; // m
  url: string;
};

export async function GET(request: NextRequest) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY가 설정되지 않았어요." },
      { status: 500 },
    );
  }

  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat, lng가 필요해요." }, { status: 400 });
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.search = new URLSearchParams({
    query: "횟집",
    x: String(lng),
    y: String(lat),
    radius: "5000",
    sort: "distance",
    size: "10",
  }).toString();

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "횟집 검색에 실패했어요." },
      { status: 502 },
    );
  }

  const data = await res.json();
  const restaurants: Restaurant[] = data.documents.map(
    (d: Record<string, string>) => ({
      id: d.id,
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      phone: d.phone,
      distance: Number(d.distance),
      url: d.place_url,
    }),
  );

  return NextResponse.json({ restaurants });
}
