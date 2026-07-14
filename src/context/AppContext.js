import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';
import { registerForPushNotifications } from '../lib/push';

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
      setPriceAlerts([]); setAddresses([]); setNotifications([]); setCurrentAddressId(null); setLoading(false);
    }
  }, [user, loadAll]);

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
    await api.cancelOrder(orderCode); // 실패 시 throw
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
