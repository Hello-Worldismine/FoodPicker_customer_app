import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Navigation2, X, ChevronRight, Percent, Clock } from 'lucide-react-native';
import { colors } from '../theme';
import { stores, products } from '../data/mockData';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

const PIN_COLORS = {
  selling: colors.primaryGreen,
  closing: colors.warmOrange,
  soldout: colors.mediumGray,
};

const MIN_LAT = 37.495, MAX_LAT = 37.508;
const MIN_LNG = 127.024, MAX_LNG = 127.053;

const CLUSTER_RADIUS = 48; // 픽셀 거리

function toXY(lat, lng, w, h) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * w;
  const y = (1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * h;
  return { x, y };
}

function computeClusters(storeList, mapW, mapH) {
  const items = storeList.map(s => {
    const { x, y } = toXY(s.lat, s.lng, mapW, mapH);
    return { ...s, px: x, py: y };
  });

  const visited = new Array(items.length).fill(false);
  const result = [];

  items.forEach((item, i) => {
    if (visited[i]) return;
    visited[i] = true;
    const group = [item];
    items.forEach((other, j) => {
      if (visited[j]) return;
      if (Math.hypot(item.px - other.px, item.py - other.py) < CLUSTER_RADIUS) {
        group.push(other);
        visited[j] = true;
      }
    });
    const cx = group.reduce((s, c) => s + c.px, 0) / group.length;
    const cy = group.reduce((s, c) => s + c.py, 0) / group.length;
    result.push({ id: `cl_${i}`, stores: group, cx, cy });
  });

  return result;
}

