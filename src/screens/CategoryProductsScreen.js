import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import ListProductCard from '../components/ListProductCard';
import {
  ALL_CATEGORY, CATEGORY_EMOJI, matchesCategory, normalizeCategoryName,
} from '../lib/categories';

const SORT_OPTIONS = ['가까운 순', '마감 임박 순', '할인율 높은 순', '낮은 가격 순'];

export default function CategoryProductsScreen({ route, navigation }) {
  // 배너 link('/category/drinks' 등)에서 넘어오는 값도 정본 카테고리명으로 정규화한다.
  const category = normalizeCategoryName(route.params?.category);
  const { productList, handleLike } = useApp();
  const [sortBy, setSortBy] = useState('가까운 순');
  const [showSort, setShowSort] = useState(false);

  const selling = productList.filter(
    p => p.status === 'selling' && p.stock > 0 && new Date(p.expiryDate) > new Date()
  );

  let filtered = category === ALL_CATEGORY
    ? selling
    : selling.filter(p => matchesCategory(p.category, category));

  let sorted = [...filtered];
  if (sortBy === '가까운 순')       sorted.sort((a, b) => a.distance - b.distance);
  else if (sortBy === '마감 임박 순') sorted.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  else if (sortBy === '할인율 높은 순') sorted.sort((a, b) => b.discountRate - a.discountRate);
  else if (sortBy === '낮은 가격 순') sorted.sort((a, b) => a.salePrice - b.salePrice);

  const emoji = CATEGORY_EMOJI[category] || '🍽';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.charcoalBlack} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{category}</Text>
          <Text style={styles.headerCount}>{sorted.length}개</Text>
        </View>

        {/* 정렬 + 필터 바 */}
        <View style={styles.sortBar}>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setShowSort(true)}
          >
            <Text style={styles.sortBtnText}>{sortBy}</Text>
            <ChevronDown size={14} color={colors.charcoalBlack} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <ListProductCard
            product={item}
            onPress={p => navigation.navigate('ProductDetail', { productId: p.id })}
            onLike={handleLike}
            onStorePress={storeId => navigation.navigate('Store', { storeId })}
          />
        )}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{emoji}</Text>
            <Text style={styles.emptyTitle}>{category} 상품이 없어요</Text>
            <Text style={styles.emptySub}>다른 카테고리를 확인해보세요</Text>
          </View>
        }
      />

      {/* 정렬 모달 */}
      <Modal visible={showSort} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSort(false)}>
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
  safe: { flex: 1, backgroundColor: colors.softGray },

  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.softGray },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 6,
  },
  backBtn: { padding: 2, marginRight: 4 },
  emojiIcon: { fontSize: 22 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  headerCount: { fontSize: 13, color: colors.mediumGray },

  sortBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.softGray, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack },

  list: { backgroundColor: colors.white },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.mediumGray },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', paddingTop: 120, paddingHorizontal: 16,
  },
  sortModal: {
    backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    alignSelf: 'flex-start', minWidth: 160,
  },
  sortOption: { paddingVertical: 11, paddingHorizontal: 14, backgroundColor: colors.white },
  sortOptionActive: { backgroundColor: colors.freshMint },
  sortOptionText: { fontSize: 13, color: colors.charcoalBlack },
  sortOptionTextActive: { color: colors.primaryGreen, fontWeight: '700' },
});
