import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, QrCode, Navigation, ClipboardList } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme';
import { openDirections } from '../lib/maps';

export default function OrderCompleteScreen({ navigation, route }) {
  const { order } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 성공 헤더 */}
        <View style={styles.successHeader}>
          <CheckCircle size={56} color={colors.white} strokeWidth={1.5} />
          <Text style={styles.successTitle}>예약이 완료되었어요!</Text>
          <Text style={styles.successSub}>픽업 시간에 맞춰 방문해주세요</Text>
        </View>

        <View style={styles.content}>

          {/* 픽업번호 */}
          <View style={styles.card}>
            <Text style={styles.pickupNumLabel}>픽업번호</Text>
            <Text style={styles.pickupNum}>{order.id}</Text>
            <View style={styles.qrBox}>
              {order?.id
                ? <QRCode value={order.id} size={140} backgroundColor="transparent" color={colors.charcoalBlack} />
                : <QrCode size={80} color={colors.charcoalBlack} />}
            </View>
            <Text style={styles.qrGuide}>매장 직원에게 QR 또는 픽업번호를 보여주세요.</Text>
          </View>

          {/* 예약 정보 */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>예약 정보</Text>
            {[
              { label: '상품명', value: order.productName },
              { label: '픽업 마감', value: order.pickupDeadline },
              { label: '픽업 매장', value: order.store },
              { label: '매장 주소', value: order.storeAddress },
              { label: '결제 금액', value: `${order.totalPrice.toLocaleString()}원`, bold: true },
            ].map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={[styles.infoValue, item.bold && styles.infoValueBold]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* 픽업 알림 — 서버(send_pickup_reminders)가 마감 30분 전에 푸시를 보낸다.
              주문 시점에 이미 30분 미만이면 create_order 가 즉시 1회 안내한다. */}
          <View style={styles.reminderBox}>
            <Text style={styles.reminderText}>
              {(order.pickupDeadlineMinutes ?? 60) <= 30
                ? `⏰ ${order.pickupDeadline} 픽업 마감이 임박했어요. 지금 출발해주세요!`
                : '📍 픽업 마감 30분 전에 알림을 보내드릴게요'}
            </Text>
          </View>

          {/* 버튼 */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => openDirections({ address: order.storeAddress, label: order.store })}
            >
              <Navigation size={16} color={colors.primaryGreen} />
              <Text style={styles.navBtnText}>길찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ordersBtn}
              onPress={() => navigation.reset({
                index: 0,
                routes: [{
                  name: 'MainTabs',
                  state: {
                    index: 3,
                    routes: [
                      { name: 'Home' },
                      { name: 'Map' },
                      { name: 'Liked' },
                      { name: 'Orders', params: { initialTab: 'pending' } },
                      { name: 'MyPage' },
                    ],
                  },
                }],
              })}
            >
              <ClipboardList size={16} color={colors.white} />
              <Text style={styles.ordersBtnText}>주문내역 보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  scroll: { paddingBottom: 40 },
  successHeader: {
    backgroundColor: colors.primaryGreen,
    paddingTop: 48, paddingBottom: 32, paddingHorizontal: 16,
    alignItems: 'center', gap: 12,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: colors.white },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20 },
  pickupNumLabel: { fontSize: 13, color: colors.mediumGray, textAlign: 'center', marginBottom: 4 },
  pickupNum: {
    fontSize: 28, fontWeight: '900', color: colors.primaryGreen,
    textAlign: 'center', letterSpacing: 2, marginBottom: 12,
  },
  qrBox: {
    backgroundColor: colors.softGray, borderRadius: 12, padding: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  qrGuide: { fontSize: 13, color: colors.mediumGray, textAlign: 'center' },
  cardLabel: { fontSize: 14, fontWeight: '800', color: colors.mediumGray, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.softGray,
  },
  infoLabel: { fontSize: 13, color: colors.mediumGray, flexShrink: 0, marginRight: 8 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack, textAlign: 'right', flex: 1 },
  infoValueBold: { fontWeight: '800', color: colors.primaryGreen },
  reminderBox: { backgroundColor: colors.freshMint, borderRadius: 16, padding: 14 },
  reminderText: { fontSize: 13, color: colors.primaryGreen, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10 },
  navBtn: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: colors.primaryGreen,
  },
  navBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryGreen },
  ordersBtn: {
    flex: 1, backgroundColor: colors.primaryGreen, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ordersBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