// ── 지도 컴포넌트 ─────────────────────────────────────────
function PseudoMap({ filteredStores, selectedStore, onPinPress, onClusterPress, onMapPress }) {
  const MAP_H = SCREEN_H - 290;
  const clusters = computeClusters(filteredStores, SCREEN_W, MAP_H);

  return (
    <View
      style={[styles.mapArea, { height: MAP_H }]}
      onStartShouldSetResponder={() => true}
      onResponderRelease={onMapPress}
    >
      {/* 그리드 라인 */}
      {[0.25, 0.5, 0.75].map(f => (
        <View key={`h${f}`} style={[styles.gridLine, { top: `${f * 100}%`, left: 0, right: 0, height: 1 }]} />
      ))}
      {[0.25, 0.5, 0.75].map(f => (
        <View key={`v${f}`} style={[styles.gridLine, { left: `${f * 100}%`, top: 0, bottom: 0, width: 1 }]} />
      ))}

      {/* 도로 */}
      <View style={[styles.road, styles.roadH, { top: '42%' }]} />
      <View style={[styles.road, styles.roadV, { left: '35%' }]} />
      <View style={[styles.road, styles.roadV, { left: '65%' }]} />

      {/* 현재 위치 */}
      <View style={styles.myLocation}>
        <View style={styles.myLocationDot} />
        <View style={styles.myLocationPulse} />
      </View>

      {/* 클러스터 / 단일 핀 */}
      {clusters.map(cluster => {
        if (cluster.stores.length === 1) {
          // 단일 핀
          const store = cluster.stores[0];
          const selected = selectedStore?.id === store.id;
          const pColor = PIN_COLORS[store.status] || colors.primaryGreen;
          return (
            <TouchableOpacity
              key={store.id}
              style={[styles.pinWrap, { left: cluster.cx - 40, top: cluster.cy }]}
              onPress={e => { e.stopPropagation?.(); onPinPress(store); }}
              activeOpacity={0.85}
            >
              <View style={[
                styles.pinBubble,
                { backgroundColor: pColor },
                selected && styles.pinBubbleSelected,
              ]}>
                <Text style={styles.pinText} numberOfLines={1}>
                  {store.name.split(' ')[0]}
                </Text>
              </View>
              <View style={[styles.pinTip, { borderTopColor: pColor }]} />
            </TouchableOpacity>
          );
        }

        // 클러스터 핀
        const hasClosing = cluster.stores.some(s => s.status === 'closing');
        const clusterColor = hasClosing ? colors.warmOrange : colors.primaryGreen;
        return (
          <TouchableOpacity
            key={cluster.id}
            style={[styles.clusterWrap, { left: cluster.cx - 24, top: cluster.cy - 24 }]}
            onPress={e => { e.stopPropagation?.(); onClusterPress(cluster); }}
            activeOpacity={0.85}
          >
            <View style={[styles.clusterOuter, { borderColor: clusterColor }]}>
              <View style={[styles.clusterInner, { backgroundColor: clusterColor }]}>
                <Text style={styles.clusterCount}>{cluster.stores.length}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── 클러스터 매장 선택 시트 ───────────────────────────────
function ClusterSheet({ cluster, onSelectStore, onClose }) {
  return (
    <View style={styles.clusterSheet}>
      <View style={styles.clusterSheetHeader}>
        <Text style={styles.clusterSheetTitle}>매장 {cluster.stores.length}곳</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <X size={20} color={colors.mediumGray} />
        </TouchableOpacity>
      </View>
      {cluster.stores.map((store, idx) => {
        const pColor = PIN_COLORS[store.status] || colors.primaryGreen;
        return (
          <TouchableOpacity
            key={store.id}
            style={[styles.clusterStoreRow, idx < cluster.stores.length - 1 && styles.clusterStoreRowBorder]}
            onPress={() => onSelectStore(store)}
            activeOpacity={0.75}
          >
            <View style={[styles.clusterStoreDot, { backgroundColor: pColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.clusterStoreName}>{store.name}</Text>
              <Text style={styles.clusterStoreMeta}>
                {store.distance >= 1000
                  ? `${(store.distance / 1000).toFixed(1)}km`
                  : `${store.distance}m`} · 픽업 {store.pickupTime}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.mediumGray} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────
export default function MapScreen({ navigation }) {
  const [selCat, setSelCat] = useState('전체');
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  function toggleFilter(key) {
    setActiveFilters(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    setSelectedStore(null);
    setSelectedCluster(null);
  }

  // 카테고리 필터
  const mappedCats = CATEGORY_MAP[selCat];
  let filteredStores = selCat === '전체'
    ? stores
    : stores.filter(s => {
        const sp = products.filter(p => p.storeId === s.id);
        return sp.some(p => mappedCats ? mappedCats.includes(p.category) : p.category === selCat);
      });

  // 추가 필터
  if (activeFilters.length > 0) {
    filteredStores = filteredStores.filter(store => {
      const storeProds = products.filter(p => p.storeId === store.id);
      return activeFilters.some(f => {
        if (f === 'discount50') return storeProds.some(p => p.discountRate >= 50);
        if (f === 'closing')   return store.status === 'closing';
        return false;
      });
    });
  }

  const storeProducts = selectedStore
    ? products.filter(p => p.storeId === selectedStore.id && p.status === 'selling' && p.stock > 0)
    : [];

  const FILTERS = [
    { key: 'discount50', label: '50% 이상 할인', Icon: Percent },
    { key: 'closing',    label: '마감 임박',     Icon: Clock   },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 검색바 */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.mediumGray} />
          <Text style={styles.searchPlaceholder}>매장 또는 상품 검색</Text>
        </View>
      </View>

      {/* 카테고리 필터 */}
      <View style={styles.catWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, selCat === c && styles.catChipActive]}
              onPress={() => { setSelCat(c); setSelectedStore(null); setSelectedCluster(null); }}
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
        {/* 범례 */}
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

      {/* 지도 + 오버레이 버튼 */}
      <View style={{ flex: 1, position: 'relative' }}>
        <PseudoMap
          filteredStores={filteredStores}
          selectedStore={selectedStore}
          onPinPress={store => { setSelectedStore(store); setSelectedCluster(null); }}
          onClusterPress={cluster => { setSelectedCluster(cluster); setSelectedStore(null); }}
          onMapPress={() => { setSelectedStore(null); setSelectedCluster(null); }}
        />

        {/* 현재 위치 버튼 (우하단 고정) */}
        <TouchableOpacity
          style={[
            styles.locationBtn,
            { bottom: (selectedStore || selectedCluster) ? 220 : 20 },
          ]}
        >
          <Navigation2 size={20} color={colors.primaryGreen} />
        </TouchableOpacity>

        {/* 클러스터 선택 시트 */}
        {selectedCluster && (
          <ClusterSheet
            cluster={selectedCluster}
            onSelectStore={store => { setSelectedStore(store); setSelectedCluster(null); }}
            onClose={() => setSelectedCluster(null)}
          />
        )}

        {/* 선택된 매장 미니 카드 */}
        {selectedStore && (
          <View style={styles.miniCard}>
            <View style={styles.miniCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniCardName}>{selectedStore.name}</Text>
                <Text style={styles.miniCardMeta}>
                  남은 상품 {selectedStore.productCount}개 · {selectedStore.distance >= 1000 ? `${(selectedStore.distance/1000).toFixed(1)}km` : `${selectedStore.distance}m`}
                </Text>
                <Text style={styles.miniCardPickup}>픽업 가능 {selectedStore.pickupTime}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedStore(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.mediumGray} />
              </TouchableOpacity>
            </View>

            {storeProducts.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.miniProductScroll}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {storeProducts.slice(0, 3).map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.miniProduct}
                    onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
                  >
                    <View style={styles.miniProductImg}>
                      {p.image
                        ? <Image source={{ uri: p.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        : <Text style={styles.miniProductEmoji}>{p.emoji}</Text>
                      }
                    </View>
                    <Text style={styles.miniProductName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.miniProductPrice}>{p.salePrice.toLocaleString()}원</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.miniCardBtn}
              onPress={() => navigation.navigate('Store', { storeId: selectedStore.id })}
            >
              <Text style={styles.miniCardBtnText}>상품 보기</Text>
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

  /* 검색 */
  searchWrap: { backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  searchPlaceholder: { fontSize: 14, color: colors.mediumGray },

  /* 카테고리 */
  catWrap: { backgroundColor: colors.white },
  catList: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: '#E8EAED',
  },
  catChipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  catChipText: { fontSize: 12, color: colors.charcoalBlack, fontWeight: '400' },
  catChipTextActive: { color: colors.white, fontWeight: '700' },

  /* 추가 필터 행 */
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
    gap: 8, backgroundColor: colors.white,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: colors.charcoalBlack, borderColor: colors.charcoalBlack },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.charcoalBlack },
  filterChipTextActive: { color: colors.white },

  /* 범례 (필터 행 우측) */
  legendGroup: { flexDirection: 'row', gap: 10, marginLeft: 'auto' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.mediumGray },

  /* 지도 */
  mapArea: { backgroundColor: '#E8F4E8', overflow: 'hidden', position: 'relative' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(34,160,107,0.12)' },
  road: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4 },
  roadH: { left: 0, right: 0, height: 8 },
  roadV: { top: 0, bottom: 0, width: 8 },

  /* 현재 위치 점 */
  myLocation: {
    position: 'absolute', left: '50%', top: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }], zIndex: 5,
  },
  myLocationDot: {
    width: 16, height: 16, backgroundColor: '#4A90D9', borderRadius: 8,
    borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  myLocationPulse: {
    position: 'absolute', top: -8, left: -8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(74,144,217,0.2)',
  },

  /* 단일 핀 */
  pinWrap: { position: 'absolute', alignItems: 'center', width: 80, zIndex: 5 },
  pinBubble: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    borderWidth: 2, borderColor: 'transparent', maxWidth: 110,
  },
  pinBubbleSelected: {
    borderColor: colors.white, shadowOpacity: 0.25, elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  pinText: { fontSize: 11, fontWeight: '700', color: colors.white, textAlign: 'center' },
  pinTip: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  /* 클러스터 핀 */
  clusterWrap: { position: 'absolute', zIndex: 6, width: 48, height: 48 },
  clusterOuter: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 5,
  },
  clusterInner: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  clusterCount: { fontSize: 14, fontWeight: '900', color: colors.white },

  /* 현재 위치 버튼 */
  locationBtn: {
    position: 'absolute', right: 16,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
    zIndex: 10,
    borderWidth: 1, borderColor: '#EFEFEF',
  },

  /* 클러스터 선택 시트 */
  clusterSheet: {
    position: 'absolute', bottom: 0, left: 16, right: 16,
    backgroundColor: colors.white,
    borderRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    zIndex: 50,
  },
  clusterSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  clusterSheetTitle: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack },
  clusterStoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13,
  },
  clusterStoreRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
  clusterStoreDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  clusterStoreName: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2 },
  clusterStoreMeta: { fontSize: 12, color: colors.mediumGray },

  /* 미니 카드 */
  miniCard: {
    position: 'absolute', bottom: 0, left: 16, right: 16,
    backgroundColor: colors.white,
    borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    zIndex: 50,
  },
  miniCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  miniCardName: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 4 },
  miniCardMeta: { fontSize: 13, color: colors.mediumGray, marginBottom: 2 },
  miniCardPickup: { fontSize: 13, color: colors.charcoalBlack },

  miniProductScroll: { marginBottom: 12 },
  miniProduct: { backgroundColor: colors.softGray, borderRadius: 10, overflow: 'hidden', minWidth: 110 },
  miniProductImg: {
    width: '100%', height: 80, backgroundColor: '#E8F0E8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  miniProductEmoji: { fontSize: 32 },
  miniProductName: { fontSize: 12, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2, paddingHorizontal: 8, paddingTop: 6 },
  miniProductPrice: { fontSize: 13, fontWeight: '800', color: colors.primaryGreen, paddingHorizontal: 8, paddingBottom: 8 },

  miniCardBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 12, padding: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  miniCardBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
