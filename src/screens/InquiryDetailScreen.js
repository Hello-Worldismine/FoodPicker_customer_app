import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';
import { colors } from '../theme';
import { fetchMyInquiries, fetchInquiryReplies } from '../lib/api';

const STATUS_LABEL = {
  received: '접수', checking: '확인중', awaiting_seller: '판매자 답변 대기',
  awaiting_buyer: '구매자 답변 대기', refunded: '환불 처리', closed: '종결',
};

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// route.params: { inquiry } (목록에서 이동) 또는 { reportId } (알림 탭 딥링크 — 목록을 다시 조회해 찾는다)
export default function InquiryDetailScreen({ route, navigation }) {
  const { inquiry: passedInquiry, reportId } = route.params || {};
  const [inquiry, setInquiry] = useState(passedInquiry || null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(!passedInquiry);

  const load = useCallback(async () => {
    try {
      const id = passedInquiry?.id || reportId;
      if (!passedInquiry) {
        const list = await fetchMyInquiries();
        setInquiry(list.find(i => i.id === reportId) || null);
      }
      if (id) setReplies(await fetchInquiryReplies(id));
    } catch (e) {
      // 답변 로드 실패해도 문의 원문은 그대로 보여준다
    } finally {
      setLoading(false);
    }
  }, [passedInquiry, reportId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingBox}><ActivityIndicator color={colors.primaryGreen} /></View>
      </SafeAreaView>
    );
  }

  if (!inquiry) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.charcoalBlack} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>문의 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}><Text style={styles.emptyText}>문의를 찾을 수 없어요</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문의 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, inquiry.status === 'closed' ? styles.badgeDone : styles.badgeOpen]}>
              <Text style={[styles.statusBadgeText, inquiry.status === 'closed' ? styles.textDone : styles.textOpen]}>
                {STATUS_LABEL[inquiry.status] || inquiry.status}
              </Text>
            </View>
            <Text style={styles.receiptCode}>{inquiry.receiptCode}</Text>
          </View>
          <Text style={styles.title}>{inquiry.title}</Text>
          <Text style={styles.meta}>{inquiry.type}{inquiry.storeName ? ` · ${inquiry.storeName}` : ''}{inquiry.orderCode ? ` · ${inquiry.orderCode}` : ''}</Text>
          <Text style={styles.contentText}>{inquiry.content}</Text>
          <Text style={styles.date}>{formatDateTime(inquiry.receivedAt)} 접수</Text>
        </View>

        <Text style={styles.sectionLabel}>답변 {replies.length > 0 ? `(${replies.length})` : ''}</Text>
        {replies.length === 0 ? (
          <View style={styles.waitingBox}>
            <MessageSquare size={28} color={colors.mediumGray} />
            <Text style={styles.waitingText}>아직 답변 등록 전이에요{'\n'}조금만 기다려주세요</Text>
          </View>
        ) : (
          replies.map(r => (
            <View key={r.id} style={styles.replyCard}>
              <Text style={styles.replyLabel}>푸드피커 고객센터</Text>
              <Text style={styles.replyText}>{r.message}</Text>
              <Text style={styles.replyDate}>{formatDateTime(r.createdAt)}</Text>
            </View>
          ))
        )}
      </ScrollView>
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
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.mediumGray },

  content: { padding: 16, paddingBottom: 60, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeOpen: { backgroundColor: colors.freshMint },
  badgeDone: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  textOpen: { color: colors.primaryGreen },
  textDone: { color: '#6B7280' },
  receiptCode: { fontSize: 12, color: colors.mediumGray },
  title: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 6 },
  meta: { fontSize: 12, color: colors.mediumGray, marginBottom: 12 },
  contentText: { fontSize: 14, color: colors.charcoalBlack, lineHeight: 22, marginBottom: 12 },
  date: { fontSize: 11, color: colors.mediumGray },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.mediumGray, marginTop: 4 },
  waitingBox: {
    backgroundColor: colors.white, borderRadius: 14, padding: 24,
    alignItems: 'center', gap: 10,
  },
  waitingText: { fontSize: 13, color: colors.mediumGray, textAlign: 'center', lineHeight: 20 },
  replyCard: { backgroundColor: colors.freshMint, borderRadius: 14, padding: 16 },
  replyLabel: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen, marginBottom: 6 },
  replyText: { fontSize: 14, color: colors.charcoalBlack, lineHeight: 22, marginBottom: 8 },
  replyDate: { fontSize: 11, color: colors.mediumGray },
});
