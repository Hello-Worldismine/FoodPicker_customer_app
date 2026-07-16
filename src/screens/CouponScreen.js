import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Ticket } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

const TABS = [
  { key: 'available', label: '사용 가능' },
  { key: 'used',      label: '사용 완료' },
];

function discountLabel(coupon) {
  if (coupon.discountType === '정액') return `${coupon.discountValue.toLocaleString()}원 할인`;
  const cap = coupon.maxDiscountAmount ? ` (최대 ${coupon.maxDiscountAmount.toLocaleString()}원)` : '';
  return `${coupon.discountValue}% 할인${cap}`;
}

function CouponCard({ coupon, used }) {
  return (
    <View style={[styles.couponCard, used && styles.couponCardUsed]}>
      <View style={[styles.couponTop, { borderBottomColor: used ? colors.mediumGray : colors.freshMint }]}>
        <View style={[styles.couponIcon, { backgroundColor: used ? '#EBEBEB' : colors.freshMint }]}>
          <Ticket size={22} color={used ? colors.mediumGray : colors.primaryGreen} />
        </View>
        <View style={styles.couponInfo}>
          <Text style={[styles.couponDiscount, { color: used ? colors.mediumGray : colors.primaryGreen }]}>
            {discountLabel(coupon)}
          </Text>
          <Text style={styles.couponName} numberOfLines={1}>{coupon.name}</Text>
          {coupon.allowStacking && (
            <View style={styles.stackBadge}>
              <Text style={styles.stackBadgeText}>중복 사용 가능</Text>
            </View>
          )}
        </View>
        {used && (
          <View style={styles.usedBadge}>
            <Text style={styles.usedBadgeText}>사용 완료</Text>
          </View>
        )}
      </View>
      <View style={styles.couponBottom}>
        <Text style={styles.couponCondition}>{coupon.minOrderAmount.toLocaleString()}원 이상 결제 시</Text>
        <Text style={[styles.couponDate, used && { color: colors.mediumGray }]}>
          {used ? `사용일 ${coupon.usedAt}` : `~${coupon.endDate}`}
        </Text>
      </View>
    </View>
  );
}

export default function CouponScreen({ navigation }) {
  const { coupons, usedCoupons, redeemCoupon } = useApp();
  const [tab, setTab] = useState('available');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');
  const [registering, setRegistering] = useState(false);

  async function handleRegister() {
    const c = code.trim();
    if (!c) { setCodeError('쿠폰 코드를 입력해주세요.'); setCodeSuccess(''); return; }
    if (registering) return;
    setRegistering(true);
    setCodeError(''); setCodeSuccess('');
    try {
      await redeemCoupon(c);
      setCodeSuccess('쿠폰이 등록되었습니다.');
      setCode('');
    } catch {
      setCodeError('유효하지 않은 쿠폰 코드입니다.');
    } finally {
      setRegistering(false);
    }
  }

  const listToShow = tab === 'available' ? coupons : usedCoupons;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>쿠폰함</Text>
        <Text style={styles.headerCount}>{coupons.length}장 보유</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 쿠폰 코드 등록 */}
        <View style={styles.codeSection}>
          <Text style={styles.codeSectionTitle}>쿠폰 코드 등록</Text>
          <View style={styles.codeRow}>
            <TextInput
              value={code}
              onChangeText={v => { setCode(v); setCodeError(''); setCodeSuccess(''); }}
              onSubmitEditing={handleRegister}
              placeholder="쿠폰 코드를 입력하세요"
              style={[styles.codeInput, codeError && { borderColor: colors.alertRed }]}
              placeholderTextColor={colors.mediumGray}
            />
            <TouchableOpacity onPress={handleRegister} style={styles.codeBtn}>
              <Text style={styles.codeBtnText}>등록</Text>
            </TouchableOpacity>
          </View>
          {!!codeError && <Text style={styles.codeError}>{codeError}</Text>}
          {!!codeSuccess && <Text style={styles.codeSuccess}>{codeSuccess}</Text>}
        </View>

        {/* 탭 */}
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={[styles.tab, tab === t.key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 쿠폰 목록 */}
        <View style={styles.list}>
          {listToShow.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎟️</Text>
              <Text style={styles.emptyText}>
                {tab === 'available' ? '보유한 쿠폰이 없습니다' : '사용한 쿠폰이 없습니다'}
              </Text>
            </View>
          ) : listToShow.map(coupon => (
            <CouponCard key={coupon.id} coupon={coupon} used={tab === 'used'} />
          ))}
        </View>
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  headerCount: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  content: { paddingBottom: 100 },
  codeSection: { backgroundColor: colors.white, padding: 16, marginBottom: 8 },
  codeSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 10 },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: {
    flex: 1, backgroundColor: colors.softGray,
    borderWidth: 1.5, borderColor: colors.softGray,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: colors.charcoalBlack,
  },
  codeBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 10,
    paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
  },
  codeBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  codeError: { fontSize: 12, color: colors.alertRed, marginTop: 6 },
  codeSuccess: { fontSize: 12, color: colors.primaryGreen, marginTop: 6 },
  tabs: {
    backgroundColor: colors.white, flexDirection: 'row',
    borderBottomWidth: 2, borderBottomColor: colors.softGray, marginBottom: 8,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -2,
  },
  tabActive: { borderBottomColor: colors.primaryGreen },
  tabText: { fontSize: 14, color: colors.mediumGray },
  tabTextActive: { color: colors.primaryGreen, fontWeight: '800' },
  list: { padding: '4px 16px 100px', paddingHorizontal: 16, paddingVertical: 4 },
  empty: { alignItems: 'center', paddingTop: 72 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 15, color: colors.mediumGray },
  couponCard: {
    backgroundColor: colors.white, borderRadius: 16, marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  couponCardUsed: { opacity: 0.65, shadowOpacity: 0, elevation: 0 },
  couponTop: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    borderBottomWidth: 1.5, borderStyle: 'dashed',
  },
  couponIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  couponInfo: { flex: 1 },
  couponDiscount: { fontSize: 19, fontWeight: '900' },
  couponName: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack, marginTop: 2 },
  stackBadge: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#EAF2FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stackBadgeText: { fontSize: 10, fontWeight: '700', color: '#3B82F6' },
  usedBadge: { backgroundColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  usedBadgeText: { fontSize: 11, fontWeight: '700', color: colors.mediumGray },
  couponBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  couponCondition: { fontSize: 12, color: colors.mediumGray },
  couponDate: { fontSize: 12, fontWeight: '600', color: colors.charcoalBlack },
});
