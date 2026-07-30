// 표시 파생 규칙 (플랫폼 공용 계약 — 판매자 앱 appStore 와 동일)
// DB는 원시값만 저장하고, 표시 문자열/뱃지/거리는 클라이언트가 파생한다.

export function storageToDisplay(short) {
  return { '냉장': '냉장 보관', '실온': '실온 보관', '냉동': '냉동 보관' }[short] || short || '';
}

export function allergensToString(arr) {
  if (!arr || arr.length === 0) return '해당 없음';
  return arr.join(', ') + ' 함유';
}

// 상품 뱃지 (마감임박 / 오늘까지 / 할인N%) — 판매자 computeBadges 와 동일 규칙
export function computeBadges(p) {
  const badges = [];
  if (p.status === 'soldout' || p.stock === 0) { badges.push('품절'); return badges; }
  if (p.status !== 'selling') return badges;
  const now = new Date();
  const expiry = p.expiryDate ? new Date(p.expiryDate) : null;
  if (p.discountRate >= 60) badges.push(`할인${p.discountRate}%`);
  if (expiry) {
    const hoursUntil = (expiry - now) / 3600000;
    if (hoursUntil <= 3 && hoursUntil > 0) badges.push('마감임박');
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    if (expiry <= endOfDay) badges.push('오늘까지');
  }
  return badges;
}

// 두 좌표 사이 거리(m) — Haversine
export function distanceMeters(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ───────── 픽업 마감(절대 시각) ─────────
// 정본은 products/orders 의 pickup_deadline_at(timestamptz).
// 아래 formatDeadlineDuration / formatDeadlineTime 은 마감 시각이 없는 구 데이터 폴백용으로만 남긴다.

// pickup_deadline_at(ISO) → '오늘 20:50까지' / '내일 09:00까지' / '7.31 09:00까지'
export function formatDeadlineClock(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((day - today) / 86400000);
  const dayLabel = dayDiff === 0 ? '오늘'
    : dayDiff === 1 ? '내일'
    : dayDiff === -1 ? '어제'
    : `${d.getMonth() + 1}.${d.getDate()}`;
  return `${dayLabel} ${hm}까지`;
}

// 마감까지 남은 분(음수면 이미 마감). 값이 없으면 null.
export function minutesUntilDeadline(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / 60000);
}

// 마감 임박(기본 30분 이내 · 아직 지나지 않음) — 서버 알림(send_pickup_reminders)과 같은 기준.
export function isDeadlineSoon(iso, thresholdMin = 30) {
  const left = minutesUntilDeadline(iso);
  return left != null && left >= 0 && left <= thresholdMin;
}

// (하위 호환) 픽업 마감 시간(분) → '주문 후 30분 이내 / 1시간 이내 / 1시간 30분 이내 / 2시간 이내'
export function formatDeadlineDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `주문 후 ${minutes}분 이내`;
  if (minutes % 60 === 0) return `주문 후 ${minutes / 60}시간 이내`;
  return `주문 후 ${Math.floor(minutes / 60)}시간 ${minutes % 60}분 이내`;
}

// (하위 호환) orderedAt(ISO) + deadlineMinutes → '오후 3:30까지'
export function formatDeadlineTime(orderedAt, deadlineMinutes) {
  if (!orderedAt || !deadlineMinutes) return '';
  const d = new Date(new Date(orderedAt).getTime() + deadlineMinutes * 60000);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? '오후' : '오전';
  const hDisplay = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${ampm} ${hDisplay}:${m}까지`;
}

// (하위 호환) 픽업 윈도우 표기 — 구버전 DB 데이터용
export function formatPickupWindow(start, end) {
  if (!start) return '';
  const s = new Date(start);
  const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sDay = new Date(s); sDay.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((sDay - today) / 86400000);
  const dayLabel = dayDiff === 0 ? '오늘' : dayDiff === -1 ? '어제' : dayDiff === 1 ? '내일' : `${s.getMonth() + 1}.${s.getDate()}`;
  return `${dayLabel} ${hm(s)}${end ? '~' + hm(new Date(end)) : ''}`;
}

// created_at → 'YYYY.MM.DD' (리뷰 날짜)
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// created_at → 상대시간 (알림)
export function formatRelativeTime(iso) {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;
  return formatDate(iso);
}

// open_hours(jsonb) → '10:00 ~ 22:00' (대표 영업시간). allSame면 공통, 아니면 첫 영업요일 기준.
export function businessHoursLabel(openHours) {
  if (!openHours) return '';
  if (openHours.allSame && openHours.sameOpen) return `${openHours.sameOpen} ~ ${openHours.sameClose}`;
  const days = openHours.days || {};
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const first = order.find(k => days[k]?.isOpen);
  return first ? `${days[first].open} ~ ${days[first].close}` : '휴무';
}

// 매장 카테고리 → 이모지 (stores 테이블엔 emoji 컬럼이 없어 파생)
export function categoryEmoji(cat) {
  const map = { '샐러드': '🥗', '빵': '🥐', '도시락': '🍱', '디저트': '🍰', '반찬': '🥡', '음료': '☕', '과일': '🍎', '정육': '🥩', '수산': '🐟' };
  return map[cat] || '🍽️';
}

// ───────── 결제수단 표시 ─────────
// user_payment_prefs.default_method(enum) → 한글 라벨.
// 계좌이체/가상계좌는 입금 지연·웹훅 처리가 없어 앱에서 선택지로 제공하지 않지만,
// DB 제약(check)에 존재하는 값이므로 표시 라벨은 갖춰둔다.
export const PAYMENT_METHOD_LABEL = {
  CARD: '카드',
  EASY_PAY: '간편결제',
  TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
};

// 토스페이먼츠 '간편결제사 코드' → 한글명 (docs.tosspayments.com/codes/org-codes)
export const EASY_PAY_LABEL = {
  TOSSPAY: '토스페이',
  KAKAOPAY: '카카오페이',
  NAVERPAY: '네이버페이',
  PAYCO: '페이코',
  SAMSUNGPAY: '삼성페이',
  APPLEPAY: '애플페이',
  LPAY: '엘페이',
  SSG: 'SSG페이',
  PINPAY: '핀페이',
};

// 결제수단 라벨 — orders.payment_method 에는 토스 승인 응답의 method 가 저장되므로
// 이미 한글('카드'/'간편결제'/'계좌이체'…)인 경우가 많다. enum 코드면 한글로 바꾸고,
// 아니면 원문을 그대로 보여준다(모르는 값을 임의로 바꾸지 않는다).
export function paymentMethodLabel(v) {
  if (!v) return '';
  return PAYMENT_METHOD_LABEL[v] || EASY_PAY_LABEL[v] || String(v);
}

// 주문 상태 매핑: DB seller_status → 구매자 관점 status
// (API_SPEC §5: 구매자 관점 = ORDER_SELLER_STATUS[x].userStatus)
export const ORDER_STATUS = {
  new:       { key: 'pickupReady', label: '픽업대기', color: '#22A06B' },
  confirmed: { key: 'pickupReady', label: '픽업대기', color: '#22A06B' },
  completed: { key: 'completed',   label: '픽업완료', color: '#9AA3AF' },
  cancelled: { key: 'cancelled',   label: '주문취소', color: '#E5484D' },
};
