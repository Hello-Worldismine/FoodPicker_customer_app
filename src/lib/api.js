// 소비자 앱 데이터 접근 계층 — Supabase 공개 뷰 + 구매자 소유 테이블 + 서버 RPC.
// DB(snake_case) ↔ 앱(camelCase) 매핑 + 표시 파생(format.js).
import { supabase } from './supabase';
import * as fmt from './format';

// 거리 계산 기준 위치(임시: 강남역). 추후 expo-location 으로 교체.
export const DEFAULT_LOCATION = { lat: 37.4979, lng: 127.0276 };
let userLoc = { ...DEFAULT_LOCATION };
export function setUserLocation(loc) { if (loc && loc.lat != null) userLoc = loc; }

const hm = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

async function currentUid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ───────── 매퍼 ─────────
function mapProductRow(r, storeRow, favProducts) {
  const p = {
    id: r.id,
    name: r.name,
    storeId: r.store_id,
    store: (storeRow && storeRow.name) || '',
    storeRating: storeRow && storeRow.rating != null ? Number(storeRow.rating) : 0,
    storeReviewCount: (storeRow && storeRow.review_count) || 0,
    emoji: r.emoji,
    image: r.thumbnail || (r.images && r.images[0]) || null,
    category: r.category,
    originalPrice: r.original_price,
    salePrice: r.sale_price,
    discountRate: r.discount_rate,
    stock: r.stock,
    pickupDeadlineMinutes: r.pickup_deadline_minutes,
    expiryDate: r.expiry_date,
    storage: fmt.storageToDisplay(r.storage),
    status: r.status,
    description: r.description,
    composition: r.composition,
    origin: r.origin,
    allergyInfo: fmt.allergensToString(r.allergens),
    storageMethod: r.storage_detail,
    pickupAddress: r.pickup_address,
    cancelPolicy: r.cancel_policy,
    storeNotice: r.store_notice,
    lat: r.lat,
    lng: r.lng,
    distance: fmt.distanceMeters(userLoc.lat, userLoc.lng, r.lat, r.lng) ?? 0,
    liked: favProducts.has(r.id),
  };
  p.badges = fmt.computeBadges(p);
  return p;
}

function mapStoreRow(r, storeProductRows, favStores) {
  const selling = (storeProductRows || []).filter(p => p.status === 'selling');
  const closingSoon = selling.some(p => {
    if (!p.expiry_date) return false;
    const h = (new Date(p.expiry_date) - new Date()) / 3600000;
    return h > 0 && h <= 3;
  });
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    subcategory: r.category,
    emoji: fmt.categoryEmoji(r.category),
    image: r.store_image,
    lat: r.lat,
    lng: r.lng,
    address: r.address,
    phone: r.phone,
    notice: r.notice,
    description: r.description,
    tags: r.tags || [],
    rating: r.rating != null ? Number(r.rating) : 0,
    reviewCount: r.review_count || 0,
    businessHours: fmt.businessHoursLabel(r.open_hours),
    productCount: selling.length,
    pickupTime: '',
    distance: fmt.distanceMeters(userLoc.lat, userLoc.lng, r.lat, r.lng) ?? 0,
    status: selling.length === 0 ? 'soldout' : closingSoon ? 'closing' : 'selling',
    liked: favStores.has(r.id),
  };
}

function mapOrder(r) {
  return {
    id: r.order_code,
    productId: r.product_id,
    productName: r.product_name,
    store: r.store_name,
    storeId: r.store_id,
    storeAddress: r.store_address,
    pickupDeadlineMinutes: r.pickup_deadline_minutes,
    pickupDeadline: fmt.formatDeadlineTime(r.ordered_at, r.pickup_deadline_minutes),
    quantity: r.quantity,
    totalPrice: r.total_price,
    discountedPrice: r.amount,
    couponName: null,
    status: (fmt.ORDER_STATUS[r.seller_status] || {}).key || 'pickupReady',
    sellerStatus: r.seller_status,
    orderedAt: r.ordered_at,
  };
}

function mapReview(r) {
  return {
    id: r.id,
    user: r.reviewer_name,
    rating: r.rating,
    text: r.content,
    date: fmt.formatDate(r.created_at),
    helpful: r.helpful_count,
    ownerReply: r.owner_reply,
    images: r.images || [],
  };
}

