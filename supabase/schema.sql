-- 제철 수산물 시세 조회 서비스 스키마
-- 권역: east(동해) · west(서해) · south(남해) · jeju(제주)

-- 어종
create table seafood (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text,
  image_url text
);

-- 제철 (어종 × 권역 × 월)
create table seafood_seasons (
  seafood_id bigint not null references seafood(id) on delete cascade,
  region text not null check (region in ('east', 'west', 'south', 'jeju')),
  month smallint not null check (month between 1 and 12),
  primary key (seafood_id, region, month)
);

create index seafood_seasons_region_month_idx on seafood_seasons (region, month);

-- 시세 이력 (일 1회 수집, 원/kg)
-- region이 null이면 전국 평균 (지역별 가격이 없을 때)
create table seafood_prices (
  id bigint generated always as identity primary key,
  seafood_id bigint not null references seafood(id) on delete cascade,
  region text check (region in ('east', 'west', 'south', 'jeju')),
  price integer not null check (price > 0),
  recorded_at date not null default current_date,
  source text                            -- 수집처 (예: 'kamis', 'fips')
);

-- (어종, 권역, 날짜)당 한 건. 전국 평균(null)도 하나로 취급한다
create unique index seafood_prices_unique_idx
  on seafood_prices (seafood_id, coalesce(region, 'all'), recorded_at);
create index seafood_prices_latest_idx
  on seafood_prices (seafood_id, recorded_at desc);

-- 함께 먹으면 좋은 음식 (AI 생성 후 캐시, 어종당 1회 생성)
create table pairings (
  id bigint generated always as identity primary key,
  seafood_id bigint not null references seafood(id) on delete cascade,
  name text not null,
  note text,
  generated_by text,                     -- 생성 모델 (예: 'claude-haiku-5-5')
  generated_at timestamptz not null default now()
);

create index pairings_seafood_idx on pairings (seafood_id);

-- 조회 전용 서비스: 읽기만 공개, 쓰기는 service role(서버)만 가능
alter table seafood enable row level security;
alter table seafood_seasons enable row level security;
alter table seafood_prices enable row level security;
alter table pairings enable row level security;

create policy "public read" on seafood for select using (true);
create policy "public read" on seafood_seasons for select using (true);
create policy "public read" on seafood_prices for select using (true);
create policy "public read" on pairings for select using (true);
