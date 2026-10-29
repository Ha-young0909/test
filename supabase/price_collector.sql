-- 시세 수집 upsert용: 어종당 하루 한 건. (A의 schema.sql 머지 후 schema.sql에 합쳐도 된다)
create unique index if not exists seafood_prices_seafood_day_key
  on seafood_prices (seafood_id, recorded_at);
