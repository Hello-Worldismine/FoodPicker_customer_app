import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { QrCode, Clock, MapPin, Star, Navigation } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme';
import NaverMap from '../components/NaverMap';
import { useApp } from '../context/AppContext';
import { openDirections, openInMaps } from '../lib/maps';
import { CANCEL_REQUEST_WINDOW_MS } from '../lib/api';

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

// 취소 요청 마감까지 남은 시간 라벨. 1분 미만이면 초 단위로 보여준다.
function remainLabel(ms) {
  if (ms >= 60000) return `${Math.floor(ms / 60000)}분 남음`;
  return `${Math.max(1, Math.ceil(ms / 1000))}초 남음`;
}

// 주문 상태 변경(판매자 픽업완료 등)은 AppContext 의 Realtime 구독이 즉시 반영한다.
// 아래 useFocusEffect 는 Realtime 이 끊긴 경우(백그라운드 복귀 등)를 위한 폴백이다.
export default function OrderHistoryScreen({ navigation, route }) {
  // stores 는 픽업 매장 지도의 좌표 출처다. orders 에는 좌표 컬럼이 없고
  // store_address 스냅샷만 있어서 order.storeId 로 매장 목록에서 찾아 쓴다.
  const { orders, stores, handleRequestCancelOrder, reloadOrders } = useApp();
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
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 취소 요청 카운트다운용 시계(1초). 주문내역 화면에 있을 때만 돈다.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function openCancelSheet(order) {
    setCancelReason('');
    setShowCancel(order);
  }
  async function submitCancelRequest() {
    if (submitting || !showCancel) return;
    setSubmitting(true);
    try {
      await handleRequestCancelOrder(showCancel.id, cancelReason);
      setShowCancel(null);
      setCancelReason('');
    } catch (e) {
      Alert.alert('취소 요청 실패', e.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

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
          // 취소 요청 승인 대기 중에도 픽업은 여전히 가능하다 — QR·길찾기를 감추면 구매자가
          // 취소도 픽업도 못 하는 상태에 갇힌다. 픽업이 먼저 완료되면 서버 respond_order_cancel 이
          // ALREADY_COMPLETED 로 승인을 막으므로 DB 정합은 유지된다.
          const showPickupInfo = isPending || order.status === 'cancelling';
          // 취소 요청은 주문 후 10분 이내에만 가능(서버 cancel_request_window() 와 동일 정책).
          // 한 번 요청/거절된 주문은 다시 요청할 수 없다 — 판매자 판단이 확정된 건이다.
          const remainMs = order.orderedAt
            ? new Date(order.orderedAt).getTime() + CANCEL_REQUEST_WINDOW_MS - now
            : 0;
          const canRequestCancel = isPending && !order.cancelRequestStatus && remainMs > 0;
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

              {/* 취소 요청 접수됨 — 판매자 승인 대기 */}
              {order.status === 'cancelling' && (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeTitle}>판매자 승인 대기 중</Text>
                  <Text style={styles.noticeText}>
                    판매자가 승인하면 결제금액 전액이 환불됩니다(수수료 차감 없음).{'\n'}
                    접수된 취소 요청은 철회할 수 없지만, 승인 전에 픽업하시면 요청은 자동으로 무효가 됩니다.
                  </Text>
                  {!!order.cancelRequestReason && (
                    <Text style={styles.noticeMeta}>요청 사유: {order.cancelRequestReason}</Text>
                  )}
                </View>
              )}

              {/* 취소 요청 거절 — 주문은 그대로 유지된다(픽업 진행) */}
              {order.cancelRequestStatus === 'rejected' && (
                <View style={styles.rejectBox}>
                  <Text style={styles.rejectTitle}>취소 요청이 거절되었습니다</Text>
                  <Text style={styles.rejectText}>
                    {order.cancelResponseReason
                      ? `사유: ${order.cancelResponseReason}`
                      : '자세한 사유는 판매자에게 문의해주세요.'}
                  </Text>
                </View>
              )}

              {/* 취소 승인 — 전액 환불 */}
              {order.cancelRequestStatus === 'approved' && order.status === 'cancelled' && (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeTitle}>취소 승인 · 전액 환불</Text>
                  <Text style={styles.noticeText}>
                    결제금액 {(order.refundAmount || order.discountedPrice || 0).toLocaleString()}원이
                    수수료 차감 없이 환불됩니다. 카드사에 따라 영업일 기준 3~5일이 걸릴 수 있습니다.
                  </Text>
                </View>
              )}

              {/* 픽업 대기: 매장 주소 + 지도 + 버튼 (취소 요청 대기 중에도 그대로 노출) */}
              {showPickupInfo && (
                <>
                  {order.status === 'cancelling' && (
                    <Text style={styles.pickupHint}>
                      취소 요청 승인 대기 중 · 지금 픽업하시면 취소 요청은 자동으로 무효가 됩니다.
                    </Text>
                  )}

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
                      onPress={() => {
                        // orders 에는 좌표 컬럼이 없다. 매장 목록에서 좌표를 찾아 넘겨야
                        // 네이버지도가 '검색'이 아닌 실제 목적지 길찾기로 열린다.
                        const s = order.storeId ? stores.find(v => v.id === order.storeId) : null;
                        openDirections({
                          lat: s?.lat, lng: s?.lng,
                          address: order.storeAddress, label: order.store,
                        });
                      }}
                    >
                      <Navigation size={13} color={colors.primaryGreen} />
                      <Text style={styles.navBtnText}>길찾기</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 픽업 매장 지도.
                      이전에는 MapGrid(선을 그어 만든 가짜 격자) 위에 핀 모양만 얹은 '지도처럼 보이는
                      그림'이었다 — 실제 지도가 아니었다(수정사항 시트 사용자앱 20행).
                      orders 에는 좌표 컬럼이 없고 store_address 스냅샷만 있으므로,
                      order.storeId 로 매장 목록에서 좌표를 찾아 실제 지도를 그린다.
                      좌표를 못 찾으면(매장 좌표 미등록 등) 기존처럼 탭하여 외부 지도앱으로 보낸다. */}
                  {(() => {
                    const s = order.storeId ? stores.find(v => v.id === order.storeId) : null;
                    const hasCoords = s && s.lat != null && s.lng != null;
                    if (hasCoords) {
                      return (
                        <TouchableOpacity
                          style={styles.mapPlaceholder}
                          activeOpacity={0.9}
                          onPress={() => openInMaps({
                            lat: s.lat, lng: s.lng,
                            address: order.storeAddress, label: order.store,
                          })}
                        >
                          <NaverMap
                            lat={s.lat}
                            lng={s.lng}
                            zoom={16}
                            interactive={false}
                            markers={[{ lat: s.lat, lng: s.lng, title: order.store, status: 'selling' }]}
                            style={StyleSheet.absoluteFill}
                          />
                          {/* 지도는 탭을 가로채지 않게 비대화형으로 두고, 탭은 바깥 버튼이 받는다 */}
                          <View style={styles.mapTapHint} pointerEvents="none">
                            <Text style={styles.mapTapHintText}>탭하여 지도앱에서 열기</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return (
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
                    );
                  })()}

                  {/* QR + 취소 요청 버튼(10분 창 안에서만 노출) */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQR(order)}>
                      <QrCode size={14} color={colors.primaryGreen} />
                      <Text style={styles.qrBtnText}>QR 보기</Text>
                    </TouchableOpacity>
                    {canRequestCancel && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => openCancelSheet(order)}>
                        <Text style={styles.cancelBtnText}>취소 요청</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {canRequestCancel ? (
                    <Text style={styles.windowHint}>취소 요청 가능 · {remainLabel(remainMs)}</Text>
                  ) : !order.cancelRequestStatus ? (
                    <Text style={styles.windowHint}>
                      취소 요청 가능 시간(주문 후 10분)이 지났습니다. 판매자에게 문의해주세요.
                    </Text>
                  ) : null}
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

      {/* 취소 요청 모달 — 실제 취소/환불은 판매자 승인 시점에 확정된다 */}
      <Modal visible={!!showCancel} transparent animationType="slide" onRequestClose={() => setShowCancel(null)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowCancel(null)} />
          <View style={styles.cancelSheet}>
            <Text style={styles.cancelSheetTitle}>주문 취소를 요청할까요?</Text>
            <Text style={styles.cancelSheetSub}>
              판매자 승인 후 결제금액 전액이 환불됩니다(수수료 차감 없음).{'\n'}
              요청은 철회할 수 없으며, 식품 특성상 픽업 후 취소는 불가합니다.
            </Text>
            <Text style={styles.reasonLabel}>취소 사유 (선택)</Text>
            <TextInput
              style={styles.reasonInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="예: 시간 내 픽업이 어려워요"
              placeholderTextColor={colors.mediumGray}
              maxLength={100}
              multiline
            />
            <View style={styles.cancelSheetBtns}>
              <TouchableOpacity style={styles.cancelSheetBack} onPress={() => setShowCancel(null)} disabled={submitting}>
                <Text style={styles.cancelSheetBackText}>돌아가기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelSheetConfirm, submitting && { opacity: 0.7 }]}
                onPress={submitCancelRequest}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.cancelSheetConfirmText}>취소 요청</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  // 실제 지도 위에 얹는 안내 배지(지도 타일을 가리지 않게 하단에 작게).
  mapTapHint: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingVertical: 5, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  mapTapHintText: { fontSize: 11, color: colors.white, fontWeight: '600' },

  noticeBox: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 12 },
  noticeTitle: { fontSize: 13, fontWeight: '800', color: '#B45309', marginBottom: 4 },
  noticeText: { fontSize: 12, color: '#8A5A08', lineHeight: 18 },
  noticeMeta: { fontSize: 12, color: '#8A5A08', marginTop: 6 },
  rejectBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, marginBottom: 12 },
  rejectTitle: { fontSize: 13, fontWeight: '800', color: colors.alertRed, marginBottom: 4 },
  rejectText: { fontSize: 12, color: '#9B2C2C', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 8 },
  qrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.freshMint, borderRadius: 10, padding: 12 },
  qrBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12 },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: colors.alertRed },
  windowHint: { fontSize: 11, color: colors.mediumGray, marginTop: 8, textAlign: 'center', lineHeight: 16 },
  pickupHint: { fontSize: 11, color: '#B45309', fontWeight: '700', marginBottom: 8, lineHeight: 16 },

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
  cancelSheetSub: { fontSize: 14, color: colors.mediumGray, lineHeight: 22, marginBottom: 18 },
  reasonLabel: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 8 },
  reasonInput: {
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
    fontSize: 14, color: colors.charcoalBlack, minHeight: 68, textAlignVertical: 'top',
  },
  cancelSheetBtns: { flexDirection: 'row', gap: 10 },
  cancelSheetBack: { flex: 1, backgroundColor: colors.softGray, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelSheetBackText: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
  cancelSheetConfirm: { flex: 1, backgroundColor: colors.alertRed, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelSheetConfirmText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
