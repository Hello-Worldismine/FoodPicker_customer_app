import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, Search, ChevronRight, ChevronDown,
  Clock, Heart, MapPin, Star, Package,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
// 매장/상품은 Supabase(useApp)에서 로드.
// 배너: 관리자 웹이 등록한 이미지 배너(banners 테이블)가 있으면 우선 노출, 없으면 정적 카드 폴백.
import { mockBannerAds } from '../data/mockData';
import { fetchActiveBanners } from '../lib/api';

const CATEGORIES = [
  { key: '전체',         emoji: '🛒', bg: '#E8F5E9' },
  { key: '베이커리·디저트', emoji: '🥐', bg: '#FFF8E7' },
  { key: '도시락·간편식', emoji: '🍱', bg: '#FFEBEE' },
  { key: '샐러드·건강식', emoji: '🥗', bg: '#F1F8E9' },
  { key: '반찬·밀키트',  emoji: '🥘', bg: '#FFF3E0' },
  { key: '채소·과일',    emoji: '🥦', bg: '#E8F5E9' },
  { key: '정육·수산',    emoji: '🥩', bg: '#FCE4EC' },
  { key: '음료·기타',    emoji: '🧋', bg: '#E3F2FD' },
];


const { width: SCREEN_W } = Dimensions.get('window');
const CAT_ITEM_W = Math.floor((SCREEN_W - 32) / 4);
const CARD_W = Math.floor(SCREEN_W * 0.44);
const STORE_CARD_W = Math.floor(SCREEN_W * 0.52);

function fmtTime(iso) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}
function stockColor(n) {
  if (n <= 4) return '#E53935';
  if (n <= 9) return '#F97316';
  return '#22A06B';
}

// ── 상품 카드 (가로 스크롤용) ──────────────────────────────
function SmallProductCard({ product, onPress, onLike }) {
  const soldout = product.status === 'soldout';
  return (
    <View style={[styles.cardShadow, soldout && styles.cardFaded]}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => !soldout && onPress?.()}
        activeOpacity={0.85}
      >
        <View style={styles.cardImageBox}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <Text style={styles.cardEmoji}>{product.emoji || '🍱'}</Text>
          )}
          {soldout && (
            <View style={styles.soldoutLayer}>
              <Text style={styles.soldoutLabel}>품절</Text>
            </View>
          )}
          <TouchableOpacity style={styles.likeBtn} onPress={() => onLike?.(product.id)}>
            <Heart
              size={16}
              color={product.liked ? colors.alertRed : 'rgba(255,255,255,0.9)'}
              fill={product.liked ? colors.alertRed : 'none'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.cardStore} numberOfLines={1}>{product.store}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.discRate}>{product.discountRate}%</Text>
            <Text style={styles.salePrice}>{product.salePrice.toLocaleString()}원</Text>
          </View>
          <Text style={styles.origPrice}>{product.originalPrice.toLocaleString()}원</Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerChip}>
              <MapPin size={9} color="#666" />
              <Text style={[styles.footerText, { color: '#444' }]}>{fmtDist(product.distance)}</Text>
            </View>
            <View style={styles.footerChip}>
              <Clock size={9} color={colors.warmOrange} />
              <Text style={[styles.footerText, { color: colors.warmOrange }]}>
                {fmtTime(product.pickupStart)}~{fmtTime(product.pickupEnd)}
              </Text>
            </View>
            <View style={styles.footerChip}>
              <Package size={9} color={stockColor(product.stock)} />
              <Text style={[styles.footerText, { color: stockColor(product.stock), fontWeight: '700' }]}>
                남은 수량 {product.stock}개
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const TAG_STYLES = {
  '픽업가능':  { bg: '#E9F8F1', color: '#15803D' },
  '위생인증':  { bg: '#EFF6FF', color: '#1D4ED8' },
  '마감임박':  { bg: '#FFF7ED', color: '#C2410C' },
  '준비중':    { bg: '#F3F4F6', color: '#6B7280' },
};

