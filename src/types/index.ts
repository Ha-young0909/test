// 팀 공용 계약. 변경이 필요하면 A(feat/room-core) 담당자에게 요청한다.

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 6;
export const NICKNAME_MAX_LENGTH = 12;
export const GROUP_NAME_MAX_LENGTH = 20;

export type RoomStatus = "collecting" | "voting" | "closed";
/** 후보 역 종류: 지하철역 또는 버스 정류장. */
export type StationKind = "subway" | "bus";
export type PlaceCategory = "restaurant" | "cafe" | "bar";

export interface Room {
  id: string;
  name: string | null;
  category: PlaceCategory | null;
  status: RoomStatus;
  vote_deadline: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  room_id: string;
  nickname: string;
  is_host: boolean;
  origin_label: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  room_id: string;
  kind: StationKind;
  number: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  lines: string[];
  max_minutes: number | null;
  avg_minutes: number | null;
  over90: boolean;
  approximate: boolean;
}

export interface Vote {
  participant_id: string;
  room_id: string;
  candidate_id: string;
  updated_at: string;
}

export interface TravelTime {
  participant_id: string;
  station_name: string;
  station_lat: number;
  station_lng: number;
  minutes: number;
  route: string | null;
}

// ---- API 계약 ----

/** 모든 API 에러 응답 형태. */
export interface ApiError {
  error: string;
  code?: "ROOM_NOT_FOUND" | "ROOM_FULL" | "NICKNAME_TAKEN" | "INVALID_INPUT" | "FORBIDDEN";
}

/** POST /api/rooms */
export interface CreateRoomRequest {
  name?: string;
  category?: PlaceCategory;
}
export interface CreateRoomResponse {
  roomId: string;
  hostId: string;
}

/** POST /api/rooms/[id]/participants — 방장이 가입할 때는 hostId 를 함께 보낸다. */
export interface JoinRoomRequest {
  nickname: string;
  lat?: number;
  lng?: number;
  label?: string;
  hostId?: string;
}
export interface JoinRoomResponse {
  participantId: string;
}

/** PATCH /api/rooms/[id]/participants — 출발지 저장·변경 (B 가 사용). */
export interface UpdateOriginRequest {
  participantId: string;
  lat: number;
  lng: number;
  label: string;
}
export interface UpdateOriginResponse {
  ok: true;
}

/** PATCH /api/rooms/[id] — 방장이 상태·카테고리를 바꾼다 (C·D 가 사용). */
export interface UpdateRoomRequest {
  hostId: string;
  status?: RoomStatus;
  category?: PlaceCategory;
}
export interface UpdateRoomResponse {
  ok: true;
}

/** GET /api/places/search?q= (B) */
export interface PlaceSearchResponse {
  results: { name: string; address: string; lat: number; lng: number }[];
}

/** POST /api/rooms/[id]/midpoint (C) */
export interface MidpointRequest {
  hostId: string;
}
export interface MidpointRoute {
  participantId: string;
  route: string;
  minutes: number;
}
export interface MidpointStation {
  name: string;
  kind: StationKind;
  lines: string[];
  lat: number;
  lng: number;
  maxMinutes: number;
  avgMinutes: number;
  over90: boolean;
  routes: MidpointRoute[];
}
export interface MidpointResponse {
  stations: MidpointStation[];
  approximate: boolean;
  /** 이전 계산의 1순위와 이번 1순위가 다르면 true ("1순위가 △△으로 바뀌었어요" 안내용). */
  topChanged: boolean;
  /** 이전 계산의 1순위 역 이름. 처음 계산이면 null. */
  previousTop: string | null;
}

/** POST /api/rooms/[id]/places (D) */
export interface PlacesRequest {
  hostId: string;
  category: PlaceCategory;
  stationName: string;
}
export interface PlacesResponse {
  candidates: Candidate[];
}

/** POST /api/rooms/[id]/vote (D) */
export interface VoteRequest {
  participantId: string;
  candidateId: string;
  /** true 면 투표, false 면 내 표 취소. 마감 후에는 서버가 거부한다. */
  on: boolean;
}
export interface VoteResponse {
  ok: true;
}

/** POST /api/rooms/[id]/deadline (D, 방장만) — minutes·closeNow·reopen 중 하나를 보낸다. */
export interface DeadlineRequest {
  hostId: string;
  minutes?: 30 | 60 | 180 | 1440;
  closeNow?: boolean;
  reopen?: boolean;
}
export interface DeadlineResponse {
  voteDeadline: string | null;
  status: RoomStatus;
}