function mapCoupon(r) {
  return {
    id: r.code || r.id,
    couponId: r.id,
    code: r.code,
    name: r.name,
    discountType: r.discount_type === 'amount' ? '정액' : '정률',
    discountValue: r.discount_value,
    maxDiscountAmount: r.max_discount_amount,   // 정률 상한
    minOrderAmount: r.min_order_amount,
    endDate: r.ends_on ? String(r.ends_on).replace(/-/g, '.') : '',
    allowStacking: !!r.allow_stacking,          // 중복 사용 가능
    source: r.source,                           // 'admin' | 'seller'
    sellerId: r.seller_id,                      // 매장 전용(점주 발행) 식별
  };
}

function mapAddress(r) {
  return { id: r.id, label: r.label, icon: r.icon, address: r.address, detail: r.detail, isDefault: r.is_default };
}

function mapNotification(r) {
  return { id: r.id, type: r.type, title: r.title, message: r.message, read: r.is_read, createdAt: r.created_at };
}

// ───────── 찜 집합 ─────────
async function fetchFavoriteSets() {
  const { data, error } = await supabase.from('favorites').select('product_id, store_id');
  const products = new Set(), stores = new Set();
  if (!error) (data || []).forEach(f => { if (f.product_id) products.add(f.product_id); if (f.store_id) stores.add(f.store_id); });
  return { products, stores };
}

// ───────── 카탈로그(상품+매장, 찜/거리/조인 반영) ─────────
export async function loadCatalog() {
  const [storesRes, productsRes, favs] = await Promise.all([
    supabase.from('public_stores').select('*'),
    supabase.from('public_products').select('*').order('created_at', { ascending: false }),
    fetchFavoriteSets(),
  ]);
  if (storesRes.error) throw storesRes.error;
  if (productsRes.error) throw productsRes.error;

  const storeRows = storesRes.data || [];
  const prodRows = productsRes.data || [];
  const storeById = {};
  storeRows.forEach(s => { storeById[s.id] = s; });
  const byStore = {};
  prodRows.forEach(r => { (byStore[r.store_id] = byStore[r.store_id] || []).push(r); });

  const products = prodRows.map(r => mapProductRow(r, storeById[r.store_id], favs.products));
  const stores = storeRows.map(r => mapStoreRow(r, byStore[r.id], favs.stores));
  return { products, stores };
}

// ───────── 찜 토글 ─────────
export async function toggleProductFavorite(productId, liked) {
  if (liked) {
    const { error } = await supabase.from('favorites').delete().eq('product_id', productId);
    if (error) throw error;
  } else {
    const uid = await currentUid();
    const { error } = await supabase.from('favorites').insert({ buyer_id: uid, product_id: productId });
    if (error) throw error;
  }
}
export async function toggleStoreFavorite(storeId, liked) {
  if (liked) {
    const { error } = await supabase.from('favorites').delete().eq('store_id', storeId);
    if (error) throw error;
  } else {
    const uid = await currentUid();
    const { error } = await supabase.from('favorites').insert({ buyer_id: uid, store_id: storeId });
    if (error) throw error;
  }
}

// ───────── 주문 ─────────
export async function fetchMyOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('ordered_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrder);
}
export async function createOrder(productId, quantity = 1, couponIds = []) {
  const { data, error } = await supabase.rpc('create_order', {
    p_product_id: productId, p_quantity: quantity, p_coupon_ids: couponIds || [],
  });
  if (error) throw error;
  return mapOrder(data);
}
export async function cancelOrder(orderCode) {
  // 본인 주문이 픽업 전(new/confirmed)일 때만 취소(서버 RPC, 재고 복구 포함).
  const { data, error } = await supabase.rpc('cancel_my_order', { p_order_code: orderCode });
  if (error) throw error;
  return mapOrder(data);
}

// ───────── 리뷰 ─────────
export async function fetchProductReviews(productId) {
  const { data, error } = await supabase.from('public_reviews').select('*')
    .eq('product_id', productId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReview);
}
export async function fetchStoreReviews(storeId) {
  const { data, error } = await supabase.from('public_reviews').select('*')
    .eq('store_id', storeId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReview);
}
// 리뷰 '도움돼요' 토글 → { helpful_count, voted }
export async function toggleReviewHelpful(reviewId) {
  const { data, error } = await supabase.rpc('toggle_review_helpful', { p_review_id: reviewId });
  if (error) throw error;
  return data;
}
// 내가 '도움돼요' 누른 리뷰 id 집합
export async function fetchMyHelpfulVotes() {
  const { data, error } = await supabase.from('review_helpful').select('review_id');
  if (error) return new Set();
  return new Set((data || []).map(r => r.review_id));
}

