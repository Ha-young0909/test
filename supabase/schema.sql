-- 약속 장소 투표 지도 스키마. Supabase SQL Editor에서 한 번 실행한다.
--
-- 접근 제어 한계 (README에도 명시):
-- 로그인이 없으므로 "방 ID(uuid)를 아는 사람"만 방을 찾을 수 있다는 정도의 단순한 제어다.
-- 모든 쓰기는 서버(Route Handler)가 service role 키로 수행하고, 브라우저(anon 키)는 읽기만 한다.
-- 단, anon 읽기는 방 ID를 몰라도 테이블 전체를 조회할 수 있으므로 민감한 데이터를 넣지 않는다.
-- rooms.host_id(방장 권한 토큰)만은 anon 에게 열지 않는다.

create extension if not exists pgcrypto;

-- 방
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default gen_random_uuid(), -- 방장 토큰. anon 에게 노출 금지
  name text check (char_length(name) between 1 and 20), -- 방장이 정하는 모임 이름
  category text check (category in ('restaurant', 'cafe', 'bar')),
  status text not null default 'collecting' check (status in ('collecting', 'voting')),
  created_at timestamptz not null default now()
);

-- 참여자
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 12),
  is_host boolean not null default false,
  origin_label text,
  origin_lat double precision,
  origin_lng double precision,
  created_at timestamptz not null default now(),
  unique (room_id, nickname)
);
create index if not exists participants_room_idx on participants(room_id);

-- 참여자 2~6명 제한 중 상한 6명을 DB에서 보장한다 (동시 가입 경합 방지).
create or replace function enforce_max_participants() returns trigger as $$
begin
  perform 1 from rooms where id = new.room_id for update;
  if (select count(*) from participants where room_id = new.room_id) >= 6 then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists participants_max on participants;
create trigger participants_max before insert on participants
  for each row execute function enforce_max_participants();

-- 후보 (중간 역 후보와 추천 장소 후보 공용)
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  kind text not null check (kind in ('station', 'place')),
  number int not null,                  -- 지도 핀과 목록에 표시되는 후보 번호
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  station_name text,                    -- kind = 'place' 일 때 기준 역
  max_minutes int,                      -- 가장 오래 걸리는 사람의 이동 시간
  avg_minutes int,
  over90 boolean not null default false,
  approximate boolean not null default false, -- 평균 좌표 폴백 여부
  created_at timestamptz not null default now()
);
create index if not exists candidates_room_idx on candidates(room_id, kind);

-- 이동 시간 캐시 (참여자 × 후보역). 출발지가 바뀌면 서버가 해당 참여자 행을 지운다.
create table if not exists travel_times (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  station_name text not null,
  station_lat double precision not null,
  station_lng double precision not null,
  minutes int not null,
  created_at timestamptz not null default now(),
  unique (participant_id, station_name)
);

-- 투표: 참여자당 한 행. 같은 행을 덮어써서 표를 바꾼다 (upsert on participant_id).
create table if not exists votes (
  participant_id uuid primary key references participants(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index if not exists votes_room_idx on votes(room_id);

-- RLS: anon 은 읽기만. 쓰기 정책을 만들지 않으므로 anon 쓰기는 모두 거부된다.
alter table rooms enable row level security;
alter table participants enable row level security;
alter table candidates enable row level security;
alter table votes enable row level security;
alter table travel_times enable row level security; -- 정책 없음: 서버 전용 캐시

drop policy if exists "anon read rooms" on rooms;
drop policy if exists "anon read participants" on participants;
drop policy if exists "anon read candidates" on candidates;
drop policy if exists "anon read votes" on votes;
create policy "anon read rooms" on rooms for select to anon using (true);
create policy "anon read participants" on participants for select to anon using (true);
create policy "anon read candidates" on candidates for select to anon using (true);
create policy "anon read votes" on votes for select to anon using (true);

-- 방장 토큰 컬럼은 anon 이 읽지 못하게 컬럼 단위로 권한을 준다.
revoke all on rooms from anon, authenticated;
grant select (id, name, category, status, created_at) on rooms to anon;

-- 투표 실시간 반영(Supabase Realtime)을 쓰려면 아래를 켠다.
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table rooms;
