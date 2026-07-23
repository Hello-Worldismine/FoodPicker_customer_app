import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Navigation2, X, ChevronRight, Percent, Clock } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { getCurrentCoords } from '../lib/location';
import { DEFAULT_LOCATION } from '../lib/api';
import NaverMap from '../components/NaverMap';

const CATEGORIES = ['전체', '베이커리·디저트', '도시락·간편식', '샐러드·건강식', '반찬·밀키트', '채소·과일', '정육·수산', '음료·기타'];

const CATEGORY_MAP = {
  '베이커리·디저트': ['빵', '디저트', '베이커리'],
  '도시락·간편식':   ['도시락', '간편식'],
  '샐러드·건강식':   ['샐러드', '건강식'],
  '반찬·밀키트':    ['반찬', '밀키트'],
  '채소·과일':      ['채소', '과일'],
  '정육·수산':      ['정육', '수산'],
  '음료·기타':      ['음료', '기타'],
};

const FILTERS = [
  { key: 'discount50', label: '50% 이상 할인', Icon: Percent },
  { key: 'closing',    label: '마감 임박',     Icon: Clock   },
];

export default function MapScreen({ navigation }) {
  const { stores, productList, updateLocation } = useApp();
  const [selCat, setSelCat] = useState('전체');
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [locating, setLocating] = useState(false);
  const [center, setCenter] = useState(DEFAULT_LOCATION);

  async function handleMyLocation() {
    if (locating) return;
    setLocating(true);
    const coords = await getCurrentCoords();
    if (coords) {
      await updateLocation(coords);
      setCenter(coords);
    }
    setLocating(false);
  }

  function toggleFilter(key) {
    setActiveFilters(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    setSelectedStore(null);
  }

  const mappedCats = CATEGORY_MAP[selCat];
  let filteredStores = selCat === '전체'
    ? stores
    : stores.filter(s => {
        const sp = productList.filter(p => p.storeId === s.id);
        return sp.some(p => mappedCats ? mappedCats.includes(p.category) : p.category === selCat);
      });

  if (activeFilters.length > 0) {
    filteredStores = filteredStores.filter(store => {
      const storeProds = productList.filter(p => p.storeId === store.id);
      return activeFilters.some(f => {
        if (f === 'discount50') return storeProds.some(p => p.discountRate >= 50);
        if (f === 'closing')   return store.status === 'closing';
        return false;
      });
    });
  }

  // lat/lng가 있는 매장만 지도에 표시
  const mapStores = filteredStores.filter(s => s.lat != null && s.lng != null);
  const markers = mapStores.map(s => ({ lat: s.lat, lng: s.lng, title: s.name, status: s.status }));

  const sellingProducts = selectedStore
    ? productList.filter(p => p.storeId === selectedStore.id && p.status === 'selling' && p.stock > 0)
    : [];
  const soldoutProducts = selectedStore
    ? productList.filter(p => p.storeId === selectedStore.id && (p.status === 'soldout' || p.stock === 0))
    : [];
  const displayProducts = sellingProducts.length > 0 ? sellingProducts : soldoutProducts;
  const isAllSoldout = sellingProducts.length === 0 && soldoutProducts.length > 0;
  const hasNoProducts = sellingProducts.length === 0 && soldoutProducts.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 검색바 */}
      <View style={styles.searchWrap}>
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Search')}
        >
          <Search size={16} color={colors.mediumGray} />
          <Text style={styles.searchPlaceholder}>매장 또는 상품 검색</Text>
        </TouchableOpacity>
      </View>

      {/* 카테고리 필터 */}
      <View style={styles.catWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, selCat === c && styles.catChipActive]}
              onPress={() => { setSelCat(c); setSelectedStore(null); }}
            >
              <Text style={[styles.catChipText, selCat === c && styles.catChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 추가 필터 행 */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = activeFilters.includes(f.key);
          const Icon = f.Icon;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => toggleFilter(f.key)}
            >
              <Icon size={12} color={active ? colors.white : colors.charcoalBlack} />
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.legendGroup}>
          {[
            { color: colors.primaryGreen, label: '판매중' },
            { color: colors.warmOrange,   label: '마감임박' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 지도 + 오버레이 */}
      <View style={{ flex: 1, position: 'relative' }}>
        <NaverMap
          lat={center.lat}
          lng={center.lng}
          zoom={14}
          markers={markers}
          interactive
          style={{ flex: 1 }}
          onMarkerPress={idx => {
            const store = mapStores[idx];
            if (store) setSelectedStore(store);
          }}
          onMapPress={() => setSelectedStore(null)}
        />

        {/* 현재 위치 버튼 */}
        <TouchableOpacity
          style={[styles.locationBtn, { bottom: selectedStore ? 220 : 20 }]}
          onPress={handleMyLocation}
          disabled={locating}
        >
          <Navigation2 size={20} color={locating ? colors.mediumGray : colors.primaryGreen} />
        </TouchableOpacity>

        {/* 선택된 매장 미니 카드 */}
        {selectedStore && (
          <View style={styles.miniCard}>
            {/* 헤더 */}
            <View style={styles.miniCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniCardName}>{selectedStore.name}</Text>
                <Text style={styles.miniCardMeta}>
                  {selectedStore.distance >= 1000
                    ? `${(selectedStore.distance / 1000).toFixed(1)}km`
                    : `${selectedStore.distance}m`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedStore(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.mediumGray} />
              </TouchableOpacity>
            </View>

            {/* 상품 영역 */}
            {hasNoProducts ? (
              <View style={styles.miniEmptyBox}>
                <Text style={styles.miniEmptyText}>등록된 상품이 없습니다</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.miniProductScroll}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {displayProducts.slice(0, 4).map(p => {
                  const soldout = isAllSoldout;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.miniProduct}
                      onPress={() => !soldout && navigation.navigate('ProductDetail', { productId: p.id })}
                      activeOpacity={soldout ? 1 : 0.7}
                    >
                      <View style={[styles.miniProductImg, soldout && styles.miniProductImgDim]}>
                        {p.image
                          ? <Image source={{ uri: p.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                          : <Text style={styles.miniProductEmoji}>{p.emoji}</Text>
                        }
                        {soldout && (
                          <View style={styles.miniSoldoutOverlay}>
                            <Text style={styles.miniSoldoutText}>품절</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.miniProductName, soldout && { color: colors.mediumGray }]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[styles.miniProductPrice, soldout && { color: colors.mediumGray }]}>
                        {soldout ? '품절' : `${p.salePrice.toLocaleString()}원`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 매장 상세보기 버튼 */}
            <TouchableOpacity
              style={styles.miniCardBtn}
              onPress={() => navigation.navigate('Store', { storeId: selectedStore.id })}
            >
              <Text style={styles.miniCardBtnText}>매장 상세보기</Text>
              <ChevronRight size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  searchWrap: { backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  searchPlaceholder: { fontSize: 14, color: colors.mediumGray },

  catWrap: { backgroundColor: colors.white },
  catList: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: '#E8EAED',
  },
  catChipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  catChipText: { fontSize: 12, color: colors.charcoalBlack, fontWeight: '400' },
  catChipTextActive: { color: colors.white, fontWeight: '700' },

  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
    gap: 8, backgroundColor: colors.white,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: colors.charcoalBlack, borderColor: colors.charcoalBlack },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.charcoalBlack },
  filterChipTextActive: { color: colors.white },

  legendGroup: { flexDirection: 'row', gap: 10, marginLeft: 'auto' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.mediumGray },

  locationBtn: {
    position: 'absolute', right: 16,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
    zIndex: 10, borderWidth: 1, borderColor: '#EFEFEF',
  },

  miniCard: {
    position: 'absolute', bottom: 0, left: 16, right: 16,
    backgroundColor: colors.white, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8, zIndex: 50,
  },
  miniCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  miniCardName: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 4 },
  miniCardMeta: { fontSize: 13, color: colors.mediumGray },

  miniEmptyBox: {
    height: 72, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.softGray, borderRadius: 10, marginBottom: 12,
  },
  miniEmptyText: { fontSize: 13, color: colors.mediumGray },

  miniProductScroll: { marginBottom: 12 },
  miniProduct: { backgroundColor: colors.softGray, borderRadius: 10, overflow: 'hidden', minWidth: 110 },
  miniProductImg: {
    width: '100%', height: 80, backgroundColor: '#E8F0E8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  miniProductImgDim: { opacity: 0.5 },
  miniProductEmoji: { fontSize: 32 },
  miniProductName: { fontSize: 12, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2, paddingHorizontal: 8, paddingTop: 6 },
  miniProductPrice: { fontSize: 13, fontWeight: '800', color: colors.primaryGreen, paddingHorizontal: 8, paddingBottom: 8 },
  miniSoldoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  miniSoldoutText: { fontSize: 12, fontWeight: '800', color: colors.white },

  miniCardBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 12, padding: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  miniCardBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
