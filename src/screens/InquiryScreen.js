import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { createInquiry } from '../lib/api';

// 문의 유형 — 관리자 웹 신고/문의관리(ReportManagement)의 USER_REPORT_TYPES 필터와
// 문자열이 정확히 일치해야 필터링이 동작한다. 임의 수정 금지.
const INQUIRY_TYPES = [
  '상품 상태가 설명과 달라요',
  '소비기한이 지났어요',
  '매장이 픽업을 거부했어요',
  '상품을 받지 못했어요',
  '알레르기/성분 정보가 부족해요',
  '결제/환불 문제가 있어요',
  '기타',
];

const MAX_TITLE = 60;
const MAX_CONTENT = 1000;

export default function InquiryScreen({ navigation }) {
  const { user } = useAuth();
  const [type, setType] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!type && title.trim().length > 0 && content.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    // 세션 만료 등 비로그인 상태 방어(정상 흐름에선 로그인 게이트 뒤라 도달하지 않음)
    if (!user) {
      Alert.alert('로그인 필요', '1:1 문의는 로그인 후 이용할 수 있어요.');
      return;
    }
    setSubmitting(true);
    try {
      // 서버 RPC(create_report): 접수번호 발번·주문 소유 검증을 서버에서 처리.
      const { receiptCode } = await createInquiry(
        // 주문번호는 대문자 정규화(서버 order_code 정확 일치 조회 — 'fp-1234' 입력 방어)
        type, title.trim(), content.trim(), orderCode.trim().toUpperCase() || null,
      );
      Alert.alert(
        '문의가 접수되었어요',
        `접수번호: ${receiptCode}\n답변까지 1~2일 정도 소요됩니다.`,
        [{ text: '확인', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      setSubmitting(false);
      const msg = e.message === 'order not found' ? '주문번호를 확인해주세요. 내 주문에서 찾을 수 없습니다.'
        : e.message === 'not authenticated' ? '로그인 후 이용할 수 있어요.'
        : (e.message || '문의 접수 중 오류가 발생했습니다.');
      Alert.alert('문의 접수 실패', msg);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>1:1 문의</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 문의 유형 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>문의 유형</Text>
          <View style={styles.typeList}>
            {INQUIRY_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[styles.typeChip, type === t && styles.typeChipOn]}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeChipText, type === t && styles.typeChipTextOn]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 제목 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>제목</Text>
          <TextInput
            value={title}
            onChangeText={v => setTitle(v.slice(0, MAX_TITLE))}
            placeholder="문의 제목을 입력해주세요"
            placeholderTextColor={colors.mediumGray}
            style={styles.input}
          />
        </View>

        {/* 내용 */}
        <View style={styles.card}>
          <View style={styles.textHeader}>
            <Text style={styles.cardTitle2}>내용</Text>
            <Text style={styles.textCount}>{content.length}/{MAX_CONTENT}</Text>
          </View>
          <TextInput
            value={content}
            onChangeText={v => setContent(v.slice(0, MAX_CONTENT))}
            placeholder={'문의 내용을 자세히 적어주시면\n더 빠르고 정확한 답변이 가능해요.'}
            placeholderTextColor={colors.mediumGray}
            multiline
            numberOfLines={6}
            style={styles.textarea}
            textAlignVertical="top"
          />
        </View>

        {/* 주문번호(선택) — 입력 시 서버가 본인 주문인지 검증 후 매장/상품 정보를 함께 접수 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>주문번호 (선택)</Text>
          <TextInput
            value={orderCode}
            onChangeText={setOrderCode}
            placeholder="예: FP-1234"
            placeholderTextColor={colors.mediumGray}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
          />
          <Text style={styles.inputGuide}>주문 관련 문의라면 주문내역의 주문번호를 함께 남겨주세요</Text>
        </View>

        {/* 제출 → 서버 RPC create_report (관리자 웹 신고/문의관리로 접수) */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnOff]}
        >
          <Text style={styles.submitBtnText}>{submitting ? '접수 중…' : '문의 접수하기'}</Text>
        </TouchableOpacity>
        <Text style={styles.submitGuide}>접수된 문의는 고객센터 운영 시간 내에 순차적으로 답변드려요</Text>
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

  content: { padding: 16, paddingBottom: 60, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 12 },
  cardTitle2: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack },

  typeList: { gap: 8 },
  typeChip: {
    borderWidth: 1.5, borderColor: colors.softGray, backgroundColor: colors.softGray,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  typeChipOn: { borderColor: colors.primaryGreen, backgroundColor: colors.freshMint },
  typeChipText: { fontSize: 14, color: colors.charcoalBlack },
  typeChipTextOn: { color: colors.primaryGreen, fontWeight: '700' },

  input: {
    backgroundColor: colors.softGray, borderWidth: 1.5, borderColor: colors.softGray,
    borderRadius: 10, padding: 12, fontSize: 14, color: colors.charcoalBlack,
  },
  inputGuide: { fontSize: 11, color: colors.mediumGray, marginTop: 8 },

  textHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  textCount: { fontSize: 12, color: colors.mediumGray },
  textarea: {
    backgroundColor: colors.softGray, borderWidth: 1.5, borderColor: colors.softGray,
    borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 22, color: colors.charcoalBlack,
    minHeight: 140,
  },

  submitBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 4,
  },
  submitBtnOff: { backgroundColor: '#C8CDD3' },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  submitGuide: { fontSize: 12, color: colors.mediumGray, textAlign: 'center', marginTop: 4 },
});
