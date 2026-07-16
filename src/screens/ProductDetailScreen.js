import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Share2, Heart, MapPin, Store, ChevronDown, ChevronUp,
  AlertTriangle, Clock,
} from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { fetchPriceHistory } from '../lib/api';
import { openInMaps } from '../lib/maps';
import NaverMap from '../components/NaverMap';

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// TODO: 상품 상세를 GET /api/products/:productId 로 교체하세요.
//       재고·상태는 실시간 변동이 있으므로 화면 진입 시마다 최신 데이터를 불러오세요.
export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { productList, handleLike } = useApp();
  const product = productList.find(p => p.id === productId);
  const [qty, setQty] = useState(1);
  const [expandedSection, setExpandedSection] = useState(null);
  const [priceHistory, setPriceHistory] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPriceHistory(productId).then(h => { if (alive) setPriceHistory(h); }).catch(() => {});
    return () => { alive = false; };
  }, [productId]);

  if (!product) return null;

  const now = new Date();
  const isExpired = new Date(product.expiryDate) < now;
  const isPickupEnded = new Date(product.pickupEnd) < now;
  const isSoldout = product.status === 'soldout' || product.stock === 0;
  const unavailable = isExpired || isPickupEnded || isSoldout;

  let btnLabel = `${(product.salePrice * qty).toLocaleString()}원 예약하기`;
  let btnDisabled = false;
  if (isSoldout) { btnLabel = '품절된 상품입니다'; btnDisabled = true; }
  if (isPickupEnded || isExpired) { btnLabel = '판매가 종료되었습니다'; btnDisabled = true; }

  function handleShare() {
    const msg = [
      `${product.name} — ${product.store}`,
      `${product.salePrice.toLocaleString()}원 (정가 ${product.originalPrice.toLocaleString()}원 · ${product.discountRate}% 할인)`,
      'FoodPicker에서 마감 임박 할인 상품을 픽업으로 만나보세요!',
    ].join('\n');
    Share.share({ message: msg }).catch(() => {});
  }

  const sections = [
    { key: 'composition', label: '상품 구성', content: product.composition },
    { key: 'origin',      label: '원산지 정보', content: product.origin },
    { key: 'allergy',     label: '알레르기 정보', content: product.allergyInfo },
    { key: 'storage',     label: '보관 방법',   content: product.storageMethod },
    { key: 'expiry',      label: '소비기한',    content: formatDate(product.expiryDate) },
    { key: 'pickupTime',  label: '픽업 가능 시간', content: `${formatTime(product.pickupStart)} ~ ${formatTime(product.pickupEnd)}` },
    { key: 'cancel',      label: '취소/환불 규정', content: product.cancelPolicy },
    ...(product.storeNotice ? [{ key: 'notice', label: '매장 공지', content: product.storeNotice }] : []),
  ];

  return (
    <View style={styles.outer}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* 이미지 영역 (오버레이 헤더 포함) */}
        <View style={styles.imageArea}>
          {product.image
            ? <Image source={{ uri: product.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            : <Text style={styles.emoji}>{product.emoji}</Text>
          }

          {/* 상단 버튼 바 (오버레이) */}
          <SafeAreaView style={styles.imageHeader} edges={['top']}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.imageBtn}>
              <ArrowLeft size={20} color={colors.charcoalBlack} />
            </TouchableOpacity>
            <View style={styles.imageHeaderRight}>
              <TouchableOpacity style={styles.imageBtn} onPress={handleShare}>
                <Share2 size={18} color={colors.charcoalBlack} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageBtn} onPress={() => handleLike(product.id)}>
                <Heart
                  size={18}
                  fill={product.liked ? colors.alertRed : 'none'}
                  color={product.liked ? colors.alertRed : colors.charcoalBlack}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* 배지 */}
          <View style={styles.badgesRow}>
            {product.badges?.map(b => (
              <View key={b} style={[
                styles.badge,
                (b.includes('마감') || b.includes('오늘까지')) && { backgroundColor: colors.warmOrange },
                b.includes('할인') && { backgroundColor: '#3B82F6' },
              ]}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 기본 정보 카드 */}
        <View style={styles.card}>
          <Text style={styles.productName}>{product.name}</Text>
          <TouchableOpacity
            style={styles.storeRow}
            onPress={() => navigation.navigate('Store', { storeId: product.storeId })}
          >
            <Store size={13} color={colors.primaryGreen} />
            <Text style={styles.storeName}>{product.store}</Text>
            <ChevronDown size={13} color={colors.primaryGreen} style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
          {product.distance != null && (
            <View style={styles.distRow}>
              <MapPin size={11} color={colors.mediumGray} />
              <Text style={styles.distText}>
                {product.distance >= 1000
                  ? `${(product.distance / 1000).toFixed(1)}km`
                  : `${product.distance}m`}
              </Text>
            </View>
          )}

          {/* 가격 */}
          <View style={styles.priceArea}>
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>정가 {product.originalPrice.toLocaleString()}원</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discountRate}%</Text>
              </View>
            </View>
            <Text style={styles.salePrice}>{product.salePrice.toLocaleString()}원</Text>
          </View>
        </View>

        {/* 가격 흐름 카드 (실제 product_price_history 기반) */}
        <PriceFlowCard product={product} history={priceHistory} />

        {/* 정보 그리드 카드 */}
        <View style={styles.card}>
          <View style={styles.infoGrid}>
            {[
              { label: '남은 수량',      value: isSoldout ? '품절' : `${product.stock}개`, warn: isSoldout },
              { label: '픽업 가능 시간', value: `${formatTime(product.pickupStart)}~${formatTime(product.pickupEnd)}` },
              { label: '소비기한',       value: formatDate(product.expiryDate), warn: isExpired },
              { label: '보관 방법',      value: product.storage },
            ].map(item => (
              <View key={item.label} style={styles.infoGridItem}>
                <Text style={styles.infoGridLabel}>{item.label}</Text>
                <Text style={[styles.infoGridValue, item.warn && { color: colors.alertRed }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 구매 전 주의사항 */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <AlertTriangle size={16} color={colors.warmOrange} />
            <Text style={styles.noticeTitle}>구매 전 꼭 확인해주세요</Text>
          </View>
          {[
            '이 상품은 소비기한이 임박한 상품입니다.',
            '구매 후 지정된 시간 안에 매장에서 직접 픽업해야 합니다.',
            '픽업 후에는 식품 특성상 단순 변심 환불이 어려울 수 있습니다.',
            '알레르기 정보와 보관 방법을 확인해주세요.',
          ].map((t, i) => (
            <Text key={i} style={styles.noticeItem}>• {t}</Text>
          ))}
        </View>

        {/* 픽업 장소 — 네이버 지도(좌표 있으면 실지도, 없으면 탭하여 외부 지도) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>픽업 장소</Text>
          {product.lat != null && product.lng != null ? (
            <NaverMap
              lat={product.lat}
              lng={product.lng}
              markers={[{ lat: product.lat, lng: product.lng, title: product.store }]}
              style={styles.mapPlaceholder}
            />
          ) : (
            <TouchableOpacity
              style={styles.mapPlaceholder}
              activeOpacity={0.85}
              onPress={() => openInMaps({ address: product.pickupAddress, label: product.store })}
            >
              <MapGrid />
              <View style={{ zIndex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>📍</Text>
                <View style={styles.mapLabel}>
                  <Text style={styles.mapLabelText}>{product.store}</Text>
                </View>
                <Text style={styles.mapTapHint}>탭하여 지도 보기</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.addressRow}>
            <MapPin size={13} color={colors.mediumGray} />
            <Text style={styles.addressText}>{product.pickupAddress}</Text>
          </View>
          <View style={{ height: 4 }} />
        </View>

        {/* 상세 섹션 (아코디언) */}
        <View style={styles.accordionCard}>
          {sections.map((sec, idx) => (
            <View key={sec.key} style={idx > 0 ? styles.accordionBorder : undefined}>
              <TouchableOpacity
                style={styles.accordionRow}
                onPress={() => setExpandedSection(expandedSection === sec.key ? null : sec.key)}
              >
                <Text style={styles.accordionLabel}>{sec.label}</Text>
                {expandedSection === sec.key
                  ? <ChevronUp size={16} color={colors.mediumGray} />
                  : <ChevronDown size={16} color={colors.mediumGray} />}
              </TouchableOpacity>
              {expandedSection === sec.key && (
                <View style={styles.accordionContent}>
                  <Text style={styles.accordionText}>{sec.content}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 고정 하단 바 */}
      <View style={styles.bottomBar}>
        {!btnDisabled && (
          <View style={styles.qtyControl}>
            <TouchableOpacity
              onPress={() => setQty(q => Math.max(1, q - 1))}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{qty}</Text>
            <TouchableOpacity
              onPress={() => setQty(q => Math.min(product.stock, q + 1))}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[styles.orderBtn, btnDisabled && styles.orderBtnDisabled]}
          onPress={() => !btnDisabled && navigation.navigate('Order', { productId: product.id, qty })}
          disabled={btnDisabled}
        >
          <Text style={styles.orderBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PH_REASON_LABEL = { initial: '판매 시작가', auto: '자동 할인 적용', manual: '가격 조정' };

// 실제 이력(product_price_history) → 표시용 타임라인. 이력이 없으면 시작가→현재가 2점(조작 없이).
function buildPriceTimeline(product, rows) {
  if (rows && rows.length > 0) {
    const pts = rows.map(r => ({
      time: r.time,
      label: PH_REASON_LABEL[r.reason] || '가격 변동',
      price: r.price,
      isCurrent: false,
    }));
    const last = pts.length - 1;
    pts[last] = { ...pts[last], time: '현재', label: '오늘 최종 할인 중', price: product.salePrice, isCurrent: true };
    return pts;
  }
  return [
    { time: '시작가', label: '판매 시작가',       price: product.originalPrice, isCurrent: false },
    { time: '현재',   label: '오늘 최종 할인 중', price: product.salePrice,     isCurrent: true  },
  ];
}

function PriceFlowCard({ product, history }) {
  const [expanded, setExpanded] = useState(false);
  const timeline = buildPriceTimeline(product, history);
  const priceDrop = product.originalPrice - product.salePrice;
  const tPoints = timeline.length <= 3
    ? timeline
    : [timeline[0], timeline[Math.floor((timeline.length - 1) / 2)], timeline[timeline.length - 1]];

  return (
    <View style={styles.pfCard}>
      {/* 헤더 */}
      <Text style={styles.pfTitle}>{expanded ? '가격 하락 내역' : '오늘 가격 흐름'}</Text>
      <Text style={styles.pfSub}>
        {expanded ? '시작가 → 현재가' : `${priceDrop.toLocaleString()}원 내려갔어요`}
      </Text>

      {/* 타임라인 */}
      <View style={styles.pfTimeline}>
        <View style={styles.pfTrackBg} />
        {tPoints.map((p, i) => (
          <View key={i} style={styles.pfPointCol}>
            <View style={[styles.pfDot, p.isCurrent && styles.pfDotActive]} />
            <Text style={[styles.pfPointTime, p.isCurrent && styles.pfActive]}>{p.time}</Text>
            <Text style={[styles.pfPointPrice, p.isCurrent && styles.pfActive]}>
              {p.price.toLocaleString()}원
            </Text>
          </View>
        ))}
      </View>

      {/* 펼쳐진 상세 내역 */}
      {expanded && (
        <View style={styles.pfDetailWrap}>
          {timeline.map((h, i) => (
            <View key={i} style={[styles.pfRow, h.isCurrent && styles.pfRowCurrent]}>
              <Text style={[styles.pfRowTime, h.isCurrent && styles.pfActive]}>{h.time}</Text>
              <Text style={[styles.pfRowLabel, h.isCurrent && styles.pfActive]}>{h.label}</Text>
              <Text style={[styles.pfRowPrice, h.isCurrent && styles.pfActive]}>
                {h.price.toLocaleString()}원
              </Text>
            </View>
          ))}
          <Text style={styles.pfTotalBadge}>총 {product.discountRate}% 할인!</Text>
        </View>
      )}

      {/* 펼치기 / 접기 */}
      <TouchableOpacity style={styles.pfToggleBtn} onPress={() => setExpanded(v => !v)}>
        <Text style={styles.pfToggleText}>{expanded ? '접기' : '가격 하락 내역 보기'}</Text>
        {expanded
          ? <ChevronUp size={14} color={colors.primaryGreen} />
          : <ChevronDown size={14} color={colors.primaryGreen} />}
      </TouchableOpacity>
    </View>
  );
}

function MapGrid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', top: '35%', left: 0, right: 0, height: 7, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4 }} />
      <View style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: 7, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.softGray },

  /* 이미지 영역 */
  imageArea: {
    height: 280, backgroundColor: '#E8F0E8',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  emoji: { fontSize: 100 },
  imageHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 4,
  },
  imageHeaderRight: { flexDirection: 'row', gap: 8 },
  imageBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgesRow: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', gap: 6,
  },
  badge: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  /* 기본 정보 카드 */
  card: { backgroundColor: colors.white, padding: 16, marginBottom: 8 },
  productName: { fontSize: 20, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 6 },
  storeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingBottom: 6, paddingTop: 2,
  },
  storeName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primaryGreen },
  distRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingBottom: 16,
  },
  distText: { fontSize: 12, color: colors.mediumGray },

  priceArea: { marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  originalPrice: { fontSize: 13, color: colors.mediumGray, textDecorationLine: 'line-through' },
  discountBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  discountText: { fontSize: 13, fontWeight: '700', color: colors.alertRed },
  salePrice: { fontSize: 28, fontWeight: '900', color: colors.primaryGreen },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoGridItem: {
    width: '47%', backgroundColor: colors.softGray,
    borderRadius: 10, padding: 12,
  },
  infoGridLabel: { fontSize: 11, color: colors.mediumGray, marginBottom: 4 },
  infoGridValue: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack },

  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.mediumGray, marginBottom: 12 },

  /* ── 가격 흐름 카드 ── */
  pfCard: {
    backgroundColor: colors.white, marginBottom: 8,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 0,
  },
  pfTitle: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 3 },
  pfSub: { fontSize: 12, color: colors.mediumGray, marginBottom: 20 },

  /* 타임라인 */
  pfTimeline: {
    flexDirection: 'row', position: 'relative', marginBottom: 4,
  },
  pfTrackBg: {
    position: 'absolute', top: 7,
    left: '16.67%', right: '16.67%',
    height: 2, backgroundColor: '#E0E0E0',
  },
  pfPointCol: { flex: 1, alignItems: 'center', zIndex: 1 },
  pfDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.white, borderWidth: 2, borderColor: '#C8C8C8',
    marginBottom: 6,
  },
  pfDotActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  pfPointTime: { fontSize: 11, color: colors.mediumGray, marginBottom: 2 },
  pfPointPrice: { fontSize: 12, fontWeight: '700', color: colors.charcoalBlack },
  pfActive: { color: colors.primaryGreen, fontWeight: '700' },

  /* 상세 내역 */
  pfDetailWrap: {
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    marginTop: 12, paddingTop: 4,
  },
  pfRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  pfRowCurrent: {
    backgroundColor: '#F0FAF4', borderRadius: 8,
    marginHorizontal: -4, paddingHorizontal: 4,
    borderBottomWidth: 0,
  },
  pfRowTime: { width: 46, fontSize: 13, color: colors.mediumGray, fontWeight: '600' },
  pfRowLabel: { flex: 1, fontSize: 13, color: colors.mediumGray },
  pfRowPrice: { fontSize: 13, fontWeight: '800', color: colors.charcoalBlack },
  pfTotalBadge: {
    fontSize: 14, fontWeight: '900', color: colors.primaryGreen,
    paddingVertical: 10, textAlign: 'center',
  },

  /* 펼치기/접기 버튼 */
  pfToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 6,
  },
  pfToggleText: { fontSize: 13, color: colors.primaryGreen, fontWeight: '600' },

  /* 주의사항 */
  noticeCard: { backgroundColor: '#FFF8E6', padding: 16, marginBottom: 8 },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: colors.warmOrange },
  noticeItem: { fontSize: 13, color: '#7A5C1E', lineHeight: 22, marginTop: 2 },

  /* 픽업 지도 */
  mapPlaceholder: {
    height: 160, borderRadius: 14, backgroundColor: '#E8F4E8',
    overflow: 'hidden', marginBottom: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  mapLabel: {
    marginTop: 6, backgroundColor: colors.primaryGreen,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  mapLabelText: { fontSize: 12, fontWeight: '700', color: colors.white },
  mapTapHint: { fontSize: 11, color: '#5A7A5A', fontWeight: '600', marginTop: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { flex: 1, fontSize: 13, color: colors.mediumGray },

  /* 아코디언 */
  accordionCard: { backgroundColor: colors.white, marginBottom: 8 },
  accordionBorder: { borderTopWidth: 1, borderTopColor: colors.softGray },
  accordionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, paddingHorizontal: 16,
  },
  accordionLabel: { fontSize: 14, fontWeight: '600', color: colors.charcoalBlack },
  accordionContent: { paddingHorizontal: 16, paddingBottom: 14 },
  accordionText: { fontSize: 13, color: colors.charcoalBlack, lineHeight: 21 },

  /* 하단 고정 바 */
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.softGray,
    padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center',
    paddingBottom: 24,
  },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8EAED', borderRadius: 12, overflow: 'hidden',
  },
  qtyBtn: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, color: colors.charcoalBlack, fontWeight: '500' },
  qtyValue: {
    width: 32, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: colors.charcoalBlack,
  },
  orderBtn: {
    flex: 1, backgroundColor: colors.primaryGreen,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  orderBtnDisabled: { backgroundColor: colors.mediumGray },
  orderBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
