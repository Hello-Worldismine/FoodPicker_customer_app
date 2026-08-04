// 구매자 전용 Supabase Realtime 구독 헬퍼.
//
// [배경] 사용자앱은 로그인 시 1회 로드 + '내 액션 뒤 재조회' 뿐이라, 판매자가 QR 스캔으로
//        픽업완료(complete_pickup → orders.seller_status='completed')를 눌러도 화면이 그대로였다.
//        orders / buyer_notifications 는 이미 supabase_realtime publication 에 포함돼 있고
//        RLS(orders_buyer_read: buyer_id = auth.uid())가 걸려 있으므로 본인 것만 수신된다.
//
// [주의] UPDATE payload 의 old 는 REPLICA IDENTITY 가 FULL 이 아니면 비어 있다.
//        '무엇이 바뀌었는지' 판정은 구독자(AppContext)가 직전 로컬 상태와 비교해서 한다.
import { supabase } from './supabase';

// 채널 토픽 — uid 별 1개만 유지한다(중복 구독 방지).
const topicOf = (uid) => `buyer-orders-${uid}`;

// 같은 토픽으로 이미 열린 채널이 있으면 정리한다.
// (로그아웃→재로그인, Fast Refresh, StrictMode 이중 마운트 등에서 중복 구독이 쌓이는 것을 막는다)
function removeExistingChannels(topic) {
  try {
    supabase.getChannels()
      .filter(ch => ch.topic === topic || ch.topic === `realtime:${topic}`)
      .forEach(ch => { supabase.removeChannel(ch); });
  } catch (e) {
    console.warn('[realtime] 기존 채널 정리 실패:', e.message);
  }
}

/**
 * 구매자 실시간 구독을 건다.
 * @param {string} uid 로그인한 구매자 id (auth.users.id)
 * @param {object} handlers
 *   - onOrderUpdate(payload)        : 내 주문 UPDATE (픽업완료/취소 등 판매자 측 변경 포함)
 *   - onNotificationInsert(payload) : 내 알림 INSERT (마감 30분 전 알림 등)
 *   - onStatusChange(status)        : 채널 상태('SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED')
 * @returns {() => void} 구독 해제 함수(멱등)
 */
export function subscribeBuyerRealtime(uid, handlers = {}) {
  if (!uid) return () => {};
  const { onOrderUpdate, onNotificationInsert, onStatusChange } = handlers;
  const topic = topicOf(uid);
  removeExistingChannels(topic);

  // 핸들러가 던져도 채널이 죽지 않도록 감싼다.
  const safe = (fn, tag) => (payload) => {
    try { fn && fn(payload); } catch (e) { console.warn(`[realtime] ${tag} 처리 실패:`, e.message); }
  };

  const channel = supabase
    .channel(topic)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `buyer_id=eq.${uid}` },
      safe(onOrderUpdate, 'orders UPDATE'),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'buyer_notifications', filter: `buyer_id=eq.${uid}` },
      safe(onNotificationInsert, 'buyer_notifications INSERT'),
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[realtime] 구독 상태:', status);
      }
      try { onStatusChange && onStatusChange(status); } catch (e) {}
    });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    try { supabase.removeChannel(channel); } catch (e) { console.warn('[realtime] 구독 해제 실패:', e.message); }
  };
}
