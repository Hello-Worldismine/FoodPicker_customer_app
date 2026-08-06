import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, MessageSquare } from 'lucide-react-native';
import { colors } from '../theme';
import { fetchMyInquiries } from '../lib/api';

// 관리자 웹 ReportStatus 와 동일한 DB 값 매핑(src/pages/ReportManagement.tsx STATUSES 참고).
const STATUS_LABEL = {
  received: '접수',
  checking: '확인중',
  awaiting_seller: '판매자 답변 대기',
  awaiting_buyer: '구매자 답변 대기',
  refunded: '환불 처리',
  closed: '종결',
};

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function InquiryCard({ item, onPress }) {
  const done = item.status === 'closed';
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.statusBadge, done ? styles.statusBadgeDone : styles.statusBadgeOpen]}>
          <Text style={[styles.statusBadgeText, done ? styles.statusTextDone : styles.statusTextOpen]}>
            {STATUS_LABEL[item.status] || item.status}
          </Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(item.receivedAt)}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cardType} numberOfLines={1}>{item.type}{item.storeName ? ` · ${item.storeName}` : ''}</Text>
    </TouchableOpacity>
  );
}

export default function InquiryListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('open'); // open | done
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setInquiries(await fetchMyInquiries());
    } catch (e) {
      // 목록 로드 실패는 조용히 빈 목록으로 — 문의 작성 자체는 계속 가능해야 함
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = inquiries.filter(i => (tab === 'done' ? i.status === 'closed' : i.status !== 'closed'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>1:1 문의 내역</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'open' && styles.tabActive]} onPress={() => setTab('open')}>
          <Text style={[styles.tabText, tab === 'open' && styles.tabTextActive]}>진행중인 문의</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'done' && styles.tabActive]} onPress={() => setTab('done')}>
          <Text style={[styles.tabText, tab === 'done' && styles.tabTextActive]}>완료된 문의</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={colors.primaryGreen} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <InquiryCard item={item} onPress={() => navigation.navigate('InquiryDetail', { inquiry: item })} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MessageSquare size={40} color={colors.mediumGray} />
              <Text style={styles.emptyText}>
                {tab === 'done' ? '완료된 문의가 없어요' : '진행중인 문의가 없어요'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => navigation.navigate('Inquiry')}
        activeOpacity={0.85}
      >
        <Plus size={18} color={colors.white} />
        <Text style={styles.fabText}>새 문의 작성</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },

  tabs: { flexDirection: 'row', backgroundColor: colors.white, paddingHorizontal: 16, gap: 20, borderBottomWidth: 1, borderBottomColor: '#EFEFEF' },
  tab: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primaryGreen },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.mediumGray },
  tabTextActive: { color: colors.primaryGreen },

  content: { padding: 16, paddingBottom: 100, gap: 10, flexGrow: 1 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeOpen: { backgroundColor: colors.freshMint },
  statusBadgeDone: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusTextOpen: { color: colors.primaryGreen },
  statusTextDone: { color: '#6B7280' },
  cardDate: { fontSize: 12, color: colors.mediumGray },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 4 },
  cardType: { fontSize: 12, color: colors.mediumGray },

  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, color: colors.mediumGray },

  fab: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: colors.primaryGreen, borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  fabText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
