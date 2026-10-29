// 개발·데모용 목 데이터. 실제 후보 역(C)과 맛집 API(D)가 연결되면 쓰지 않는다.
// 역·노선·시간·맛집·별점은 모두 가짜 값이다.
import type { StationCardData, VoteMark } from "./types";

export const MOCK_ME = "me";

export const MOCK_PARTICIPANTS = [
  { id: MOCK_ME, nickname: "현욱" },
  { id: "p-2", nickname: "하영" },
  { id: "p-3", nickname: "민수" },
];

export const MOCK_STATIONS: StationCardData[] = [
  {
    id: "st-1",
    rank: 1,
    name: "을지로3가역",
    kind: "subway",
    lines: ["2호선", "3호선"],
    lat: 37.5663,
    lng: 126.9916,
    avgMinutes: 27,
    maxMinutes: 33,
    over90: false,
    routes: [
      { participantId: MOCK_ME, route: "직선거리 추정", minutes: 24 },
      { participantId: "p-2", route: "직선거리 추정", minutes: 33 },
      { participantId: "p-3", route: "직선거리 추정", minutes: 25 },
    ],
    restaurants: [
      { name: "을지 노가리골목 호프", type: "술집", rating: 4.4, walkMinutes: 3 },
      { name: "을지 평양냉면 (가상)", type: "냉면", rating: 4.6, walkMinutes: 5 },
    ],
    spots: [
      { name: "세운상가 옥상정원", type: "전망", rating: null, walkMinutes: 6 },
      { name: "을지로 레트로 카페", type: "카페", rating: 4.3, walkMinutes: 2 },
    ],
  },
  {
    id: "st-2",
    rank: 2,
    name: "종로3가역",
    kind: "subway",
    lines: ["1호선", "3호선", "5호선"],
    lat: 37.5714,
    lng: 126.9918,
    avgMinutes: 28,
    maxMinutes: 35,
    over90: false,
    routes: [
      { participantId: MOCK_ME, route: "직선거리 추정", minutes: 22 },
      { participantId: "p-2", route: "직선거리 추정", minutes: 35 },
      { participantId: "p-3", route: "직선거리 추정", minutes: 27 },
    ],
    restaurants: [
      { name: "익선동 한옥 파스타", type: "양식", rating: 4.5, walkMinutes: 4 },
      { name: "종로 포장마차 거리", type: "포차", rating: 4.1, walkMinutes: 2 },
    ],
    spots: [
      { name: "익선동 한옥거리", type: "산책", rating: null, walkMinutes: 4 },
      { name: "탑골공원", type: "공원", rating: 4.0, walkMinutes: 3 },
    ],
  },
  {
    id: "st-3",
    rank: 3,
    name: "을지로입구 정류장",
    kind: "bus",
    lines: ["472", "N13"],
    lat: 37.5660,
    lng: 126.9822,
    avgMinutes: 30,
    maxMinutes: 38,
    over90: false,
    routes: [
      { participantId: MOCK_ME, route: "직선거리 추정", minutes: 28 },
      { participantId: "p-2", route: "직선거리 추정", minutes: 38 },
      { participantId: "p-3", route: "직선거리 추정", minutes: 24 },
    ],
    restaurants: [
      { name: "명동 칼국수 (가상)", type: "한식", rating: 4.5, walkMinutes: 5 },
      { name: "을지로 딤섬하우스", type: "중식", rating: 4.2, walkMinutes: 4 },
    ],
    spots: [
      { name: "청계천 광교", type: "산책", rating: null, walkMinutes: 3 },
      { name: "명동 쇼핑거리", type: "쇼핑", rating: 4.1, walkMinutes: 6 },
    ],
  },
  {
    id: "st-4",
    rank: 4,
    name: "동대문역사문화공원역",
    kind: "subway",
    lines: ["2호선", "4호선", "5호선"],
    lat: 37.5652,
    lng: 127.0079,
    avgMinutes: 31,
    maxMinutes: 41,
    over90: false,
    routes: [
      { participantId: MOCK_ME, route: "직선거리 추정", minutes: 29 },
      { participantId: "p-2", route: "직선거리 추정", minutes: 41 },
      { participantId: "p-3", route: "직선거리 추정", minutes: 23 },
    ],
    restaurants: [
      { name: "동대문 닭한마리 (가상)", type: "한식", rating: 4.3, walkMinutes: 6 },
      { name: "중앙아시아 거리 샤슬릭", type: "세계음식", rating: 4.4, walkMinutes: 4 },
    ],
    spots: [
      { name: "DDP 전시관", type: "전시", rating: 4.5, walkMinutes: 2 },
      { name: "동대문 쇼핑몰", type: "쇼핑", rating: 3.9, walkMinutes: 5 },
    ],
  },
  {
    id: "st-5",
    rank: 5,
    name: "남산 순환 정류장",
    kind: "bus",
    lines: ["02", "05"],
    lat: 37.5512,
    lng: 126.9882,
    avgMinutes: 41,
    maxMinutes: 94,
    over90: true,
    routes: [
      { participantId: MOCK_ME, route: "직선거리 추정", minutes: 36 },
      { participantId: "p-2", route: "직선거리 추정", minutes: 94 },
      { participantId: "p-3", route: "직선거리 추정", minutes: 33 },
    ],
    restaurants: [
      { name: "남산 왕돈까스 (가상)", type: "경양식", rating: 4.2, walkMinutes: 7 },
      { name: "해방촌 브런치", type: "브런치", rating: 4.4, walkMinutes: 9 },
    ],
    spots: [
      { name: "남산서울타워", type: "전망", rating: 4.6, walkMinutes: 10 },
      { name: "남산 둘레길", type: "공원", rating: 4.5, walkMinutes: 2 },
    ],
  },
];

export const MOCK_VOTES: VoteMark[] = [
  { participantId: "p-2", candidateId: "st-1" },
  { participantId: "p-3", candidateId: "st-1" },
  { participantId: "p-3", candidateId: "st-3" },
  { participantId: "p-2", candidateId: "st-4" },
];
