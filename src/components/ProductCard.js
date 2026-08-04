import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Heart, Clock, Bell } from 'lucide-react-native';
import { colors } from '../theme';
import { formatDeadlineClock, formatDeadlineDuration } from '../lib/format';

// 픽업 마감 표기 — 마감 시각(정본)이 있으면 '오늘 20:50까지', 없는 구 데이터만 '주문 후 N분 이내'.
function pickupLabel(product) {
  if (product.pickupDeadlineAt) return formatDeadlineClock(product.pickupDeadlineAt);
  return formatDeadlineDuration(product.pickupDeadlineMinutes);
}

export default function ProductCard({
  product, onPress, onLike, onStorePress,
  alertPrice, onAlertPress,
}) {
  const soldout = product.status === 'soldout';
  const badges = product.badges?.filter(b => b !== '품절') || [];
  const hasMagam = badges.some(b => b.includes('마감'));
  const hasAlert = alertPrice != null;

  return (
    // 외부 래퍼: 그림자 담당 (overflow:hidden 없음)
    <View style={[styles.cardShadow, soldout && styles.cardSoldout]}>
      {/* 내부 카드: overflow:hidden으로 이미지·모서리 클리핑 */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => !soldout && onPress?.(product)}
        activeOpacity={soldout ? 1 : 0.85}
      >
        {/* 이미지 영역 */}
        <View style={[styles.imageBox, hasMagam && styles.imageBoxMagam]}>
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.emoji}>{product.emoji || '🍱'}</Text>
          )}

          {soldout && (
            <View style={styles.soldoutOverlay}>
              <Text style={styles.soldoutText}>품절</Text>
            </View>
          )}

          <View style={styles.topLeftBadges}>
            {badges.map((b, i) => (
              <View key={i} style={[
                styles.badge,
                (b.includes('마감') || b === '오늘까지') && styles.badgeMagam,
                b.includes('할인') && styles.badgeDiscount,
              ]}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>

          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discountRate}%</Text>
          </View>

          <TouchableOpacity style={styles.likeBtn} onPress={() => onLike?.(product.id)}>
            <Heart
              size={16}
              color={product.liked ? colors.alertRed : colors.mediumGray}
              fill={product.liked ? colors.alertRed : 'none'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* 정보 영역 */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          <TouchableOpacity onPress={() => onStorePress?.(product.storeId)} hitSlop={{ top: 4, bottom: 4 }}>
            <Text style={styles.store} numberOfLines={1}>
              {product.store} · {product.distance >= 1000
                ? `${(product.distance / 1000).toFixed(1)}km`
                : `${product.distance}m`}
            </Text>
          </TouchableOpacity>

          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>{product.originalPrice.toLocaleString()}원</Text>
            <Text style={styles.salePrice}>{product.salePrice.toLocaleString()}원</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.stockText}>남은 수량 {product.stock}개</Text>
            <View style={styles.pickupRow}>
              <Clock size={11} color={colors.warmOrange} />
              <Text style={styles.pickupText} numberOfLines={1}>
                {pickupLabel(product)}
              </Text>
            </View>
          </View>
        </View>

        {/* 가격 알림 바 — onAlertPress가 있을 때만 표시 (찜 화면) */}
        {onAlertPress !== undefined && (
          <TouchableOpacity
            style={[styles.alertBar, hasAlert && styles.alertBarActive]}
            onPress={onAlertPress}
            activeOpacity={0.75}
          >
            <Bell
              size={13}
              color={hasAlert ? colors.primaryGreen : colors.mediumGray}
              fill={hasAlert ? colors.primaryGreen : 'none'}
            />
            <Text style={[styles.alertText, hasAlert && styles.alertTextActive]} numberOfLines={1}>
              {hasAlert
                ? `${alertPrice.toLocaleString()}원 이하로 내려오면 알림`
                : '가격 알림 설정'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 그림자는 여기 — overflow:hidden 없음 */
  cardShadow: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 5,
  },
  cardSoldout: { opacity: 0.55 },

  /* overflow:hidden은 여기만 */
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },

  imageBox: {
    height: 160,
    backgroundColor: '#F0F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBoxMagam: { backgroundColor: '#FFF5EE' },
  emoji: { fontSize: 68 },

  soldoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldoutText: { color: colors.white, fontSize: 18, fontWeight: '800' },

  topLeftBadges: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', gap: 4,
  },
  badge: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  badgeMagam: { backgroundColor: colors.warmOrange },
  badgeDiscount: { backgroundColor: '#3B82F6' },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  discountBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  discountText: { color: colors.white, fontSize: 12, fontWeight: '800' },

  likeBtn: {
    position: 'absolute', bottom: 10, right: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },

  info: { padding: 13 },
  name: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 3 },
  store: { fontSize: 12, color: colors.mediumGray, marginBottom: 9 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  originalPrice: { fontSize: 12, color: colors.mediumGray, textDecorationLine: 'line-through' },
  salePrice: { fontSize: 17, fontWeight: '900', color: colors.primaryGreen },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockText: { fontSize: 11, color: colors.mediumGray },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pickupText: { fontSize: 11, color: colors.mediumGray },

  /* 가격 알림 바 */
  alertBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    paddingHorizontal: 13, paddingVertical: 10,
    backgroundColor: colors.white,
  },
  alertBarActive: { backgroundColor: '#F0FAF4', borderTopColor: `${colors.primaryGreen}22` },
  alertText: { flex: 1, fontSize: 12, color: colors.mediumGray, fontWeight: '500' },
  alertTextActive: { color: colors.primaryGreen, fontWeight: '600' },
});