// ── 매장 카드 (가로 스크롤용 · 레퍼런스 스타일) ────────────
function StoreCard({ store, onPress }) {
  const isOpen = store.status === 'selling';
  const isClosing = store.status === 'closing';
  const walkMin = Math.ceil(store.distance / 80);

  const tags = [];
  if (isOpen || isClosing) tags.push('픽업가능');
  if (store.rating >= 4.7) tags.push('위생인증');
  if (isClosing) tags.push('마감임박');
  if (!isOpen && !isClosing) tags.push('준비중');

  return (
    <View style={styles.storeCardWrap}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
        {/* 이미지 — 4면 모두 border-radius */}
        <View style={styles.storeImageWrap}>
          {store.image ? (
            <Image source={{ uri: store.image }} style={styles.storeImage} resizeMode="cover" />
          ) : (
            <View style={styles.storeImagePlaceholder}>
              <Text style={styles.cardEmoji}>{store.emoji}</Text>
            </View>
          )}
        </View>

        {/* 정보 */}
        <View style={styles.storeBody}>
          {/* 가게명 */}
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>

          {/* 별점 */}
          <View style={styles.storeRatingWrap}>
            <Star size={12} color="#FACC15" fill="#FACC15" />
            <Text style={styles.storeRatingVal}>{store.rating}</Text>
            <Text style={styles.storeRatingCnt}>({store.reviewCount})</Text>
          </View>

          {/* 픽업시간 */}
          <View style={styles.storeInfoRow}>
            <Clock size={11} color={colors.mediumGray} />
            <Text style={styles.storeInfoText}>픽업시간 {store.pickupTime}</Text>
          </View>

          {/* 거리 + 도보 */}
          <View style={[styles.storeInfoRow, { marginBottom: 8 }]}>
            <MapPin size={11} color={colors.mediumGray} />
            <Text style={styles.storeInfoText}>{fmtDist(store.distance)} 도보{walkMin}분</Text>
          </View>

          {/* 컬러 태그 */}
          <View style={styles.storeTagRow}>
            {tags.map(tag => {
              const t = TAG_STYLES[tag] || { bg: '#F3F4F6', color: '#6B7280' };
              return (
                <View key={tag} style={[styles.storeTag, { backgroundColor: t.bg }]}>
                  <Text style={[styles.storeTagText, { color: t.color }]}>{tag}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { handleLike, productList, stores, currentAddress, notifications } = useApp();
  const hasUnread = notifications.some(n => !n.read);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [dbBanners, setDbBanners] = useState([]);
  const flatRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchActiveBanners()
      .then(rows => { if (!cancelled) setDbBanners(rows.filter(b => b.imageUrl)); })
      .catch(() => {}); // 테이블 미생성/네트워크 실패 시 정적 배너 폴백
    return () => { cancelled = true; };
  }, []);

  // 관리자 등록 이미지 배너가 있으면 그것만, 없으면 기존 정적 그라디언트 카드
  const banners = dbBanners.length > 0 ? dbBanners : mockBannerAds;

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % banners.length;
        flatRef.current?.scrollToOffset({ offset: next * SCREEN_W, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // 배너 link('/category/빵' 형태)에서 카테고리 이동 대상 추출
  function bannerCategory(link) {
    const m = /\/category\/(.+)$/.exec(link || '');
    return m ? decodeURIComponent(m[1]) : '전체';
  }

  const nearbyStores = [...stores].sort((a, b) => a.distance - b.distance);

  const availableProducts = productList.filter(
    p => p.stock >= 0 && new Date(p.expiryDate) > new Date()
  );

  const closingProducts = availableProducts.filter(
    p => p.badges?.some(b => b.includes('마감')) || p.status === 'closing'
  );

  function goCategory(category) {
    navigation.navigate('CategoryProducts', { category });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── 고정 헤더 ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.locationBtn} onPress={() => navigation.navigate('Address')}>
            <Text style={styles.locationText} numberOfLines={1}>
              {currentAddress ? currentAddress.label : '주소 설정'}
            </Text>
            <ChevronDown size={16} color={colors.charcoalBlack} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellWrap} onPress={() => navigation.navigate('Notifications')}>
            <Bell size={22} color={colors.charcoalBlack} />
            {hasUnread && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
          <Search size={16} color={colors.mediumGray} />
          <Text style={styles.searchPlaceholder}>음식 또는 가게 검색</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* 광고 배너 */}
        <View style={styles.bannerWrap}>
          <FlatList
            ref={flatRef}
            data={banners}
            keyExtractor={i => String(i.id)}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={e => setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_W }}>
                {item.imageUrl ? (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => goCategory(bannerCategory(item.link))}>
                    <Image source={{ uri: item.imageUrl }} style={styles.bannerImg} resizeMode="cover" />
                  </TouchableOpacity>
                ) : (
                  <LinearGradient colors={item.bg} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <View style={styles.bannerCircle1} />
                    <View style={styles.bannerCircle2} />
                    <View style={styles.bannerContent}>
                      <Text style={styles.bannerTitle}>{item.title}</Text>
                      <Text style={styles.bannerDesc}>{item.description}</Text>
                      <TouchableOpacity style={styles.bannerBtn} onPress={() => goCategory(item.category)}>
                        <Text style={styles.bannerBtnText}>{item.btnLabel}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.bannerEmoji}>{item.emoji}</Text>
                  </LinearGradient>
                )}
              </View>
            )}
          />
          {banners.length > 1 && (
            <View style={styles.pageCounter} pointerEvents="none">
              <Text style={styles.pageCounterText}>{bannerIndex + 1}/{banners.length}</Text>
            </View>
          )}
        </View>

        {/* 카테고리 그리드 */}
        <View style={styles.catSection}>
          <View style={styles.catGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.key} style={styles.catItem} onPress={() => goCategory(c.key)} activeOpacity={0.78}>
                {c.badge && (
                  <View style={styles.catBadgePill}>
                    <Text style={styles.catBadgePillText}>{c.badge}</Text>
                  </View>
                )}
                <View style={[styles.catIconBox, { backgroundColor: c.bg }]}>
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                </View>
                <Text style={styles.catLabel}>{c.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 내 주변 매장 */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>내 주변 매장</Text>
              <Text style={styles.sectionSub}>가까운 순으로 보기</Text>
            </View>
            <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('Map')}>
              <Text style={styles.moreText}>전체보기</Text>
              <ChevronRight size={14} color={colors.primaryGreen} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={nearbyStores}
            keyExtractor={s => String(s.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardList}
            renderItem={({ item }) => (
              <StoreCard store={item} onPress={() => navigation.navigate('Store', { storeId: item.id })} />
            )}
          />
        </View>

        {/* 마감임박 상품 */}
        {closingProducts.length > 0 && (
          <View style={styles.productSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>마감임박 상품</Text>
                <Text style={styles.sectionSub}>곧 사라져요, 서둘러요!</Text>
              </View>
              <TouchableOpacity style={styles.moreBtn} onPress={() => goCategory('전체')}>
                <Text style={styles.moreText}>전체보기</Text>
                <ChevronRight size={14} color={colors.primaryGreen} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={closingProducts}
              keyExtractor={p => String(p.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardList}
              renderItem={({ item }) => (
                <SmallProductCard
                  product={item}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  onLike={handleLike}
                />
              )}
            />
          </View>
        )}

        {/* 새로 등록된 상품 */}
        <View style={styles.productSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>새로 등록된 상품</Text>
              <Text style={styles.sectionSub}>방금 막 올라왔어요</Text>
            </View>
            <TouchableOpacity style={styles.moreBtn} onPress={() => goCategory('전체')}>
              <Text style={styles.moreText}>전체보기</Text>
              <ChevronRight size={14} color={colors.primaryGreen} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={availableProducts}
            keyExtractor={p => String(p.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardList}
            renderItem={({ item }) => (
              <SmallProductCard
                product={item}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                onLike={handleLike}
              />
            )}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  scroll: { flex: 1 },

  /* 헤더 */
  header: { backgroundColor: colors.white },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16,
  },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
  bellWrap: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute', top: 2, right: 2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.alertRed, borderWidth: 1.5, borderColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.softGray,
    marginHorizontal: 16, marginTop: 12, marginBottom: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchPlaceholder: { fontSize: 14, color: colors.mediumGray },

  /* 배너 */
  bannerWrap: { paddingTop: 0, position: 'relative' },
  bannerImg: { width: SCREEN_W, height: 150 },
  banner: {
    width: SCREEN_W, height: 150,
    paddingHorizontal: 24, paddingVertical: 20,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', overflow: 'hidden',
  },
  bannerCircle1: {
    position: 'absolute', right: -20, top: -20,
    width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerCircle2: {
    position: 'absolute', right: 30, bottom: -30,
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: colors.white, lineHeight: 28, marginBottom: 6 },
  bannerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginBottom: 16 },
  bannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, alignSelf: 'flex-start',
  },
  bannerBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  bannerEmoji: { fontSize: 52, marginLeft: 8, flexShrink: 0, lineHeight: 60 },
  pageCounter: {
    position: 'absolute', bottom: 10, right: 14,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pageCounterText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* 카테고리 그리드 */
  catSection: {
    backgroundColor: colors.white, marginTop: 16,
    paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  catItem: {
    width: CAT_ITEM_W,
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  catBadgePill: {
    position: 'absolute', top: -6, right: 8, zIndex: 2,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  catBadgePillText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  catIconBox: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
  },
  catEmoji: { fontSize: 34 },
  catLabel: { fontSize: 11.5, fontWeight: '600', color: colors.charcoalBlack, textAlign: 'center' },

  /* 섹션 공통 */
  productSection: {
    backgroundColor: colors.white, marginTop: 12,
    paddingTop: 18, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  sectionSub: { fontSize: 13, color: colors.mediumGray, marginTop: 2 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  moreText: { fontSize: 13, color: colors.primaryGreen, fontWeight: '600' },
  cardList: { paddingHorizontal: 16, paddingBottom: 16, paddingRight: 24, gap: 12 },

  /* 카드 공통 (상품) */
  cardShadow: {
    width: STORE_CARD_W, backgroundColor: colors.white, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13, shadowRadius: 6, elevation: 4,
  },
  cardFaded: { opacity: 0.55 },
  card: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E8EAED' },

  cardImageBox: {
    height: 165, backgroundColor: '#F0F5F2',
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 44 },

  soldoutLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center', justifyContent: 'center',
  },
  soldoutLabel: { color: colors.white, fontSize: 15, fontWeight: '800' },

  discBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  discText: { color: colors.white, fontSize: 11, fontWeight: '800' },

  likeBtn: {
    position: 'absolute', bottom: 8, right: 8,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* 상품 카드 바디 */
  cardBody: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 2 },
  cardStore: { fontSize: 12, color: colors.mediumGray, marginBottom: 5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 2 },
  discRate: { fontSize: 15, fontWeight: '900', color: '#E53935' },
  salePrice: { fontSize: 15, fontWeight: '900', color: colors.charcoalBlack },
  origPrice: { fontSize: 12, color: colors.mediumGray, textDecorationLine: 'line-through', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footerChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerText: { fontSize: 12, color: colors.mediumGray },

  /* ── 매장 카드 (레퍼런스 스타일) ── */
  storeCardWrap: {
    width: STORE_CARD_W,
  },
  storeImageWrap: {
    margin: 0,
    borderRadius: 14,
    overflow: 'hidden',
    height: 165,
    backgroundColor: '#F0F0F0',
  },
  storeImage: { width: '100%', height: '100%' },
  storeImagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  storeBody: { paddingHorizontal: 4, paddingTop: 10, paddingBottom: 4 },

  storeName: {
    fontSize: 14, fontWeight: '800',
    color: colors.charcoalBlack, marginBottom: 4,
  },
  storeRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  storeRatingVal: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack },
  storeRatingCnt: { fontSize: 12, color: colors.mediumGray },

  storeInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4,
  },
  storeInfoText: { fontSize: 12, color: colors.mediumGray },

  storeTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  storeTag: {
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
  },
  storeTagText: { fontSize: 11, fontWeight: '600' },
});