export async function createReview(orderCode, rating, content, images = []) {
  const { error } = await supabase.rpc('create_review', {
    p_order_code: orderCode, p_rating: rating, p_content: content, p_images: images,
  });
  if (error) throw error;
}

// 리뷰 사진 업로드 → review-images 버킷의 <uid>/<파일명> 경로. 공개 URL 반환.
export async function uploadReviewImage(uri) {
  const uid = await currentUid();
  if (!uid) throw new Error('not authenticated');
  const res = await fetch(uri);
  const arrayBuffer = await res.arrayBuffer();
  const ext = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${uid}/${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from('review-images')
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('review-images').getPublicUrl(path);
  return data.publicUrl;
}

// ───────── 가격 흐름 이력 ─────────
export async function fetchPriceHistory(productId) {
  const { data, error } = await supabase.from('public_price_history').select('*')
    .eq('product_id', productId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    time: hm(r.created_at),
    price: r.new_price,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

// ───────── 주소 ─────────
export async function fetchAddresses() {
  const { data, error } = await supabase.from('user_addresses').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapAddress);
}
export async function addAddress(addr) {
  const uid = await currentUid();
  const { data, error } = await supabase.from('user_addresses')
    .insert({ buyer_id: uid, label: addr.label, icon: addr.icon || 'pin', address: addr.address, detail: addr.detail })
    .select().single();
  if (error) throw error;
  return mapAddress(data);
}
export async function updateAddress(id, patch) {
  const { error } = await supabase.from('user_addresses')
    .update({ label: patch.label, icon: patch.icon, address: patch.address, detail: patch.detail })
    .eq('id', id);
  if (error) throw error;
}
export async function deleteAddress(id) {
  const { error } = await supabase.from('user_addresses').delete().eq('id', id);
  if (error) throw error;
}

// ───────── 쿠폰(내 쿠폰함: user_coupons ← coupons) ─────────
function mapUserCoupon(r) {
  const c = r.coupons || {};
  return {
    ...mapCoupon(c),
    ownedId: r.id,
    isUsed: r.is_used,
    usedAt: r.used_at ? String(r.used_at).slice(0, 10).replace(/-/g, '.') : '',
  };
}
export async function fetchMyCoupons() {
  const { data, error } = await supabase.from('user_coupons')
    .select('id, is_used, used_at, coupons(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []).map(mapUserCoupon);
  return { available: rows.filter(c => !c.isUsed), used: rows.filter(c => c.isUsed) };
}
// 코드로 쿠폰 정보 미리보기 (등록하지 않음)
export async function previewCoupon(code) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code.trim())
    .single();
  if (error) throw new Error('유효하지 않은 쿠폰 코드입니다.');
  return mapCoupon(data);
}
// 코드 등록 → 내 쿠폰함에 담기(서버 검증). 등록된 쿠폰 반환.
export async function redeemCoupon(code) {
  const { data, error } = await supabase.rpc('redeem_coupon', { p_code: code });
  if (error) throw error;
  return mapCoupon(data);
}
// 매장 전용 쿠폰(점주 발행) 목록 — 매장 페이지 노출용.
export async function fetchStoreCoupons(storeId) {
  const { data, error } = await supabase.rpc('store_coupons', { p_store_id: storeId });
  if (error) throw error;
  return (data || []).map(mapCoupon);
}
// 쿠폰 다운로드(내 쿠폰함에 담기).
export async function claimCoupon(couponId) {
  const { data, error } = await supabase.rpc('claim_coupon', { p_coupon_id: couponId });
  if (error) throw error;
  return mapCoupon(data);
}

// ───────── 가격 알림 ─────────
function mapPriceAlert(r) {
  return { id: r.id, productId: r.product_id, targetPrice: r.target_price, notifiedAt: r.notified_at };
}
export async function fetchPriceAlerts() {
  const { data, error } = await supabase.from('price_alerts').select('*');
  if (error) throw error;
  return (data || []).map(mapPriceAlert);
}
export async function setPriceAlert(productId, targetPrice) {
  const uid = await currentUid();
  const { data, error } = await supabase.from('price_alerts')
    .upsert({ buyer_id: uid, product_id: productId, target_price: targetPrice, notified_at: null },
            { onConflict: 'buyer_id,product_id' })
    .select().single();
  if (error) throw error;
  return mapPriceAlert(data);
}
export async function removePriceAlert(productId) {
  const { error } = await supabase.from('price_alerts').delete().eq('product_id', productId);
  if (error) throw error;
}

// ───────── 회원 탈퇴 ─────────
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
}

