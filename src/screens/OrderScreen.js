import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, Check, Tag, X, MapPin, CreditCard, Smartphone } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { confirmTossPayment, fetchMyPaymentPref } from '../lib/api';
import { EASY_PAY_LABEL, formatDeadlineClock, formatDeadlineDuration } from '../lib/format';
import TossPaymentModal from '../components/TossPaymentModal';

// 픽업 마감 표기 — 마감 시각(정본)이 있으면 '오늘 20:50까지',
// 없는 구 데이터만 '주문 후 N분 이내' 로 폴백한다(다른 화면의 pickupLabel 과 동일 규칙).
function pickupLabel(product) {
  if (product.pickupDeadlineAt) return formatDeadlineClock(product.pickupDeadlineAt);
  return formatDeadlineDuration(product.pickupDeadlineMinutes);
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// 토스페이먼츠 결제창(v2) 클라이언트 키. env 우선, 폴백은 토스 공식 문서의 공개 테스트 키(실결제 안 됨).
const TOSS_CLIENT_KEY = process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

// 토스 orderId 규칙: 영문 대소문자/숫자/-/_ 로 6~64자.
function makeTossOrderId() {
  return `FP_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// 승인(toss-confirm)/주문 생성 에러 → 사용자 안내 문구.
// 서버가 rpc 에러를 '주문 생성에 실패해 결제를 취소했습니다. (원문)' 형태로 래핑하므로
// 정확일치(===)가 아니라 포함(includes) 매칭을 쓴다.
const ORDER_ERROR_MAP = [
  ['insufficient stock', '재고가 부족합니다.'],
  ['product not on sale', '판매가 종료된 상품입니다.'],
  ['store not accepting orders', '지금은 주문을 받지 않는 매장입니다.'],
  ['store not approved', '주문할 수 없는 매장입니다.'],
  ['coupon not stackable', '단독 사용 쿠폰은 다른 쿠폰과 함께 쓸 수 없습니다.'],
  ['coupon not valid for this store', '이 매장에서 사용할 수 없는 쿠폰이 포함돼 있습니다.'],
  ['order below coupon minimum', '주문 금액이 쿠폰 최소 조건에 미달합니다.'],
  ['coupon already used', '이미 사용된 쿠폰이 포함돼 있습니다.'],
  ['amount mismatch', '결제 금액 검증에 실패했습니다. 다시 시도해주세요.'],
  ['payment required', '결제 정보가 없습니다. 다시 시도해주세요.'],
];
function orderErrorMessage(e) {
  const m = (e && e.message) || '';
  for (const [key, label] of ORDER_ERROR_MAP) {
    if (m.includes(key)) {
      // 보상 취소가 완료된 실패면 결제가 취소됐음을 함께 안내
      return m.includes('결제를 취소했습니다') ? `${label}\n결제는 자동 취소되었습니다.` : label;
    }
  }
  return m || '주문 처리 중 오류가 발생했습니다.';
}

// 결제 취소가 '완료'된 확정 실패인가 — 이 경우에만 재결제 유도가 안전하다.
// 그 외(네트워크/상태 불명)는 같은 paymentKey 로 재확인해야 이중 결제가 생기지 않는다.
function isFinalizedFailure(e) {
  const m = (e && e.message) || '';
  return m.includes('결제를 취소했습니다');
}

function calcCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.discountType === '정액') return Math.min(coupon.discountValue, subtotal);
  let d = Math.floor(subtotal * coupon.discountValue / 100);
  if (coupon.maxDiscountAmount) d = Math.min(d, coupon.maxDiscountAmount); // 정률 최대 한도
  return Math.min(d, subtotal);
}

// 결제수단 선택지 — 카드 / 간편결제 로 한정한다.
// 토스 v2 결제창은 두 경우 모두 method='CARD'(카드·간편결제 통합결제창)를 쓰고,
// 간편결제사 코드가 지정돼 있으면 그 앱의 전용 창을 바로 연다(card.flowMode='DIRECT').
// 계좌이체/가상계좌는 입금 지연·웹훅 처리가 없어 제공하지 않는다.
const PAY_OPTIONS = [
  { key: 'CARD',     label: '신용/체크카드', Icon: CreditCard },
  { key: 'EASY_PAY', label: '간편결제',      Icon: Smartphone },
];

const CONFIRMS = [
  '소비기한 임박 상품임을 확인했습니다.',
  '픽업 마감 시각까지 매장에 방문해야 함을 확인했습니다.',
  '픽업 후 단순 변심 환불이 제한될 수 있음을 확인했습니다.',
];

export default function OrderScreen({ navigation, route }) {
  const { productId, qty } = route.params;
  const { productList, coupons, reload } = useApp();
  const { user } = useAuth();
  const product = productList.find(p => p.id === productId);

  const [checked, setChecked] = useState([false, false, false]);
  const [selectedCoupons, setSelectedCoupons] = useState([]);
  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tossVisible, setTossVisible] = useState(false);
  // 결제 세션 스냅샷 — 결제창이 열린 동안 금액/주문번호/결제수단이 흔들리지 않게 고정.
  const [tossSession, setTossSession] = useState(null); // { orderId, amount, method, easyPay }
  // 결제수단(이 주문에만 적용). 기본값은 마이페이지 > 결제수단 관리에 저장한 기본 결제수단.
  const [payMethod, setPayMethod] = useState('CARD');       // 'CARD' | 'EASY_PAY'
  const [easyPayProvider, setEasyPayProvider] = useState(null); // 'TOSSPAY' 등 | null
  // 이중 제출 가드(ref) — state 는 비동기라 연타 시 두 번 진입할 수 있다.
  const submittingRef = React.useRef(false);

  // 기본 결제수단 로드. 결제수단 관리 화면에서 바꾸고 돌아오면 다시 반영한다.
  React.useEffect(() => {
    let alive = true;
    const load = () => {
      fetchMyPaymentPref().then(pref => {
        if (!alive) return;
        setPayMethod(pref.defaultMethod === 'EASY_PAY' ? 'EASY_PAY' : 'CARD');
        setEasyPayProvider(pref.easyPayProvider);
      }).catch(() => {}); // 미설정/조회 실패는 앱 기본값(카드) 유지
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return () => { alive = false; unsub(); };
  }, [navigation]);

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

  // 승인+주문 생성(Edge Function toss-confirm) → 전역 상태 재로딩 → 완료 화면.
  // 서버가 재고/쿠폰/금액을 재검증하고 create_order(service_role)를 실행한다.
  async function finalizeOrder({ paymentKey, orderId, amount }) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    let order;
    try {
      order = await confirmTossPayment({
        paymentKey, orderId, amount,
        productId, quantity: qty,
        couponIds: selectedCoupons.map(c => c.couponId),
      });
    } catch (e) {
      submittingRef.current = false;
      setSubmitting(false);
      const msg = orderErrorMessage(e);
      // 유료 결제인데 취소가 확정되지 않은 실패(네트워크/상태 불명):
      // 같은 paymentKey 로 재확인해야 한다 — 새 결제창을 열면 이중 결제가 된다.
      if (paymentKey && !isFinalizedFailure(e)) {
        Alert.alert('주문 확인 필요', `${msg}\n\n결제 상태를 다시 확인할 수 있습니다.`, [
          { text: '나중에', style: 'cancel' },
          { text: '다시 확인', onPress: () => finalizeOrder({ paymentKey, orderId, amount }) },
        ]);
      } else {
        Alert.alert('주문 실패', msg);
      }
      return;
    }
    // 주문 생성 이후의 재로딩 실패는 주문 실패가 아니다 — 무시하고 완료 화면으로.
    try { await reload(); } catch (e) {}
    const couponName = selectedCoupons.length === 0 ? null
      : selectedCoupons.length === 1 ? selectedCoupons[0].name
      : `${selectedCoupons[0].name} 외 ${selectedCoupons.length - 1}건`;
    navigation.replace('OrderComplete', { order: { ...order, couponName } });
  }

  function handlePay() {
    if (!allChecked || submitting || submittingRef.current) return;
    if (finalPrice === 0) {
      // 전액 쿠폰: 결제창 없이 무결제 주문 (서버가 amount=0 을 재검증)
      finalizeOrder({ amount: 0 });
      return;
    }
    // 결제 세션 고정: 결제창이 열린 동안 금액/결제수단이 바뀌어도 결제창·검증 기준은 불변.
    setTossSession({
      orderId: makeTossOrderId(),
      amount: finalPrice,
      method: 'CARD', // 토스 v2 통합결제창(카드+간편결제)
      easyPay: payMethod === 'EASY_PAY' ? easyPayProvider : null,
    });
    setTossVisible(true);
  }

  function handleTossSuccess({ paymentKey, orderId, amount }) {
    setTossVisible(false);
    const expected = tossSession?.amount;
    // 필수 검증(토스 문서): 리다이렉트 쿼리의 amount == 결제창을 연 시점의 요청 금액.
    if (!expected || Number(amount) !== expected) {
      Alert.alert('결제 실패', '결제 금액이 일치하지 않아 승인하지 않았습니다. 다시 시도해주세요.');
      return;
    }
    finalizeOrder({ paymentKey, orderId, amount: expected });
  }

  function handleTossFail(message, code) {
    setTossVisible(false);
    if (code === 'PAY_PROCESS_CANCELED') return; // 사용자가 결제창에서 직접 취소 — 조용히 복귀
    Alert.alert('결제 실패', message || '결제 처리 중 오류가 발생했습니다.');
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
            { label: '픽업 마감', value: pickupLabel(product) },
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

        {/* 결제 수단 (카드 / 간편결제) */}
        <View style={styles.card}>
          <View style={styles.payHeaderRow}>
            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>결제 수단</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PaymentMethod')}>
              <Text style={styles.payManageBtn}>결제수단 관리</Text>
            </TouchableOpacity>
          </View>
          {PAY_OPTIONS.map(opt => {
            const on = payMethod === opt.key;
            // 간편결제사를 지정해두면 그 앱 창이 바로 열린다. 없으면 통합결제창에서 고른다.
            const desc = opt.key === 'CARD'
              ? '카드·간편결제 통합 결제창이 열려요'
              : easyPayProvider
                ? `${EASY_PAY_LABEL[easyPayProvider] || easyPayProvider} 결제창이 바로 열려요`
                : '결제수단 관리에서 간편결제사를 지정하면 바로 열려요';
            return (
              <TouchableOpacity key={opt.key} onPress={() => setPayMethod(opt.key)}
                style={[styles.payOption, on && styles.payOptionOn]}>
                <View style={styles.payOptionIcon}>
                  <opt.Icon size={18} color={on ? colors.primaryGreen : colors.mediumGray} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payOptionName}>{opt.label}</Text>
                  <Text style={styles.payOptionDesc}>{desc}</Text>
                </View>
                <View style={[styles.radio, on && styles.radioOn]}>
                  {on && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.tossPayCard}>
            <ShieldCheck size={18} color={colors.primaryGreen} />
            <Text style={styles.tossPayDesc}>
              결제는 토스페이먼츠 결제창에서 진행되며, 카드번호는 앱에 저장되지 않아요.
            </Text>
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

      {/* 토스페이먼츠 결제창 */}
      <TossPaymentModal
        visible={tossVisible && !!tossSession}
        onClose={() => setTossVisible(false)}
        clientKey={TOSS_CLIENT_KEY}
        customerKey={user?.id}
        amount={tossSession?.amount ?? 0}
        orderId={tossSession?.orderId ?? ''}
        orderName={(qty > 1 ? `${product.name} ${qty}개` : product.name).slice(0, 100)}
        method={tossSession?.method ?? 'CARD'}
        easyPay={tossSession?.easyPay ?? null}
        onSuccess={handleTossSuccess}
        onFail={handleTossFail}
      />
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
  payHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  payManageBtn: { fontSize: 13, color: colors.primaryGreen, fontWeight: '700' },
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.softGray, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  payOptionOn: { backgroundColor: colors.freshMint, borderColor: colors.primaryGreen },
  payOptionIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  payOptionName: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack },
  payOptionDesc: { fontSize: 12, color: colors.mediumGray, marginTop: 2 },
  radio: {
    width: 20, height: 20, borderRadius: 10, flexShrink: 0,
    borderWidth: 2, borderColor: '#D0D3D7', backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primaryGreen },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primaryGreen },
  tossPayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.freshMint, borderRadius: 12, padding: 12, marginTop: 4,
  },
  tossPayDesc: { fontSize: 12, color: '#15803D', lineHeight: 17, flex: 1 },
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
