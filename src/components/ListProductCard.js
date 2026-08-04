import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Heart, Bell, Clock, Star, MapPin } from 'lucide-react-native';
import { colors } from '../theme';
import { formatDeadlineClock, formatDeadlineDuration } from '../lib/format';

// 픽업 마감 표기 — 마감 시각(정본)이 있으면 '오늘 20:50까지', 없는 구 데이터만 '주문 후 N분 이내'.
function pickupLabel(product) {
  if (product.pickupDeadlineAt) return formatDeadlineClock(product.pickupDeadlineAt);
  return formatDeadlineDuration(product.pickupDeadlineMinutes);
}
function stockColor(n) {
  if (n <= 4) return '#E53935';
  if (n <= 9) return '#F97316';
  return '#22A06B';
}
function getBadgeStyle(b) {
  if (b.includes('마감') || b === '오늘까지') return { bg: '#FFF7ED', text: '#C2410C' };
  if (b.includes('할인')) return { bg: '#EFF6FF', text: '#1D4ED8' };
  return { bg: '#E9F8F1', text: '#15803D' };
}

export default function ListProductCard({
  product, onPress, onLike, onStorePress,
  alertPrice, onAlertPress,
}) {
  const soldout = product.status === 'soldout';
  const badges = (product.badges || []).filter(b => b !== '품절');
  const hasAlert = alertPrice != null;
  const showRightBtns = onAlertPress !== undefined;

  const rating = product.storeRating ?? 0;
  const reviewCount = product.storeReviewCount ?? 0;

  return (
    <TouchableOpacity
      style={[styles.row, soldout && styles.rowSoldout]}
      onPress={() => !soldout && onPress?.(product)}
      activeOpacity={0.75}
    >
      {/* 이미지 */}
      <View style={styles.imgWrap}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{product.emoji || '🍱'}</Text>
        )}
        {soldout && (
          <View style={styles.soldoutOverlay}>
            <Text style={styles.soldoutText}>품절</Text>
          </View>
        )}
      </View>

      {/* 상품 정보 */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <TouchableOpacity
          onPress={e => { e.stopPropagation?.(); onStorePress?.(product.storeId); }}
          hitSlop={{ top: 4, bottom: 4 }}
        >
          <Text style={styles.store} numberOfLines={1}>{product.store}</Text>
        </TouchableOpacity>

        {/* 가격 행: 할인율 + 현재가 + 원가 취소선 */}
        <View style={styles.priceRow}>
          <Text style={styles.discRate}>{product.discountRate}%</Text>
          <Text style={styles.salePrice}>{product.salePrice.toLocaleString()}원</Text>
          <Text style={styles.origPrice}>{product.originalPrice.toLocaleString()}원</Text>
        </View>

        {/* ★ 별점 · 남은 수량 · 거리 */}
        <View style={styles.metaRow}>
          <Star size={11} color="#FACC15" fill="#FACC15" />
          <Text style={styles.ratingText}>{rating}</Text>
          <Text style={styles.ratingCnt}>({reviewCount})</Text>
          <Text style={styles.sep}>·</Text>
          <Text style={[styles.stockText, { color: stockColor(product.stock), fontWeight: '700' }]}>
            남은 수량 {product.stock}개
          </Text>
          {product.distance != null && (
            <>
              <Text style={styles.sep}>·</Text>
              <MapPin size={10} color="#666" />
              <Text style={[styles.distText, { color: '#444' }]}>
                {product.distance >= 1000
                  ? `${(product.distance / 1000).toFixed(1)}km`
                  : `${product.distance}m`}
              </Text>
            </>
          )}
        </View>

        {/* 픽업 마감 시각 */}
        <View style={[styles.metaRow, { marginTop: 3 }]}>
          <Clock size={11} color={colors.warmOrange} />
          <Text style={styles.pickupText} numberOfLines={1}>픽업 {pickupLabel(product)}</Text>
        </View>

        {/* 뱃지 */}
        {badges.length > 0 && (
          <View style={styles.badgeRow}>
            {badges.map((b, i) => {
              const s = getBadgeStyle(b);
              return (
                <View key={i} style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.text }]}>{b}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 찜 화면: 하트 + 알림 */}
      {showRightBtns ? (
        <View style={styles.rightBtns}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={e => { e.stopPropagation?.(); onLike?.(product.id); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Heart size={20} color={colors.alertRed} fill={colors.alertRed} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, hasAlert && styles.iconBtnAlert]}
            onPress={e => { e.stopPropagation?.(); onAlertPress?.(); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Bell
              size={20}
              color={hasAlert ? colors.primaryGreen : colors.mediumGray}
              fill={hasAlert ? colors.primaryGreen : 'none'}
            />
          </TouchableOpacity>
        </View>
      ) : (
        /* 카테고리/검색: 하트만 */
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={e => { e.stopPropagation?.(); onLike?.(product.id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart
            size={20}
            color={product.liked ? colors.alertRed : '#CACACA'}
            fill={product.liked ? colors.alertRed : 'none'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  /* 구분선 스타일 — 카드 블록 없음 */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    gap: 14,
  },
  rowSoldout: { opacity: 0.55 },

  /* 이미지 */
  imgWrap: {
    width: 110, height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 42 },
  soldoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldoutText: { color: colors.white, fontSize: 13, fontWeight: '800' },

  /* 정보 */
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2 },
  store: { fontSize: 12, color: colors.mediumGray, marginBottom: 4 },

  /* 가격 행 */
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 5 },
  discRate: { fontSize: 15, fontWeight: '900', color: '#E53935' },
  salePrice: { fontSize: 15, fontWeight: '900', color: colors.charcoalBlack },
  origPrice: { fontSize: 12, color: colors.mediumGray, textDecorationLine: 'line-through' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: '700', color: colors.charcoalBlack },
  ratingCnt: { fontSize: 11, color: colors.mediumGray },
  sep: { fontSize: 11, color: '#CCC' },
  stockText: { fontSize: 11, color: colors.mediumGray },
  distText: { fontSize: 11, color: colors.mediumGray },
  pickupText: { fontSize: 12, color: colors.warmOrange },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  /* 버튼 */
  likeBtn: { padding: 4, flexShrink: 0 },
  rightBtns: {
    flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, flexShrink: 0,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.softGray,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnAlert: { backgroundColor: '#E9F8F1' },
});