// ───────── 알림 ─────────
export async function fetchNotifications() {
  const { data, error } = await supabase.from('buyer_notifications').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNotification);
}
export async function markNotifRead(id) {
  const { error } = await supabase.from('buyer_notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}
export async function markAllNotifRead() {
  const { error } = await supabase.from('buyer_notifications').update({ is_read: true }).eq('is_read', false);
  if (error) throw error;
}

// ───────── FAQ (관리자 웹에서 관리 — faqs 테이블, 20260722 마이그레이션) ─────────
// is_active=true 만 RLS 로 공개(anon 포함). 카테고리 영문 키 → 화면 한글 라벨 매핑.
const FAQ_CATEGORY_LABEL = {
  order_payment: '주문 · 결제', pickup: '픽업', product_store: '상품 · 가게', account: '계정',
};
export async function fetchFaqs() {
  const { data, error } = await supabase
    .from('faqs')
    .select('id, category, question, answer, display_order')
    .eq('is_active', true) // RLS 만으로는 관리자 계정 로그인 시 비활성 FAQ 까지 내려옴 — 명시 필터
    .order('display_order', { ascending: true });
  if (error) throw error;
  // FAQScreen 이 기대하는 형태로 그룹핑: [{ category(한글), items: [{ q, a }] }]
  const order = ['order_payment', 'pickup', 'product_store', 'account'];
  return order
    .map(key => ({
      category: FAQ_CATEGORY_LABEL[key],
      items: (data || []).filter(r => r.category === key).map(r => ({ q: r.question, a: r.answer })),
    }))
    .filter(g => g.items.length > 0);
}

// ───────── 상품 미디어 (상태 무관 — public_product_media 뷰, 20260722 마이그레이션) ─────────
// public_products 는 selling 만 노출 → 품절/종료 상품의 리뷰쓰기 화면 사진 폴백용.
export async function fetchProductMedia(productId) {
  const { data, error } = await supabase
    .from('public_product_media')
    .select('id, emoji, thumbnail, images')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { emoji: data.emoji || null, image: data.thumbnail || (data.images && data.images[0]) || null };
}

// ───────── 1:1 문의 (관리자 웹 신고/문의관리 reports 테이블과 연동) ─────────
// create_report RPC(20260716 마이그레이션)가 접수번호 발번·RLS 검증을 서버에서 처리.
export async function createInquiry(type, title, content, orderCode = null) {
  // p_inquirer: 판매자 계정으로 사용자앱에 로그인해도 구매자 문의로 분류(관리자 웹 사용자 탭 유형 필터와 대응).
  // 20260722020000 마이그레이션 필요 — 미적용 DB(시그니처 불일치, PGRST202)면 구버전 시그니처로 재시도.
  const base = { p_type: type, p_title: title, p_content: content, p_order_code: orderCode };
  let { data, error } = await supabase.rpc('create_report', { ...base, p_inquirer: 'buyer' });
  if (error && error.code === 'PGRST202') {
    ({ data, error } = await supabase.rpc('create_report', base));
  }
  if (error) throw error;
  return { id: data.id, receiptCode: data.receipt_code };
}

// ───────── 배너 (관리자 웹에서 관리 — banners 테이블, 20260716 마이그레이션) ─────────
// is_active=true 만 RLS 로 공개. 게시 기간(start/end_date)은 클라이언트에서 판정.
export async function fetchActiveBanners() {
  const { data, error } = await supabase
    .from('banners')
    .select('id, title, image_url, link, position, start_date, end_date')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  return (data || [])
    .filter(b => (!b.start_date || b.start_date <= today) && (!b.end_date || b.end_date >= today))
    .map(b => ({
      id: b.id,
      title: b.title || '',
      imageUrl: b.image_url || null,
      link: b.link || '',
      position: b.position,
    }));
}
