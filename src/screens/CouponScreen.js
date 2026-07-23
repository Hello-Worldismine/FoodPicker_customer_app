import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Ticket, X } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { previewCoupon } from '../lib/api';

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
  const [previewing, setPreviewing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleRegister() {
    const c = code.trim();
    if (!c) { setCodeError('쿠폰 코드를 입력해주세요.'); setCodeSuccess(''); return; }
    if (previewing) return;
    setPreviewing(true);
    setCodeError(''); setCodeSuccess('');
    try {
      const info = await previewCoupon(c);
      setPreview(info);
    } catch {
      setCodeError('유효하지 않은 쿠폰 코드입니다.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    if (registering) return;
    setRegistering(true);
    try {
      await redeemCoupon(code.trim());
      setPreview(null);
      setCode('');
      setCodeSuccess('쿠폰이 등록되었습니다.');
    } catch {
      setPreview(null);
      setCodeError('쿠폰 등록에 실패했습니다. 다시 시도해주세요.');
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

      {/* 쿠폰 미리보기 팝업 */}
      <Modal transparent visible={!!preview} animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreview(null)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>쿠폰 확인</Text>
              <TouchableOpacity onPress={() => setPreview(null)} style={styles.modalClose}>
                <X size={18} color={colors.mediumGray} />
              </TouchableOpacity>
            </View>
            {preview && (
              <>
                <View style={styles.modalCouponIcon}>
                  <Ticket size={28} color={colors.primaryGreen} />
                </View>
                <Text style={styles.modalDiscount}>{discountLabel(preview)}</Text>
                <Text style={styles.modalName}>{preview.name}</Text>
                <View style={styles.modalMeta}>
                  {!!preview.minOrderAmount && (
                    <Text style={styles.modalMetaText}>최소 주문 {preview.minOrderAmount.toLocaleString()}원</Text>
                  )}
                  {!!preview.endDate && (
                    <Text style={styles.modalMetaText}>유효기간 ~{preview.endDate}</Text>
                  )}
                  {preview.allowStacking && (
                    <Text style={[styles.modalMetaText, { color: '#3B82F6' }]}>중복 사용 가능</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, registering && { opacity: 0.6 }]}
                  onPress={handleConfirm}
                  disabled={registering}
                >
                  {registering
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={styles.modalConfirmText}>쿠폰 등록</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPreview(null)}>
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
            <TouchableOpacity onPress={handleRegister} style={styles.codeBtn} disabled={previewing}>
              {previewing
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.codeBtnText}>등록</Text>}
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

  /* 쿠폰 미리보기 팝업 */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    width: '82%', backgroundColor: colors.white, borderRadius: 20,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 10,
  },
  modalHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.charcoalBlack },
  modalClose: { position: 'absolute', right: 0, padding: 4 },
  modalCouponIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalDiscount: { fontSize: 24, fontWeight: '900', color: colors.primaryGreen, marginBottom: 6 },
  modalName: { fontSize: 14, fontWeight: '600', color: colors.charcoalBlack, marginBottom: 14, textAlign: 'center' },
  modalMeta: { width: '100%', backgroundColor: colors.softGray, borderRadius: 10, padding: 12, gap: 4, marginBottom: 20 },
  modalMetaText: { fontSize: 13, color: colors.mediumGray, textAlign: 'center' },
  modalConfirmBtn: {
    width: '100%', backgroundColor: colors.primaryGreen, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  modalConfirmText: { fontSize: 15, fontWeight: '800', color: colors.white },
  modalCancelBtn: { paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: colors.mediumGray },
});
