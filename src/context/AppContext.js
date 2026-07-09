import React, { createContext, useContext, useState } from 'react';
import { products as initialProducts, mockOrders, mockCoupons } from '../data/mockData';

// TODO: 백엔드 연동 시 이 파일의 모든 mock 데이터와 로컬 상태를
//       실제 API 호출로 교체합니다. 각 함수마다 주석을 참고하세요.

// TODO: 로그인 구현 후 INITIAL_ADDRESSES를 GET /api/users/me/addresses 로 교체
const INITIAL_ADDRESSES = [
  { id: 1, label: '우리집',         icon: 'home',     address: '서울 마포구 와우산로 94 신촌아이파크 101동 1502호' },
  { id: 2, label: '회사',           icon: 'building', address: '서울 강남구 테헤란로 427 위워크타워 8층' },
  { id: 3, label: '부모님댁',       icon: 'pin',      address: '경기 성남시 분당구 정자일로 95 파크뷰아파트 203동 1201호' },
  { id: 4, label: '역삼동 스터디카페', icon: 'pin',   address: '서울 강남구 역삼로 168 센터빌딩 5층' },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // TODO: useState(initialProducts) → useEffect 내 GET /api/products 호출로 교체
  const [productList, setProductList] = useState(initialProducts);

  // TODO: useState(mockOrders) → useEffect 내 GET /api/orders 호출로 교체
  const [orders, setOrders] = useState(mockOrders);

  // TODO: likedStores → 로그인 후 GET /api/users/me/liked-stores 로 초기화
  const [likedStores, setLikedStores] = useState([]);

  // TODO: addresses → 로그인 후 GET /api/users/me/addresses 로 초기화
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [currentAddressId, setCurrentAddressId] = useState(1);

  // TODO: coupons → GET /api/coupons?available=true 로 교체
  const coupons = mockCoupons;

  const currentAddress = addresses.find(a => a.id === currentAddressId) || addresses[0];

  function handleSelectAddress(id) {
    // TODO: PATCH /api/users/me/addresses/current  { addressId: id }
    setCurrentAddressId(id);
  }

  function handleAddAddress(newAddr) {
    // TODO: POST /api/users/me/addresses  body: newAddr
    //       응답의 id(서버 발급)를 사용하도록 교체
    const id = Date.now();
    setAddresses(prev => [...prev, { ...newAddr, id }]);
    setCurrentAddressId(id);
  }

  function handleDeleteAddress(id) {
    // TODO: DELETE /api/users/me/addresses/:id
    setAddresses(prev => prev.filter(a => a.id !== id));
    if (currentAddressId === id) setCurrentAddressId(addresses.find(a => a.id !== id)?.id ?? null);
  }

  function handleUpdateAddress(updated) {
    // TODO: PUT /api/users/me/addresses/:id  body: updated
    setAddresses(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
  }

  function handleLike(productId) {
    // TODO: POST /api/products/:productId/like  (좋아요 토글)
    //       응답 상태에 따라 liked 값 업데이트
    setProductList(prev =>
      prev.map(p => p.id === productId ? { ...p, liked: !p.liked } : p)
    );
  }

  function handleStoreLike(storeId) {
    // TODO: POST /api/stores/:storeId/like  (관심 매장 토글)
    setLikedStores(prev =>
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  }

  function handleOrderComplete(order) {
    // TODO: 주문 생성은 OrderScreen에서 POST /api/orders 로 처리 후
    //       이 함수는 로컬 상태 갱신 또는 GET /api/orders 재호출로 교체
    setOrders(prev => [order, ...prev]);
  }

  function handleCancelOrder(orderId) {
    // TODO: POST /api/orders/:orderId/cancel
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o)
    );
  }

  return (
    <AppContext.Provider value={{
      productList,
      orders,
      coupons,
      likedStores,
      addresses,
      currentAddress,
      handleLike,
      handleStoreLike,
      handleSelectAddress,
      handleAddAddress,
      handleUpdateAddress,
      handleDeleteAddress,
      handleOrderComplete,
      handleCancelOrder,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
