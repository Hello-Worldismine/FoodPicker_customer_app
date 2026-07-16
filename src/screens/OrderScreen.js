import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Smartphone, Check, Tag, X, MapPin } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// TODO: 주문 ID는 서버에서 발급받아야 합니다. 이 함수는 백엔드 연동 후 제거하세요.
function generateOrderId() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const seq = String(Math.floor(100 + Math.random() * 900));
  return `ORD-${date}-${seq}`;
}

function calcCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.discountType === '정액') return Math.min(coupon.discountValue, subtotal);
  let d = Math.floor(subtotal * coupon.discountValue / 100);
  if (coupon.maxDiscountAmount) d = Math.min(d, coupon.maxDiscountAmount); // 정률 최대 한도
  return Math.min(d, subtotal);
}

// TODO: GET /api/payment-methods 로 사용자 등록 결제 수단을 불러오세요.
const PAYMENT_METHODS = [
  { id: 'card',     label: '신용/체크카드', Icon: CreditCard },
  { id: 'kakaopay', label: '카카오페이',   Icon: Smartphone },
  { id: 'naverpay', label: '네이버페이',   Icon: Smartphone },
  { id: 'tosspay',  label: '토스페이',     Icon: Smartphone },
];

const CONFIRMS = [
  '소비기한 임박 상품임을 확인했습니다.',
  '지정된 픽업 시간 내 방문해야 함을 확인했습니다.',
  '픽업 후 단순 변심 환불이 제한될 수 있음을 확인했습니다.',
];

