import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { QrCode, Clock, MapPin, Star, Navigation } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { openDirections, openInMaps } from '../lib/maps';

const STATUS = {
  pickupReady: { label: '픽업 대기', color: colors.primaryGreen, bg: colors.freshMint },
  pending:     { label: '픽업 대기', color: colors.primaryGreen, bg: colors.freshMint },
  completed:   { label: '픽업 완료', color: '#6B7280',           bg: '#F3F4F6' },
  cancelling:  { label: '취소 요청', color: '#B45309',           bg: '#FEF3C7' },
  cancelled:   { label: '취소됨',   color: colors.alertRed,     bg: '#FFF0F0' },
};

const TABS = [
  { key: 'pending',   label: '예약중' },
  { key: 'completed', label: '픽업완료' },
  { key: 'cancelled', label: '취소·환불' },
];

// 주문 상태 변경(판매자 픽업완료 등)은 AppContext 의 Realtime 구독이 즉시 반영한다.
// 아래 useFocusEffect 는 Realtime 이 끊긴 경우(백그라운드 복귀 등)를 위한 폴백이다.
export default function OrderHistoryScreen({ navigation, route }) {
  const { orders, handleCancelOrder, reloadOrders } = useApp();
  const [tab, setTab] = useState(route?.params?.initialTab ?? 'pending');

  useEffect(() => {
    if (route?.params?.initialTab) setTab(route.params.initialTab);
  }, [route?.params?.initialTab]);

  useFocusEffect(
    useCallback(() => {
      if (reloadOrders) reloadOrders().catch(e => console.warn('[주문내역] 재조회 실패:', e.message));
    }, [reloadOrders]),
  );
  const [showQR, setShowQR] = useState(null);
  const [showCancel, setShowCancel] = useState(null);

  const filtered = orders.filter(o => {
    if (tab === 'pending')   return o.status === 'pickupReady' || o.status === 'pending';
    if (tab === 'completed') return o.status === 'completed';
    if (tab === 'cancelled') return o.status === 'cancelled' || o.status === 'cancelling';
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>주문내역</Text>
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>주문 내역이 없습니다</Text>
          </View>
        ) : filtered.map(order => {
          const st = STATUS[order.status] || STATUS.pending;
          const isPending = order.status === 'pickupReady' || order.status === 'pending';
          return (
            <View key={order.id} style={styles.card}>
              {/* 상태 배지 + 상품명 */}
              <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
              </View>
              <Text style={styles.productName}>{order.productName}</Text>
              <Text style={styles.storeName}>{order.store}</Text>

              {/* 픽업 정보 박스 */}
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>픽업 마감</Text>
                  <View style={styles.metaRight}>
                    <Clock size={12} color={colors.warmOrange} />
                    <Text style={[styles.metaValue, { color: colors.warmOrange }]}>{order.pickupDeadline}</Text>
                  </View>
                </View>
                <View style={[styles.metaRow, { marginBottom: 0 }]}>
                  <Text style={styles.metaLabel}>픽업번호</Text>
                  <Text style={[styles.metaValue, { color: colors.primaryGreen, fontWeight: '900' }]}>{order.id}</Text>
                </View>
                {order.couponName && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>적용 쿠폰</Text>
                    <Text style={[styles.metaValue, { color: colors.primaryGreen }]}>{order.couponName}</Text>
                  </View>
                )}
              </View>

              {/* 픽업 대기: 매장 주소 + 지도 + 버튼 */}
              {isPending && (
                <>
                  {/* 매장 주소 행 */}
                  <View style={styles.storeRow}>
                    <View style={styles.storeRowLeft}>
                      <Text style={styles.storeRowName}>{order.store}</Text>
                      <View style={styles.storeRowAddr}>
                        <MapPin size={11} color={colors.mediumGray} />
                        <Text style={styles.storeRowAddrText}>{order.storeAddress}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.navBtn}
                      onPress={() => openDirections({ address: order.storeAddress, label: order.store })}
                    >
                      <Navigation size={13} color={colors.primaryGreen} />
                      <Text style={styles.navBtnText}>길찾기</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 지도 (탭하면 외부 지도앱에서 매장 위치 표시) */}
                  <TouchableOpacity
                    style={styles.mapPlaceholder}
                    activeOpacity={0.85}
                    onPress={() => openInMaps({ address: order.storeAddress, label: order.store })}
                  >
                    <MapGrid />
                    <View style={styles.mapPinWrap}>
                      <View style={styles.mapPinCircle}>
                        <MapPin size={20} color={colors.white} fill={colors.primaryGreen} />
                      </View>
                      <View style={styles.mapPinShadow} />
                    </View>
                    <Text style={styles.mapLabel}>탭하여 지도 보기</Text>
                  </TouchableOpacity>

                  {/* QR + 취소 버튼 */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQR(order)}>
                      <QrCode size={14} color={colors.primaryGreen} />
                      <Text style={styles.qrBtnText}>QR 보기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancel(order)}>
                      <Text style={styles.cancelBtnText}>취소 요청</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* 픽업 완료: 리뷰 쓰기 버튼 */}
              {order.status === 'completed' && (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() => navigation.navigate('WriteReview', { order })}
                >
                  <Star size={14} color={colors.primaryGreen} fill={colors.primaryGreen} />
                  <Text style={styles.reviewBtnText}>리뷰 쓰기</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* QR 모달 */}
      <Modal visible={!!showQR} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowQR(null)}>
          <View style={styles.qrModal}>
            <Text style={styles.qrModalTitle}>픽업 QR코드</Text>
            <Text style={styles.qrModalStore}>{showQR?.store}</Text>
            <View style={styles.qrBox}>
              {showQR?.id
                ? <QRCode value={showQR.id} size={150} backgroundColor="transparent" color={colors.charcoalBlack} />
                : <QrCode size={100} color={colors.charcoalBlack} />}
              <Text style={styles.qrId}>{showQR?.id}</Text>
            </View>
            <Text style={styles.qrTime}>픽업 마감: {showQR?.pickupDeadline}</Text>
            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setShowQR(null)}>
              <Text style={styles.qrCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 취소 확인 모달 */}
      <Modal visible={!!showCancel} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCancel(null)} />
        <View style={styles.cancelSheet}>
          <Text style={styles.cancelSheetTitle}>주문을 취소할까요?</Text>
          <Text style={styles.cancelSheetSub}>취소된 주문은 복구할 수 없습니다.{'\n'}식품 특성상 픽업 후 취소는 불가합니다.</Text>
          <View style={styles.cancelSheetBtns}>
            <TouchableOpacity style={styles.cancelSheetBack} onPress={() => setShowCancel(null)}>
              <Text style={styles.cancelSheetBackText}>돌아가기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelSheetConfirm} onPress={() => { handleCancelOrder(showCancel.id); setShowCancel(null); }}>
              <Text style={styles.cancelSheetConfirmText}>취소하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 지도 그리드 (인라인)
