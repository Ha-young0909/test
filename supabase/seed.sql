-- 데모 방 시드. schema.sql 실행 후 실행한다. 여러 번 실행해도 안전하다.
-- 홈 화면의 "데모 방 둘러보기" 링크(src/app/page.tsx)가 이 방 ID 를 가리킨다.
-- 참여자 3명(강남·홍대·잠실 근처)이 채워져 있어 바로 "중간 지점 찾기"를 시연할 수 있다.

insert into rooms (id, host_id, category, status)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000aa',
  null,
  'collecting'
)
on conflict (id) do update set status = 'collecting', category = null;

delete from participants where room_id = '00000000-0000-4000-8000-000000000001';

insert into participants (id, room_id, nickname, is_host, origin_label, origin_lat, origin_lng) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '민수', true,  '강남역',  37.4979, 127.0276),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', '지은', false, '홍대입구역', 37.5572, 126.9245),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', '현우', false, '잠실역',  37.5133, 127.1002);
