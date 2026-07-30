import React, { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

const STATUS_INFO = {
  pickupReady: { label: '픽업 대기', color: colors.primaryGreen, bg: colors.freshMint, Icon: Clock },
  pending:     { label: '픽업 대기', color: colors.primaryGreen, bg: colors.freshMint, Icon: Clock },
  completed:   { label: '픽업 완료', color: '#6B7280',           bg: '#F3F4F6',        Icon: CheckCircle },
  cancelling:  { label: '취소 요청', color: '#B45309',           bg: '#FEF3C7',        Icon: AlertCircle },
  cancelled:   { label: '취소됨',   color: colors.alertRed,     bg: '#FFF0F0',        Icon: XCircle },
};

const PAGE_SIZE = 10;

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)   return '방금 전';
  if (diffMin < 60)  return `${diffMin}분 전`;
  if (diffMin < 1440) return `${Math.floor(diffMin/60)}시간 전`;
  const diffDay = Math.floor(diffMs / (1000*60*60*24));
  if (diffDay < 7)   return `${diffDay}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function OrderCard({ order }) {
  const st = STATUS_INFO[order.status] || STATUS_INFO.pending;
  const Icon = st.Icon;
  return (
    <View style={styles.card}>
      <View style={[styles.statusIcon, { backgroundColor: st.bg }]}>
        <Icon size={20} color={st.color} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardMeta}>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(order.orderedAt)}</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>{order.productName}</Text>
        <Text style={styles.cardStore} numberOfLines={1}>{order.store}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardPrice}>{order.totalPrice.toLocaleString()}원</Text>
        <Text style={styles.cardId}>{order.id}</Text>
      </View>
    </View>
  );
}

export default function MyOrderListScreen({ navigation }) {
  const { orders, reloadOrders } = useApp();
  const sorted = [...orders].sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  // Realtime(AppContext) 이 끊긴 경우를 위한 폴백 — 화면 진입 시 주문을 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      if (reloadOrders) reloadOrders().catch(e => console.warn('[주문내역] 재조회 실패:', e.message));
    }, [reloadOrders]),
  );

  const hasMore = visibleCount < sorted.length;
  const visible = sorted.slice(0, visibleCount);

  function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, sorted.length));
      setLoading(false);
    }, 500);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주문내역</Text>
        <Text style={styles.headerCount}>총 {sorted.length}건</Text>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>아직 주문 내역이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={o => o.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator size="small" color={colors.primaryGreen} style={{ padding: 16 }} />
            ) : !hasMore && sorted.length > 0 ? (
              <Text style={styles.footerText}>모든 주문내역을 불러왔습니다</Text>
            ) : null
          }
        />
      )}
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
  headerCount: { fontSize: 13, color: colors.mediumGray },
  list: { padding: 12, paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statusIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11, color: colors.mediumGray, flexShrink: 0 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
  cardStore: { fontSize: 12, color: colors.mediumGray, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', flexShrink: 0 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack },
  cardId: { fontSize: 11, color: colors.mediumGray, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyText: { fontSize: 15, color: colors.mediumGray },
  footerText: { fontSize: 12, color: colors.mediumGray, textAlign: 'center', padding: 16 },
});
