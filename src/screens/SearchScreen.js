import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  FlatList, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import ListProductCard from '../components/ListProductCard';

const FILTERS = {
  distance: ['500m', '1km', '3km', '5km'],
  price: ['3천원 이하', '5천원 이하', '1만원 이하'],
  discount: ['30% 이상', '50% 이상', '70% 이상'],
  category: ['빵', '도시락', '샐러드', '반찬', '디저트', '음료'],
};
const FILTER_LABELS = { distance: '거리', price: '가격', discount: '할인율', category: '카테고리' };
// 필터 옵션 → 수치 임계값
const DIST_MAX  = { '500m': 500, '1km': 1000, '3km': 3000, '5km': 5000 };
const PRICE_MAX = { '3천원 이하': 3000, '5천원 이하': 5000, '1만원 이하': 10000 };
const DISC_MIN  = { '30% 이상': 30, '50% 이상': 50, '70% 이상': 70 };

const SORT_OPTIONS = ['가까운 순', '마감 임박 순', '할인율 높은 순', '낮은 가격 순'];

const RECENT_KEY = 'search_recent';
const SUGGESTIONS = ['크루아상', '샐러드', '도시락', '아메리카노', '샌드위치', '반찬세트', '베이글', '마감임박'];

export default function SearchScreen({ navigation }) {
  const { productList, stores, handleLike } = useApp();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState('가까운 순');
  const [showSort, setShowSort] = useState(false);
  const [searched, setSearched] = useState(false);

  // 최근 검색어는 AsyncStorage 에 영속.
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then(v => { if (v) { try { setRecent(JSON.parse(v)); } catch {} } })
      .catch(() => {});
  }, []);
  function persistRecent(next) {
    setRecent(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  }

  function toggleFilter(group, val) {
    setActiveFilters(prev => {
      const cur = prev[group] || [];
      const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
      return { ...prev, [group]: next };
    });
  }
  function activeCount() { return Object.values(activeFilters).flat().length; }

  function applyKeyword(kw) {
    const trimmed = kw.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSearched(true);
    persistRecent([trimmed, ...recent.filter(s => s !== trimmed)].slice(0, 10));
  }

  const selling = productList.filter(
    p => p.status === 'selling' && p.stock > 0 && new Date(p.expiryDate) > new Date()
  );

  let results = selling.filter(p => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase()) &&
        !p.store.toLowerCase().includes(query.toLowerCase())) return false;
    const cats = activeFilters.category || [];
    if (cats.length > 0 && !cats.includes(p.category)) return false;
    // 거리: 선택한 반경 중 가장 큰 값 이내
    const dsel = activeFilters.distance || [];
    if (dsel.length > 0 && p.distance > Math.max(...dsel.map(d => DIST_MAX[d] ?? Infinity))) return false;
    // 가격: 선택한 상한 중 가장 큰 값 이하
    const psel = activeFilters.price || [];
    if (psel.length > 0 && p.salePrice > Math.max(...psel.map(v => PRICE_MAX[v] ?? Infinity))) return false;
    // 할인율: 선택한 하한 중 가장 작은 값 이상
    const rsel = activeFilters.discount || [];
    if (rsel.length > 0 && p.discountRate < Math.min(...rsel.map(v => DISC_MIN[v] ?? 0))) return false;
    return true;
  });

  if (sortBy === '가까운 순') results = [...results].sort((a, b) => a.distance - b.distance);
  else if (sortBy === '마감 임박 순') results = [...results].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  else if (sortBy === '할인율 높은 순') results = [...results].sort((a, b) => b.discountRate - a.discountRate);
  else if (sortBy === '낮은 가격 순') results = [...results].sort((a, b) => a.salePrice - b.salePrice);

  const searchedStores = stores.filter(s =>
    query ? s.name.toLowerCase().includes(query.toLowerCase()) : false
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.charcoalBlack} />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <Search size={16} color={colors.mediumGray} />
            <TextInput
              value={query}
              onChangeText={t => { setQuery(t); if (t.trim()) setSearched(true); }}
              onSubmitEditing={() => applyKeyword(query)}
              placeholder="음식 또는 가게 검색"
              placeholderTextColor={colors.mediumGray}
              style={styles.input}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSearched(false); }}>
                <X size={14} color={colors.mediumGray} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeCount() > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilter(v => !v)}
          >
            <SlidersHorizontal size={16} color={activeCount() > 0 ? colors.white : colors.charcoalBlack} />
            {activeCount() > 0 && (
              <Text style={styles.filterBtnCount}>{activeCount()}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 필터 패널 */}
        {showFilter && (
          <View style={styles.filterPanel}>
            {Object.entries(FILTERS).map(([group, options]) => (
              <View key={group} style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>{FILTER_LABELS[group]}</Text>
                <View style={styles.filterOptions}>
                  {options.map(opt => {
                    const active = (activeFilters[group] || []).includes(opt);
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => toggleFilter(group, opt)}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            {activeCount() > 0 && (
              <TouchableOpacity style={styles.filterResetBtn} onPress={() => setActiveFilters({})}>
                <Text style={styles.filterResetText}>필터 초기화</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 결과 수 + 정렬 */}
        {searched && query.trim() && (
          <View style={styles.resultBar}>
            <Text style={styles.resultCount}>
              상품 <Text style={styles.resultNum}>{results.length}</Text> · 가게 <Text style={styles.resultNum}>{searchedStores.length}</Text>
            </Text>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(true)}>
              <Text style={styles.sortBtnText}>{sortBy}</Text>
              <ChevronDown size={14} color={colors.charcoalBlack} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 본문 */}
      {!searched ? (
        /* 검색 전 → 최근 검색 + 추천 */
        <ScrollView contentContainerStyle={styles.prePage}>
          {recent.length > 0 && (
            <View style={styles.preSection}>
              <View style={styles.preSectionHeader}>
                <Text style={styles.preSectionTitle}>최근 검색어</Text>
                <TouchableOpacity onPress={() => persistRecent([])}>
                  <Text style={styles.preClearAll}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipRow}>
                {recent.map(kw => (
                  <View key={kw} style={styles.recentChip}>
                    <TouchableOpacity onPress={() => applyKeyword(kw)}>
                      <Text style={styles.recentChipText}>{kw}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => persistRecent(recent.filter(r => r !== kw))}>
                      <X size={13} color={colors.mediumGray} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.preSectionTitle}>추천 검색어</Text>
          <View style={[styles.chipRow, { marginTop: 12 }]}>
            {SUGGESTIONS.map(kw => (
              <TouchableOpacity key={kw} style={styles.suggChip} onPress={() => applyKeyword(kw)}>
                <Search size={12} color={colors.mediumGray} />
                <Text style={styles.suggChipText}>{kw}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        /* 검색 결과 */
        <ScrollView contentContainerStyle={styles.resultPage}>
          {/* 가게 결과 */}
          {searchedStores.length > 0 && (
            <View style={styles.storeResults}>
              <Text style={styles.resultGroupTitle}>
                가게 <Text style={styles.resultGroupCount}>{searchedStores.length}개</Text>
              </Text>
              {searchedStores.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.storeRow}
                  onPress={() => navigation.navigate('Store', { storeId: s.id })}
                >
                  <View style={styles.storeAvatar}>
                    <Text style={{ fontSize: 24 }}>{s.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeRowName}>{s.name}</Text>
                    <Text style={styles.storeRowMeta}>
                      {s.distance >= 1000 ? `${(s.distance/1000).toFixed(1)}km` : `${s.distance}m`} · 상품 {s.productCount}개
                    </Text>
                  </View>
                  <View style={[styles.storeStatusDot, {
                    backgroundColor: s.status === 'selling' ? colors.primaryGreen : s.status === 'closing' ? colors.warmOrange : colors.mediumGray,
                  }]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 상품 결과 */}
          {results.length > 0 && (
            <View>
              {searchedStores.length > 0 && (
                <Text style={[styles.resultGroupTitle, { marginTop: 8 }]}>
                  음식 <Text style={styles.resultGroupCount}>{results.length}개</Text>
                </Text>
              )}
              {results.map(p => (
                <ListProductCard
                  key={p.id}
                  product={p}
                  onPress={pr => navigation.navigate('ProductDetail', { productId: pr.id })}
                  onLike={handleLike}
                  onStorePress={storeId => navigation.navigate('Store', { storeId })}
                />
              ))}
            </View>
          )}

          {results.length === 0 && searchedStores.length === 0 && (
            <View style={styles.noResult}>
              <Text style={styles.noResultEmoji}>😔</Text>
              <Text style={styles.noResultText}>검색 결과가 없습니다</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* 정렬 모달 */}
      <Modal visible={showSort} transparent animationType="fade">
        <TouchableOpacity style={styles.sortOverlay} onPress={() => setShowSort(false)}>
          <View style={styles.sortModal}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortOption, sortBy === opt && styles.sortOptionActive]}
                onPress={() => { setSortBy(opt); setShowSort(false); }}
              >
                <Text style={[styles.sortOptionText, sortBy === opt && styles.sortOptionTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  /* 헤더 */
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.softGray },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingBottom: 10 },
  backBtn: { padding: 2 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, color: colors.charcoalBlack },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: '#E8EAED', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  filterBtnActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  filterBtnCount: { fontSize: 12, color: colors.white, fontWeight: '700' },

  /* 필터 패널 */
  filterPanel: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.softGray },
  filterGroup: { marginTop: 12 },
  filterGroupLabel: { fontSize: 12, fontWeight: '700', color: colors.mediumGray, marginBottom: 6 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    backgroundColor: colors.softGray, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: colors.freshMint, borderColor: colors.primaryGreen },
  filterChipText: { fontSize: 13, color: colors.charcoalBlack },
  filterChipTextActive: { color: colors.primaryGreen, fontWeight: '700' },
  filterResetBtn: {
    marginTop: 12, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.mediumGray,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
  },
  filterResetText: { fontSize: 13, color: colors.mediumGray },

  /* 결과바 */
  resultBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.softGray,
  },
  resultCount: { fontSize: 13, color: colors.mediumGray },
  resultNum: { fontWeight: '700', color: colors.charcoalBlack },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack },

  /* 검색 전 */
  prePage: { padding: 20, paddingBottom: 100 },
  preSection: { marginBottom: 28 },
  preSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  preSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack },
  preClearAll: { fontSize: 12, color: colors.mediumGray },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.softGray, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  recentChipText: { fontSize: 14, color: colors.charcoalBlack, fontWeight: '500' },
  suggChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  suggChipText: { fontSize: 13, color: colors.charcoalBlack, fontWeight: '500' },

  /* 검색 결과 */
  resultPage: { backgroundColor: colors.white, paddingBottom: 100 },
  storeResults: { marginBottom: 8, paddingHorizontal: 16, paddingTop: 12 },
  resultGroupTitle: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 12, paddingHorizontal: 16, paddingTop: 8 },
  resultGroupCount: { fontSize: 14, color: colors.mediumGray, fontWeight: '400' },
  storeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: 14, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  storeAvatar: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  storeRowName: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 3 },
  storeRowMeta: { fontSize: 12, color: colors.mediumGray },
  storeStatusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  noResult: { alignItems: 'center', paddingTop: 60 },
  noResultEmoji: { fontSize: 48, marginBottom: 12 },
  noResultText: { fontSize: 15, color: colors.mediumGray },

  /* 정렬 모달 */
  sortOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 140, paddingRight: 16,
  },
  sortModal: {
    backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden',
    minWidth: 150,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
  },
  sortOption: { paddingVertical: 11, paddingHorizontal: 14, backgroundColor: colors.white },
  sortOptionActive: { backgroundColor: colors.freshMint },
  sortOptionText: { fontSize: 13, color: colors.charcoalBlack },
  sortOptionTextActive: { color: colors.primaryGreen, fontWeight: '700' },
});
