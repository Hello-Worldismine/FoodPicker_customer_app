import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';
import { registerForPushNotifications } from '../lib/push';
import { subscribeBuyerRealtime } from '../lib/realtime';

// 소비자 앱 전역 상태 — Supabase 실데이터. 세션(구매자) 기준으로 로드/초기화.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [productList, setProductList] = useState([]);
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [usedCoupons, setUsedCoupons] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentAddressId, setCurrentAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  // 화면 상단 안내 배너(OrderStatusToast) — { key, message, tone } | null
  const [toast, setToast] = useState(null);

  // Realtime 콜백에서 '직전 주문 상태'를 참조하기 위한 ref(상태 전이 판정용).
  const ordersRef = useRef([]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  // 사용자가 직접 취소한 주문 — 본인 액션의 결과를 Realtime 이 다시 안내하지 않도록 표시해 둔다.
  const selfCancelledRef = useRef(new Set());

  const showToast = useCallback((message, tone = 'info') => {
    if (!message) return;
    setToast({ key: `${Date.now()}-${Math.random()}`, message, tone });
  }, []);
  const hideToast = useCallback(() => { setToast(null); }, []);

  const reloadCatalog = useCallback(async () => {
    const { products, stores } = await api.loadCatalog();
    setProductList(products);
    setStores(stores);
  }, []);
  const reloadOrders = useCallback(async () => { setOrders(await api.fetchMyOrders()); }, []);
  const reloadNotifications = useCallback(async () => { setNotifications(await api.fetchNotifications()); }, []);
  const reloadCoupons = useCallback(async () => {
    const c = await api.fetchMyCoupons();
    setCoupons(c.available); setUsedCoupons(c.used);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    // 각 슬라이스를 독립적으로 로드 — 일부 실패(예: 마이그레이션 미적용)해도 나머지는 정상.
    const settle = async (p, fallback) => {
      try { return await p; } catch (e) { console.warn('[customer] 로드 실패:', e.message); return fallback; }
    };
    try {
      const [cat, ord, cpn, addr, notif, alerts] = await Promise.all([
        settle(api.loadCatalog(), { products: [], stores: [] }),
        settle(api.fetchMyOrders(), []),
        settle(api.fetchMyCoupons(), { available: [], used: [] }),
        settle(api.fetchAddresses(), []),
        settle(api.fetchNotifications(), []),
        settle(api.fetchPriceAlerts(), []),
      ]);
      setProductList(cat.products);
      setStores(cat.stores);
      setOrders(ord);
      setCoupons(cpn.available);
      setUsedCoupons(cpn.used);
      setAddresses(addr);
      setNotifications(notif);
      setPriceAlerts(alerts);
      setCurrentAddressId(prev => prev || (addr[0] && addr[0].id) || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAll();
      registerForPushNotifications().catch(() => {}); // 실기기 EAS 빌드에서만 실제 등록
    } else {
      setProductList([]); setStores([]); setOrders([]); setCoupons([]); setUsedCoupons([]);
      setPriceAlerts([]); setAddresses([]); setNotifications([]); setCurrentAddressId(null);
      setToast(null); setLoading(false);
    }
  }, [user, loadAll]);

  // ── 실시간 반영(구매자 전용 Realtime) ──
  // 판매자가 QR 스캔으로 픽업완료 처리하면 orders.seller_status 가 서버에서 바뀐다.
  // 사용자 액션이 없으므로 구독 없이는 앱에 도달할 경로가 없다 → 여기서 구독한다.
  useEffect(() => {
    if (!user) return undefined;
    const unsubscribe = subscribeBuyerRealtime(user.id, {
      onOrderUpdate: (payload) => {
        const row = (payload && payload.new) || {};
        // ⚠️ payload.old 는 REPLICA IDENTITY 가 FULL 이 아니면 비어 있다.
        //    → 직전 로컬 상태(order_code 기준)의 sellerStatus 와 비교해 전이를 판정한다.
        const prev = ordersRef.current.find(o => o.id === row.order_code);
        const before = prev ? prev.sellerStatus : null;
        if (row.seller_status === 'completed' && before !== 'completed') {
          showToast('픽업이 완료되었습니다', 'success');
        } else if (row.seller_status === 'cancelled' && before !== 'cancelled') {
          // 본인이 취소한 건이면 안내를 생략한다(이미 화면에서 확인한 결과).
          if (selfCancelledRef.current.has(row.order_code)) selfCancelledRef.current.delete(row.order_code);
          else showToast('주문이 취소되었습니다', 'warn');
        }
        // 주문만 다시 읽는다(카탈로그는 호출 비용이 커 여기서 갱신하지 않는다).
        reloadOrders().catch(e => console.warn('[realtime] 주문 재조회 실패:', e.message));
      },
      onNotificationInsert: () => {
        reloadNotifications().catch(e => console.warn('[realtime] 알림 재조회 실패:', e.message));
      },
    });
    return unsubscribe;
  }, [user, reloadOrders, reloadNotifications, showToast]);

  const likedStores = stores.filter(s => s.liked).map(s => s.id);
  const currentAddress = addresses.find(a => a.id === currentAddressId) || addresses[0] || null;

  // ── 찜(낙관적) ──
  function handleLike(productId) {
    const cur = productList.find(p => p.id === productId);
    const liked = !!(cur && cur.liked);
    setProductList(prev => prev.map(p => p.id === productId ? { ...p, liked: !liked } : p));
    api.toggleProductFavorite(productId, liked).catch(e => { console.warn('[찜]', e.message); reloadCatalog(); });
  }
  function handleStoreLike(storeId) {
    const cur = stores.find(s => s.id === storeId);
    const liked = !!(cur && cur.liked);
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, liked: !liked } : s));
    api.toggleStoreFavorite(storeId, liked).catch(e => { console.warn('[매장찜]', e.message); reloadCatalog(); });
  }

  // ── 주소 ──
  function handleSelectAddress(id) { setCurrentAddressId(id); }
  async function handleAddAddress(newAddr) {
    try {
      const a = await api.addAddress(newAddr);
      setAddresses(prev => [...prev, a]);
      setCurrentAddressId(a.id);
    } catch (e) { console.warn('[주소 추가]', e.message); }
  }
  async function handleUpdateAddress(updated) {
    try {
      await api.updateAddress(updated.id, updated);
      setAddresses(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    } catch (e) { console.warn('[주소 수정]', e.message); }
  }
  async function handleDeleteAddress(id) {
    try {
      await api.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      if (currentAddressId === id) setCurrentAddressId(addresses.find(a => a.id !== id)?.id ?? null);
    } catch (e) { console.warn('[주소 삭제]', e.message); }
  }

  // ── 주문 ──
  async function placeOrder(productId, quantity = 1, couponIds = []) {
    const order = await api.createOrder(productId, quantity, couponIds); // 실패 시 throw
    await Promise.all([reloadOrders(), reloadCatalog(), reloadCoupons()]);
    return order;
  }
  async function handleCancelOrder(orderCode) {
    selfCancelledRef.current.add(orderCode); // Realtime 중복 안내 방지
    try {
      await api.cancelOrder(orderCode); // 실패 시 throw
    } catch (e) {
      selfCancelledRef.current.delete(orderCode);
      throw e;
    }
    await Promise.all([reloadOrders(), reloadCatalog()]);
  }
  // 하위호환: 일부 화면이 handleOrderComplete(order) 호출 → 서버 재로딩으로 대체
  function handleOrderComplete() { reloadOrders(); reloadCatalog(); }

  // ── 리뷰 작성 ──
  async function submitReview(orderCode, rating, content, images = []) {
    await api.createReview(orderCode, rating, content, images); // 실패 시 throw
    await reloadOrders();
  }

  // ── 쿠폰 등록(코드) ──
  async function redeemCoupon(code) {
    await api.redeemCoupon(code); // 유효하지 않으면 throw
    await reloadCoupons();
  }

  // ── 가격 알림 ──
  async function addPriceAlert(productId, targetPrice) {
    const a = await api.setPriceAlert(productId, targetPrice); // 실패 시 throw
    setPriceAlerts(prev => [...prev.filter(x => x.productId !== productId), a]);
  }
  async function removePriceAlert(productId) {
    await api.removePriceAlert(productId); // 실패 시 throw
    setPriceAlerts(prev => prev.filter(x => x.productId !== productId));
  }

  // ── 위치(GPS) ──
  // 현재 좌표를 거리 계산 기준점으로 반영하고 카탈로그(거리) 재계산.
  async function updateLocation(coords) {
    if (!coords || coords.lat == null) return;
    api.setUserLocation(coords);
    await reloadCatalog();
  }

  // ── 알림 ──
  function markNotificationRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    api.markNotifRead(id).catch(() => reloadNotifications());
  }

  return (
    <AppContext.Provider value={{
      loading,
      productList,
      stores,
      orders,
      coupons,
      usedCoupons,
      priceAlerts,
      likedStores,
      addresses,
      currentAddress,
      notifications,
      handleLike,
      handleStoreLike,
      handleSelectAddress,
      handleAddAddress,
      handleUpdateAddress,
      handleDeleteAddress,
      handleOrderComplete,
      handleCancelOrder,
      placeOrder,
      submitReview,
      redeemCoupon,
      addPriceAlert,
      removePriceAlert,
      markNotificationRead,
      updateLocation,
      toast,
      showToast,
      hideToast,
      reloadOrders,
      reload: loadAll,
      fetchProductReviews: api.fetchProductReviews,
      fetchStoreReviews: api.fetchStoreReviews,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