function MapGrid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0.25, 0.5, 0.75].map((r, i) => (
        <View key={`h${i}`} style={[gridLine, { top: `${r * 100}%`, left: 0, right: 0, height: 1 }]} />
      ))}
      {[0.2, 0.4, 0.6, 0.8].map((r, i) => (
        <View key={`v${i}`} style={[gridLine, { left: `${r * 100}%`, top: 0, bottom: 0, width: 1 }]} />
      ))}
    </View>
  );
}
const gridLine = { position: 'absolute', backgroundColor: '#C8DBC8' };

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  header: { backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.charcoalBlack, marginBottom: 14 },
  tabs: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: colors.softGray },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -2 },
  tabActive: { borderBottomColor: colors.primaryGreen },
  tabText: { fontSize: 14, color: colors.mediumGray },
  tabTextActive: { color: colors.primaryGreen, fontWeight: '800' },

  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: colors.mediumGray },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, marginBottom: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
  productName: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 4 },
  storeName: { fontSize: 13, color: colors.mediumGray, marginBottom: 12 },

  metaBox: { backgroundColor: colors.softGray, borderRadius: 10, padding: 12, marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metaLabel: { fontSize: 12, color: colors.mediumGray },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaValue: { fontSize: 12, fontWeight: '700', color: colors.charcoalBlack },

  storeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  storeRowLeft: { flex: 1 },
  storeRowName: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 3 },
  storeRowAddr: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeRowAddrText: { fontSize: 12, color: colors.mediumGray },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.freshMint,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  navBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },

  mapPlaceholder: {
    height: 130, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#DCE8DC', marginBottom: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  mapPinWrap: { alignItems: 'center' },
  mapPinCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  mapPinShadow: {
    width: 12, height: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.15)',
  },
  mapLabel: { fontSize: 12, color: '#5A7A5A', fontWeight: '600', marginTop: 8 },

  actionRow: { flexDirection: 'row', gap: 8 },
  qrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.freshMint, borderRadius: 10, padding: 12 },
  qrBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12 },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: colors.alertRed },

  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.freshMint, borderWidth: 1.5, borderColor: colors.primaryGreen, borderRadius: 10, padding: 10 },
  reviewBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  qrModal: { backgroundColor: colors.white, borderRadius: 24, padding: 28, width: '80%', alignItems: 'center' },
  qrModalTitle: { fontSize: 18, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 4 },
  qrModalStore: { fontSize: 14, color: colors.mediumGray, marginBottom: 20 },
  qrBox: { backgroundColor: colors.softGray, borderRadius: 16, padding: 20, alignItems: 'center', gap: 12, marginBottom: 14, width: '100%' },
  qrId: { fontSize: 18, fontWeight: '900', color: colors.primaryGreen, letterSpacing: 1 },
  qrTime: { fontSize: 13, color: colors.mediumGray, marginBottom: 16 },
  qrCloseBtn: { backgroundColor: colors.primaryGreen, borderRadius: 12, paddingHorizontal: 40, paddingVertical: 12 },
  qrCloseBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  cancelSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  cancelSheetTitle: { fontSize: 18, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 8 },
  cancelSheetSub: { fontSize: 14, color: colors.mediumGray, lineHeight: 22, marginBottom: 24 },
  cancelSheetBtns: { flexDirection: 'row', gap: 10 },
  cancelSheetBack: { flex: 1, backgroundColor: colors.softGray, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelSheetBackText: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
  cancelSheetConfirm: { flex: 1, backgroundColor: colors.alertRed, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelSheetConfirmText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
