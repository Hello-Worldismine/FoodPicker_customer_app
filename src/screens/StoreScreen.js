import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Share2, Heart, Star, Navigation, Phone, MessageSquare,
  MapPin, Clock,
} from 'lucide-react-native';
import { colors } from '../theme';
// TODO: stores → GET /api/stores/:storeId (매장 상세 정보)
//       storeProducts → GET /api/products?storeId={storeId} (매장별 상품 목록)
import { stores } from '../data/mockData';
import { useApp } from '../context/AppContext';
import ListProductCard from '../components/ListProductCard';

const STATUS_COLOR = {
  selling: colors.primaryGreen,
  closing: colors.warmOrange,
  soldout: colors.mediumGray,
};

export default function StoreScreen({ route, navigation }) {
  const { storeId } = route.params;
  const { productList, handleLike, likedStores, handleStoreLike } = useApp();
  const isLiked = likedStores.includes(storeId);
  const store = stores.find(s => s.id === storeId);
  const [tab, setTab] = useState('products');

  if (!store) return null;

  const storeProducts = productList.filter(p => p.storeId === storeId);
  const availableProducts = storeProducts.filter(
    p => p.status === 'selling' && p.stock > 0 && new Date(p.expiryDate) > new Date()
  );
  const soldoutProducts = storeProducts.filter(
    p => p.status === 'soldout' || p.stock === 0 || new Date(p.expiryDate) <= new Date()
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.softGray }}>
      {/* 녹색 헤더 */}
      <View style={styles.greenHeader}>
        <SafeAreaView edges={['top']}>
          {/* 네비게이션 바 */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              <ArrowLeft size={20} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => handleStoreLike(storeId)}
              >
                <Heart
                  size={20}
                  color={colors.white}
                  fill={isLiked ? colors.white : 'none'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <Share2 size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 매장 히어로 — 웹과 동일한 가로 레이아웃 */}
          <View style={styles.hero}>
            <View style={styles.storeIconWrap}>
              {store.image
                ? <Image source={{ uri: store.image }} style={styles.storeIconImg} resizeMode="cover" />
                : <Text style={styles.storeIconEmoji}>{store.emoji}</Text>
              }
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{store.name}</Text>
              <Text style={styles.heroCategory}>{store.subcategory || store.category}</Text>
              <View style={styles.heroMeta}>
                <TouchableOpacity
                  style={styles.heroBadge}
                  onPress={() => navigation.navigate('Review', { store })}
                >
                  <Star size={12} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.heroBadgeText}>{store.rating}</Text>
                  <Text style={styles.heroBadgeSub}>({store.reviewCount})</Text>
                </TouchableOpacity>
                <View style={styles.heroBadge}>
                  <MapPin size={11} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.heroBadgeSub}>
                    {store.distance >= 1000 ? `${(store.distance/1000).toFixed(1)}km` : `${store.distance}m`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* 액션 버튼 3개 — 웹과 동일한 열(column) 레이아웃 */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.freshMint }]}>
          <Navigation size={18} color={colors.primaryGreen} />
          <Text style={[styles.actionLabel, { color: colors.primaryGreen }]}>길찾기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.softGray }]}
          onPress={() => store.phone && Linking.openURL(`tel:${store.phone}`)}
        >
          <Phone size={18} color={colors.charcoalBlack} />
          <Text style={[styles.actionLabel, { color: colors.charcoalBlack }]}>전화</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.softGray }]}
          onPress={() => navigation.navigate('Review', { store })}
        >
          <MessageSquare size={18} color={colors.charcoalBlack} />
          <Text style={[styles.actionLabel, { color: colors.charcoalBlack }]}>리뷰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 매장 기본 정보 */}
        <View style={styles.infoCard}>
          {[
            { icon: <MapPin size={15} color={colors.mediumGray} />, label: '주소',    value: store.address },
            { icon: <Phone size={15} color={colors.mediumGray} />, label: '전화',    value: store.phone },
            { icon: <Clock size={15} color={colors.mediumGray} />, label: '영업시간', value: store.businessHours },
            { icon: <Clock size={15} color={colors.warmOrange} />, label: '픽업시간', value: store.pickupTime, highlight: true },
          ].map((item, idx, arr) => (
            <View key={item.label} style={[styles.infoRow, idx < arr.length - 1 && styles.infoRowBorder]}>
              <View style={styles.infoIconWrap}>{item.icon}</View>
              <Text style={styles.infoRowLabel}>{item.label}</Text>
              <Text style={[
                styles.infoRowValue,
                item.highlight && { color: colors.warmOrange, fontWeight: '700' },
              ]} numberOfLines={2}>{item.value}</Text>
            </View>
          ))}
          {store.description ? (
            <Text style={styles.descText}>{store.description}</Text>
          ) : null}
        </View>

        {/* 해시태그 */}
        {store.tags?.length > 0 && (
          <View style={styles.tagSection}>
            {store.tags.map(t => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 탭 바 */}
        <View style={styles.tabs}>
          {[
            { key: 'products', label: `판매 상품 ${availableProducts.length}개` },
            { key: 'info',     label: '매장 정보' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 탭 콘텐츠 */}
        <View style={styles.tabContent}>
          {tab === 'products' && (
            <>
              {availableProducts.length === 0 && soldoutProducts.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>🛒</Text>
                  <Text style={styles.emptyText}>현재 판매 중인 상품이 없습니다</Text>
                </View>
              )}
              {availableProducts.length > 0 && availableProducts.map(p => (
                <ListProductCard
                  key={p.id}
                  product={p}
                  onPress={pr => navigation.navigate('ProductDetail', { productId: pr.id })}
                  onLike={handleLike}
                  onStorePress={sid => navigation.navigate('Store', { storeId: sid })}
                />
              ))}
              {soldoutProducts.length > 0 && (
                <View>
                  <Text style={styles.soldoutHeader}>품절 / 판매 종료</Text>
                  {soldoutProducts.map(p => (
                    <ListProductCard
                      key={p.id}
                      product={p}
                      onPress={() => {}}
                      onLike={handleLike}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {tab === 'info' && (
            <View style={{ paddingTop: 12, paddingHorizontal: 16 }}>
              {store.notice ? (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeTitle}>📢 매장 공지</Text>
                  <Text style={styles.noticeText}>{store.notice}</Text>
                </View>
              ) : null}

              {/* 지도 플레이스홀더 */}
              <View style={styles.mapPlaceholder}>
                <MapGrid />
                <View style={{ zIndex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28 }}>📍</Text>
                  <View style={styles.mapLabel}>
                    <Text style={styles.mapLabelText}>{store.name}</Text>
                  </View>
                </View>
              </View>

              {/* 상세 주소 + 길찾기 */}
              <View style={styles.addressCard}>
                <Text style={styles.addressTitle}>상세 주소</Text>
                <Text style={styles.addressText}>{store.address}</Text>
                <TouchableOpacity style={styles.dirBtn}>
                  <Navigation size={15} color={colors.primaryGreen} />
                  <Text style={styles.dirBtnText}>길찾기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MapGrid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0.35, 0.5, 0.75].map((r, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', top: `${r * 100}%`, left: 0, right: 0, height: 7, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4 }} />
      ))}
      <View style={{ position: 'absolute', left: '35%', top: 0, bottom: 0, width: 7, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4 }} />
      <View style={{ position: 'absolute', left: '65%', top: 0, bottom: 0, width: 7, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  greenHeader: { backgroundColor: colors.primaryGreen },

  navBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  navRight: { flexDirection: 'row', gap: 6 },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* 히어로 — 가로 레이아웃 */
  hero: {
    flexDirection: 'row', gap: 16, alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24,
  },
  storeIconWrap: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
  storeIconEmoji: { fontSize: 36 },
  storeIconImg: { width: '100%', height: '100%', borderRadius: 18 },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: '900', color: colors.white, marginBottom: 4 },
  heroCategory: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  heroMeta: { flexDirection: 'row', gap: 6 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
  },
  heroBadgeText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  heroBadgeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  /* 액션 버튼 — 열(column) 레이아웃, 개별 배경색 */
  actionRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: colors.white, padding: 12, paddingHorizontal: 16, marginBottom: 8,
  },
  actionBtn: {
    flex: 1, flexDirection: 'column',
    alignItems: 'center', gap: 5,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8,
  },
  actionLabel: { fontSize: 12, fontWeight: '600' },

  /* 정보 카드 */
  infoCard: { backgroundColor: colors.white, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.softGray },
  infoIconWrap: { width: 24, marginTop: 1 },
  infoRowLabel: { fontSize: 12, color: colors.mediumGray, width: 52, flexShrink: 0 },
  infoRowValue: { flex: 1, fontSize: 13, color: colors.charcoalBlack, lineHeight: 18 },
  descText: { fontSize: 13, color: colors.mediumGray, lineHeight: 21, paddingVertical: 12 },

  /* 태그 */
  tagSection: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    backgroundColor: colors.white, padding: 10, paddingHorizontal: 16, marginBottom: 8,
  },
  tag: { backgroundColor: colors.freshMint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: colors.primaryGreen, fontWeight: '600' },

  /* 탭 */
  tabs: {
    flexDirection: 'row', flexWrap: 'nowrap',
    backgroundColor: colors.white,
    borderBottomWidth: 2, borderBottomColor: colors.softGray, marginBottom: 8,
  },
  tabBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -2,
  },
  tabBtnActive: { borderBottomColor: colors.primaryGreen },
  tabText: { fontSize: 14, color: colors.mediumGray },
  tabTextActive: { color: colors.primaryGreen, fontWeight: '800' },
  tabContent: {},

  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 16 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14, color: colors.mediumGray },

  soldoutHeader: { fontSize: 13, fontWeight: '700', color: colors.mediumGray, marginBottom: 10, marginTop: 8, paddingHorizontal: 16 },

  /* 매장 정보 탭 */
  noticeBox: {
    backgroundColor: '#FFF8E6', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: colors.warmOrange, marginBottom: 6 },
  noticeText: { fontSize: 13, color: '#7A5C1E', lineHeight: 20 },

  mapPlaceholder: {
    height: 160, borderRadius: 14, backgroundColor: '#E8F4E8',
    overflow: 'hidden', marginBottom: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  mapLabel: {
    marginTop: 6, backgroundColor: colors.primaryGreen,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  mapLabelText: { fontSize: 12, fontWeight: '700', color: colors.white },

  addressCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12,
  },
  addressTitle: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 6 },
  addressText: { fontSize: 13, color: colors.mediumGray, marginBottom: 12 },
  dirBtn: {
    backgroundColor: colors.freshMint, borderRadius: 10, padding: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  dirBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },
});
