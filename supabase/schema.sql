-- 제철 수산물
create table seafood (
  id bigint generated always as identity primary key,
  name text not null,
  season_months int[] not null,          -- 제철 월 (예: {11,12,1,2})
  description text,
  image_url text
);

-- 시세 (가격 이력)
create table seafood_prices (
  id bigint generated always as identity primary key,
  seafood_id bigint not null references seafood(id) on delete cascade,
  price integer not null,                -- 원 / kg
  recorded_at date not null default current_date
);

-- 함께 먹으면 좋은 음식
create table pairings (
  id bigint generated always as identity primary key,
  seafood_id bigint not null references seafood(id) on delete cascade,
  name text not null,
  note text
);

alter table seafood enable row level security;
alter table seafood_prices enable row level security;
alter table pairings enable row level security;

create policy "public read" on seafood for select using (true);
create policy "public read" on seafood_prices for select using (true);
create policy "public read" on pairings for select using (true);
