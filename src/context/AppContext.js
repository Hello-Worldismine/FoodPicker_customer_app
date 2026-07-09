import React, { createContext, useContext, useState } from 'react';
import { products as initialProducts, mockOrders, mockCoupons } from '../data/mockData';

const INITIAL_ADDRESSES = [
  { id: 1, label: '우리집',         icon: 'home',     address: '서울 마포구 와우산로 94 신촌아이파크 101동 1502호' },
  { id: 2, label: '회사',           icon: 'building', address: '서울 강남구 테헤란로 427 위워크타워 8층' },
  { id: 3, label: '부모님댁',       icon: 'pin',      address: '경기 성남시 분당구 정자일로 95 파크뷰아파트 203동 1201호' },
  { id: 4, label: '역삼동 스터디카페', icon: 'pin',   address: '서울 강남구 역삼로 168 센터빌딩 5층' },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [productList, setProductList] = useState(initialProducts);
  const [orders, setOrders] = useState(mockOrders);
  const [likedStores, setLikedStores] = useState([]);
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [currentAddressId, setCurrentAddressId] = useState(1);
  const coupons = mockCoupons;

  const currentAddress = addresses.find(a => a.id === currentAddressId) || addresses[0];

  function handleSelectAddress(id) {
    setCurrentAddressId(id);
  }

  function handleAddAddress(newAddr) {
    const id = Date.now();
    setAddresses(prev => [...prev, { ...newAddr, id }]);
    setCurrentAddressId(id);
  }

  function handleDeleteAddress(id) {
    setAddresses(prev => prev.filter(a => a.id !== id));
    if (currentAddressId === id) setCurrentAddressId(addresses.find(a => a.id !== id)?.id ?? null);
  }

  function handleUpdateAddress(updated) {
    setAddresses(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
  }

  function handleLike(productId) {
    setProductList(prev =>
      prev.map(p => p.id === productId ? { ...p, liked: !p.liked } : p)
    );
  }

  function handleStoreLike(storeId) {
    setLikedStores(prev =>
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  }

  function handleOrderComplete(order) {
    setOrders(prev => [order, ...prev]);
  }

  function handleCancelOrder(orderId) {
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