export default function OrderScreen({ navigation, route }) {
  const { productId, qty } = route.params;
  const { productList, coupons, placeOrder } = useApp();
  const product = productList.find(p => p.id === productId);

  const [payMethod, setPayMethod] = useState('card');
  const [checked, setChecked] = useState([false, false, false]);
  const [selectedCoupons, setSelectedCoupons] = useState([]);
  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const allChecked = checked.every(Boolean);
  const subtotal = product.salePrice * qty;
  const availableCoupons = coupons.filter(c => subtotal >= c.minOrderAmount);
  const couponDiscount = Math.min(
    selectedCoupons.reduce((s, c) => s + calcCouponDiscount(c, subtotal), 0),
    subtotal,
  );
  const finalPrice = subtotal - couponDiscount;

  function toggleCheck(i) {
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  // 스태킹 규칙: 단독사용 쿠폰은 혼자만, 중복가능 쿠폰끼리는 여러 개.
  function toggleCoupon(coupon) {
    setSelectedCoupons(prev => {
      if (prev.some(c => c.couponId === coupon.couponId)) {
        return prev.filter(c => c.couponId !== coupon.couponId);
      }
      if (!coupon.allowStacking) return [coupon];          // 단독 쿠폰
      if (prev.some(c => !c.allowStacking)) return [coupon]; // 기존 단독 쿠폰 교체
      return [...prev, coupon];
    });
  }

  async function handlePay() {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    try {
      // 서버 RPC(create_order): 재고 검증 → 결제확정(paid) → 발번 → 재고차감 → 판매자/구매자 알림.
      // 쿠폰은 code(selectedCoupon.id)로 전달하고 서버가 실제 할인/금액을 계산한다.
      const order = await placeOrder(productId, qty, selectedCoupons.map(c => c.couponId));
      const couponName = selectedCoupons.length === 0 ? null
        : selectedCoupons.length === 1 ? selectedCoupons[0].name
        : `${selectedCoupons[0].name} 외 ${selectedCoupons.length - 1}건`;
      navigation.replace('OrderComplete', { order: { ...order, couponName } });
    } catch (e) {
      setSubmitting(false);
      const msg = e.message === 'insufficient stock' ? '재고가 부족합니다.'
        : e.message === 'product not on sale' ? '판매가 종료된 상품입니다.'
        : e.message === 'coupon not stackable' ? '단독 사용 쿠폰은 다른 쿠폰과 함께 쓸 수 없습니다.'
        : e.message === 'coupon not valid for this store' ? '이 매장에서 사용할 수 없는 쿠폰이 포함돼 있습니다.'
        : e.message === 'order below coupon minimum' ? '주문 금액이 쿠폰 최소 조건에 미달합니다.'
        : (e.message || '주문 처리 중 오류가 발생했습니다.');
      Alert.alert('주문 실패', msg);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주문/결제</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 주문 상품 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>주문 상품</Text>
          <View style={styles.productRow}>
            <View style={styles.productThumb}>
              <Text style={styles.productEmoji}>{product.emoji || '🍱'}</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productStore}>{product.store}</Text>
              <Text style={styles.productPrice}>
                {product.salePrice.toLocaleString()}원 × {qty}개
              </Text>
            </View>
          </View>
        </View>

        {/* 픽업 정보 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>픽업 정보</Text>
          {[
            { label: '픽업 매장', value: product.store },
            { label: '픽업 가능 시간', value: `${formatTime(product.pickupStart)} ~ ${formatTime(product.pickupEnd)}` },
            { label: '소비기한', value: formatDate(product.expiryDate) },
          ].map((item, idx) => (
            <View key={item.label} style={[styles.infoRow, idx < 2 && styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.pickupPlaceLabel}>픽업 장소</Text>
            <View style={styles.pickupCard}>
              <MapPin size={18} color={colors.primaryGreen} />
              <Text style={styles.pickupAddress}>{product.pickupAddress}</Text>
            </View>
          </View>
        </View>

        {/* 쿠폰 (다중 선택 + 스태킹) */}
        <View style={styles.card}>
          <View style={styles.couponRow}>
            <View style={styles.couponLeft}>
              <Tag size={16} color={colors.primaryGreen} />
              <Text style={[styles.sectionLabel, { marginBottom: 0, marginLeft: 6 }]}>쿠폰</Text>
              {availableCoupons.length > 0 && (
                <View style={styles.couponCountBadge}>
                  <Text style={styles.couponCountText}>{availableCoupons.length}장 사용 가능</Text>
                </View>
              )}
            </View>
            {availableCoupons.length > 0 ? (
              <TouchableOpacity onPress={() => setShowCouponSheet(true)}>
                <Text style={styles.couponSelectBtn}>{selectedCoupons.length > 0 ? '변경' : '쿠폰 선택'}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.couponNoneText}>사용 가능한 쿠폰 없음</Text>
            )}
          </View>
          {selectedCoupons.map(c => (
            <View key={c.couponId} style={styles.selectedCoupon}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.selectedCouponName} numberOfLines={1}>
                  {c.name}{c.allowStacking ? ' · 중복가능' : ''}
                </Text>
                <Text style={styles.selectedCouponInfo}>
                  {c.discountType === '정액'
                    ? `-${c.discountValue.toLocaleString()}원`
                    : `-${c.discountValue}%${c.maxDiscountAmount ? ` (최대 ${c.maxDiscountAmount.toLocaleString()}원)` : ''}`} 할인
                </Text>
              </View>
              <Text style={styles.selectedCouponDiscount}>-{calcCouponDiscount(c, subtotal).toLocaleString()}원</Text>
            </View>
          ))}
        </View>

        {/* 결제 수단 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>결제 수단</Text>
          <View style={styles.payGrid}>
            {PAYMENT_METHODS.map(({ id, label, Icon }) => {
              const active = payMethod === id;
              return (
                <TouchableOpacity key={id} onPress={() => setPayMethod(id)}
                  style={[styles.payBtn, active && styles.payBtnActive]}>
                  <Icon size={16} color={active ? colors.primaryGreen : colors.mediumGray} />
                  <Text style={[styles.payLabel, active && styles.payLabelActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 결제 금액 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>결제 금액</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLbl}>상품 금액</Text>
            <Text style={styles.priceVal}>{(product.originalPrice * qty).toLocaleString()}원</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLbl}>상품 할인</Text>
            <Text style={[styles.priceVal, { color: colors.primaryGreen }]}>
              -{((product.originalPrice - product.salePrice) * qty).toLocaleString()}원
            </Text>
          </View>
          {couponDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLbl}>쿠폰 할인</Text>
              <Text style={[styles.priceVal, { color: colors.primaryGreen }]}>
                -{couponDiscount.toLocaleString()}원
              </Text>
            </View>
          )}
          <View style={styles.priceTotalRow}>
            <Text style={styles.priceTotalLbl}>최종 결제</Text>
            <Text style={styles.priceTotalVal}>{finalPrice.toLocaleString()}원</Text>
          </View>
        </View>

        {/* 구매 전 필수 확인 */}
        <View style={[styles.card, { marginBottom: 0 }]}>
          <Text style={styles.sectionLabel}>구매 전 필수 확인</Text>
          {CONFIRMS.map((text, i) => (
            <TouchableOpacity key={i} onPress={() => toggleCheck(i)}
              style={[styles.confirmRow, i < 2 && styles.confirmRowBorder]}>
              <View style={[styles.checkbox, checked[i] && styles.checkboxOn]}>
                {checked[i] && <Check size={13} color={colors.white} strokeWidth={3} />}
              </View>
              <Text style={styles.confirmText}>{text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 결제 버튼 */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handlePay}
          disabled={!allChecked || submitting}
          style={[styles.payOrderBtn, (!allChecked || submitting) && styles.payOrderBtnOff]}
        >
          <Text style={styles.payOrderBtnText}>
            {submitting ? '결제 처리 중…' : allChecked ? `${finalPrice.toLocaleString()}원 결제하기` : '위 내용을 모두 확인해주세요'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* 쿠폰 바텀시트 (다중 선택 + 스태킹) */}
      <Modal visible={showCouponSheet} transparent animationType="slide" onRequestClose={() => setShowCouponSheet(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowCouponSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>쿠폰 선택</Text>
              <TouchableOpacity onPress={() => setShowCouponSheet(false)}>
                <X size={22} color={colors.charcoalBlack} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>중복 가능 쿠폰끼리는 함께, 단독 쿠폰은 하나만 적용됩니다.</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {availableCoupons.map(coupon => {
                const discount = calcCouponDiscount(coupon, subtotal);
                const isSel = selectedCoupons.some(c => c.couponId === coupon.couponId);
                return (
                  <TouchableOpacity key={coupon.couponId}
                    onPress={() => toggleCoupon(coupon)}
                    style={[styles.couponOption, isSel && styles.couponOptionActive]}>
                    <View style={[styles.couponCheck, isSel && styles.couponCheckOn]}>
                      {isSel && <Check size={12} color={colors.white} strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.couponOptName}>
                        {coupon.name}{coupon.allowStacking ? '' : ' (단독)'}
                      </Text>
                      <Text style={styles.couponOptMeta}>
                        최소 주문 {coupon.minOrderAmount.toLocaleString()}원{coupon.endDate ? ` · ~${coupon.endDate}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.couponOptDiscount}>-{discount.toLocaleString()}원</Text>
                  </TouchableOpacity>
                );
              })}
              {coupons.filter(c => subtotal < c.minOrderAmount).map(coupon => (
                <View key={coupon.couponId} style={[styles.couponOption, styles.couponOptionDisabled]}>
                  <View style={styles.couponCheck} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.couponOptName}>{coupon.name}</Text>
                    <Text style={[styles.couponOptMeta, { color: colors.alertRed }]}>
                      최소 주문 {coupon.minOrderAmount.toLocaleString()}원 이상 사용 가능
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.sheetApplyBtn} onPress={() => setShowCouponSheet(false)}>
              <Text style={styles.sheetApplyText}>
                {selectedCoupons.length > 0 ? `${couponDiscount.toLocaleString()}원 할인 적용` : '닫기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  header: {
    backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.softGray,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  content: { padding: 12, paddingBottom: 140, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.mediumGray, marginBottom: 12 },
  productRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  productThumb: {
    width: 64, height: 64, backgroundColor: colors.softGray, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  productEmoji: { fontSize: 32 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
  productStore: { fontSize: 13, color: colors.mediumGray, marginTop: 3 },
  productPrice: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen, marginTop: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.softGray },
  infoLabel: { fontSize: 13, color: colors.mediumGray, flexShrink: 0, marginRight: 8 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack, textAlign: 'right', flex: 1 },
  pickupPlaceLabel: { fontSize: 13, color: colors.mediumGray, marginBottom: 10 },
  pickupCard: {
    backgroundColor: colors.softGray, borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  pickupAddress: { fontSize: 13, color: colors.charcoalBlack, flex: 1 },
  couponRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  couponLeft: { flexDirection: 'row', alignItems: 'center' },
  couponCountBadge: {
    backgroundColor: colors.freshMint, borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6,
  },
  couponCountText: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },
  couponSelectBtn: { fontSize: 13, color: colors.primaryGreen, fontWeight: '700' },
  couponNoneText: { fontSize: 13, color: colors.mediumGray },
  couponRemoveBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  couponRemoveText: { fontSize: 13, color: colors.alertRed, fontWeight: '600' },
  selectedCoupon: {
    marginTop: 10, backgroundColor: colors.freshMint, borderRadius: 10, padding: '10px 14px',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  selectedCouponName: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  selectedCouponInfo: { fontSize: 12, color: colors.primaryGreen, marginTop: 2 },
  selectedCouponDiscount: { fontSize: 15, fontWeight: '800', color: colors.primaryGreen },
  payGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: colors.softGray,
    borderRadius: 12, width: '48%',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  payBtnActive: { backgroundColor: colors.freshMint, borderColor: colors.primaryGreen },
  payLabel: { fontSize: 13, color: colors.charcoalBlack },
  payLabelActive: { color: colors.primaryGreen, fontWeight: '700' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  priceLbl: { fontSize: 13, color: colors.mediumGray },
  priceVal: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack },
  priceTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 2, borderTopColor: colors.softGray,
    marginTop: 8, paddingTop: 8,
  },
  priceTotalLbl: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack },
  priceTotalVal: { fontSize: 18, fontWeight: '900', color: colors.primaryGreen },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  confirmRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.softGray },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
    backgroundColor: colors.softGray, borderWidth: 2, borderColor: '#D0D3D7',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  confirmText: { fontSize: 13, color: colors.charcoalBlack, lineHeight: 20, flex: 1 },
  bottomBar: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.softGray, padding: 12 },
  payOrderBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  payOrderBtnOff: { backgroundColor: colors.mediumGray },
  payOrderBtnText: { fontSize: 17, fontWeight: '800', color: colors.white },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  couponOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.softGray, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent',
  },
  couponOptionActive: { backgroundColor: colors.freshMint, borderColor: colors.primaryGreen },
  couponOptionDisabled: { opacity: 0.5 },
  couponOptName: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack },
  couponOptMeta: { fontSize: 12, color: colors.mediumGray, marginTop: 4 },
  couponOptDiscount: { fontSize: 16, fontWeight: '900', color: colors.primaryGreen, marginLeft: 6 },
  couponCheck: {
    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
    backgroundColor: colors.white, borderWidth: 2, borderColor: '#D0D3D7',
    alignItems: 'center', justifyContent: 'center',
  },
  couponCheckOn: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  sheetHint: { fontSize: 12, color: colors.mediumGray, marginBottom: 12, marginTop: -6 },
  sheetApplyBtn: { backgroundColor: colors.primaryGreen, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 8 },
  sheetApplyText: { fontSize: 15, fontWeight: '800', color: colors.white },
});
