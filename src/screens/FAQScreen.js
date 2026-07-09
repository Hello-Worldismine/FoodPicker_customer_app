import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const FAQS = [
  {
    category: '주문 · 결제',
    items: [
      {
        q: '주문 취소는 어떻게 하나요?',
        a: '주문 후 픽업 준비가 시작되기 전까지 주문내역 화면에서 취소할 수 있습니다. 픽업 준비가 시작된 이후에는 고객센터로 문의해 주세요.',
      },
      {
        q: '결제 수단은 어떤 것을 지원하나요?',
        a: '신용카드, 체크카드, 카카오페이, 네이버페이를 지원합니다. 결제수단 관리에서 카드를 등록하면 빠르게 결제할 수 있어요.',
      },
      {
        q: '영수증 발급이 가능한가요?',
        a: '주문내역 화면에서 해당 주문을 선택한 후 영수증 발급 버튼을 눌러주세요. 현금영수증은 고객센터를 통해 요청하실 수 있습니다.',
      },
    ],
  },
  {
    category: '픽업',
    items: [
      {
        q: '픽업 시간을 변경할 수 있나요?',
        a: '픽업 시간은 매장에서 설정한 시간 내에서만 가능하며, 임의로 변경은 어렵습니다. 불가피한 상황이라면 고객센터로 문의해 주세요.',
      },
      {
        q: '픽업을 못 했어요. 환불이 되나요?',
        a: '픽업 시간 내에 방문하지 못한 경우 환불이 제한될 수 있습니다. 불가피한 상황이라면 픽업 시간 만료 전에 고객센터로 문의해 주세요.',
      },
      {
        q: '픽업 장소가 어디인가요?',
        a: '상품 상세 페이지 및 주문 확인 화면에서 픽업 장소를 확인할 수 있습니다. 지도 탭에서도 가게 위치를 확인할 수 있어요.',
      },
    ],
  },
  {
    category: '상품 · 가게',
    items: [
      {
        q: '상품 정보가 실제와 다를 수 있나요?',
        a: '상품 정보는 판매자가 직접 등록합니다. 실제 상품과 다소 차이가 있을 수 있으며, 문제가 발생하면 고객센터로 신고해 주세요.',
      },
      {
        q: '마감 임박 상품은 언제 없어지나요?',
        a: '픽업 마감 시간이 지나거나 재고가 소진되면 자동으로 품절 처리됩니다. 관심 상품은 찜 목록에서 가격 알림을 설정해 보세요.',
      },
    ],
  },
  {
    category: '계정',
    items: [
      {
        q: '회원 탈퇴 후 재가입이 가능한가요?',
        a: '탈퇴 후 30일 이내에는 동일 계정으로 재가입이 제한됩니다. 탈퇴 시 주문내역, 쿠폰, 찜 목록 등 모든 데이터가 삭제됩니다.',
      },
      {
        q: '개인정보는 어떻게 관리되나요?',
        a: '개인정보는 관련 법령에 따라 안전하게 관리됩니다. 자세한 내용은 마이페이지 > 약관 및 개인정보처리방침에서 확인하실 수 있습니다.',
      },
    ],
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  }

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.question} onPress={toggle} activeOpacity={0.7}>
        <Text style={styles.questionMark}>Q</Text>
        <Text style={styles.questionText}>{item.q}</Text>
        {open
          ? <ChevronUp size={16} color={colors.mediumGray} />
          : <ChevronDown size={16} color={colors.mediumGray} />
        }
      </TouchableOpacity>
      {open && (
        <View style={styles.answer}>
          <Text style={styles.answerMark}>A</Text>
          <Text style={styles.answerText}>{item.a}</Text>
        </View>
      )}
    </View>
  );
}

export default function FAQScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>자주 묻는 질문</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {FAQS.map(section => (
          <View key={section.category} style={styles.section}>
            <Text style={styles.categoryLabel}>{section.category}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <View key={idx}>
                  <FAQItem item={item} />
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}
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

  content: { padding: 16, paddingBottom: 60 },

  section: { marginBottom: 20 },
  categoryLabel: {
    fontSize: 13, fontWeight: '700', color: colors.mediumGray,
    marginBottom: 8, paddingLeft: 4,
  },
  card: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },

  faqItem: {},
  question: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  questionMark: {
    fontSize: 14, fontWeight: '900', color: colors.primaryGreen,
    width: 18, flexShrink: 0, marginTop: 1,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.charcoalBlack, lineHeight: 21 },
  answer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.softGray,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  answerMark: {
    fontSize: 14, fontWeight: '900', color: colors.warmOrange,
    width: 18, flexShrink: 0, marginTop: 1,
  },
  answerText: { flex: 1, fontSize: 13, color: colors.charcoalBlack, lineHeight: 21 },
  divider: { height: 1, backgroundColor: '#F4F4F4', marginHorizontal: 16 },
});
