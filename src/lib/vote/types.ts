// D(역 투표) 화면이 쓰는 역 카드 데이터 형태.
// 팀 공용 계약(src/types)에 아직 지하철/버스 구분·노선·맛집 필드가 없어서 D 쪽에 먼저 둔다.
// A 가 공용 타입에 반영하면 이 파일은 그쪽을 가져다 쓰도록 바꾼다.

export type StationKind = "subway" | "bus";

/** 역 카드 탭: 전체 · 지하철 · 버스 */
export type StationTab = "all" | StationKind;

/** 참여자 한 명이 이 역까지 가는 방법 */
export interface StationRoute {
  participantId: string;
  /** 예: "2호선 → 7호선", "N13 · 472번" */
  route: string;
  minutes: number;
}

/** 역 근처 맛집·갈만한 곳 */
export interface NearbyPlace {
  name: string;
  /** 예: "한식", "카페", "공원" */
  type: string;
  /** 별점 출처가 정해지기 전에는 비워 둘 수 있다. */
  rating: number | null;
  walkMinutes: number;
}

export interface StationCardData {
  /** candidates.id 와 같은 값 */
  id: string;
  /** 1부터 시작하는 순위 (지도 핀 번호와 같다) */
  rank: number;
  name: string;
  kind: StationKind;
  /** 지하철 노선 또는 버스 번호 */
  lines: string[];
  lat: number;
  lng: number;
  avgMinutes: number;
  /** 순위 계산용. 카드에는 표시하지 않는다. */
  maxMinutes: number;
  /** 90분 넘게 걸리는 참여자가 있으면 true */
  over90: boolean;
  routes: StationRoute[];
  restaurants: NearbyPlace[];
  spots: NearbyPlace[];
}

/** votes 테이블 한 행 (참여자 × 후보 역) */
export interface VoteMark {
  participantId: string;
  candidateId: string;
}

/** GET /api/rooms/[id]/vote 응답. 투표 화면을 한 번에 그린다. */
export interface VoteStateResponse {
  stations: StationCardData[];
  votes: VoteMark[];
  status: "collecting" | "voting" | "closed";
  voteDeadline: string | null;
  /** 서버가 vote_deadline 으로 판단한 마감 여부 */
  closed: boolean;
  approximate: boolean;
  serverTime: string;
}
