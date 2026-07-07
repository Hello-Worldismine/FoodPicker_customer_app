import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react-native';
import { colors } from '../theme';

const TERMS_DATA = [
  {
    id: 'service', title: '서비스 이용약관', required: true, updatedAt: '2026.06.01',
    content: `< 회원가입 시 이용약관 >

제1조 (목적)
본 약관은 의무기록발급대행 대표 김동식(이하 "사업자")이 운영하는 'Food Picker(푸드피커)' 모바일 애플리케이션(이하 "푸드피커")에서 제공하는 폐기 임박 식품 중개 및 관련 제반 서비스(이하 "서비스")를 이용함에 있어 "사업자"와 "이용자", "판매 점포(또는 판매자)"의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
① 푸드피커: 사업자가 식품 폐기 감소 및 자원 순환을 목적으로 유통기한 또는 소비기한이 임박한 식품을 판매하는 판매자(이하 "점포")와 구매하고자 하는 회원(이하 "이용자") 간의 거래를 중개하는 디지털 플랫폼을 말합니다.

② 회원: 푸드피커에 개인정보를 제공하여 회원 등록을 한 자로서, 푸드피커의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.

제3조 (서비스의 내용 및 특수성)
① 푸드피커는 다음과 같은 업무를 수행합니다.
  1. 위치 기반 폐기 임박 식품 정보 제공 및 검색 서비스
  2. 점포와 회원 간의 식품 주문 및 결제 중개 서비스

제4조 (이용요금 및 결제)
① 회원은 푸드피커 내에서 제공하는 전자결제 수단(신용카드, 간편결제 등)을 통해 상품 대금을 결제할 수 있습니다.

제5조 (취소, 환불 및 수령 의무)
① 본 서비스의 상품은 당일 폐기 또는 즉시 소비를 전제로 하는 '시간 임박 상품'이므로, 점포의 상품 준비가 시작되거나 수령 지정 시간이 경과한 후에는 회원의 단순 변심에 의한 주문 취소 및 환불이 제한될 수 있습니다.

부칙
제1조 (시행일) 본 약관은 2026년 06월 01일부터 시행합니다.`,
  },
  {
    id: 'privacy', title: '개인정보 처리방침', required: true, updatedAt: '2026.06.01',
    content: `< 개인정보처리방침 >

의무기록발급대행 김동식 대표가 운영하는 'Food Picker(푸드피커)'(이하 "푸드피커")는 이용자 및 판매점포의 개인정보를 소중히 다루며, 개인정보보호법 등 관련 법령을 준수하고 있습니다.

제1조 (개인정보의 수집·이용 목적 및 항목)
[필수 정보]
• 수집·이용 목적: 회원 가입 및 식별, 본인 확인, 주문·결제 처리
• 수집 항목: 성명, 연락처(휴대폰 번호), 이메일 주소, 로그인 ID, 비밀번호
• 보유 및 이용기간: 회원 탈퇴 시까지 또는 법정 의무 보유 기간까지

[위치 정보]
• 수집·이용 목적: 내 주변 폐기 임박 식품 점포 검색, 거리 계산 및 지도 표시
• 수집 항목: 이용자의 실시간 GPS 위치 데이터

제2조 (개인정보의 제3자 제공)
① 푸드피커는 회원이 주문한 폐기 임박 식품의 정확한 확인 및 원활한 수령을 위해, 회원의 동의를 얻어 필요한 최소한의 정보를 판매자(점포)에게 제공합니다.

부칙
제1조 (시행일) 본 약관은 2026년 06월 01일부터 시행합니다.`,
  },
  {
    id: 'location', title: '위치기반 서비스 이용약관', required: true, updatedAt: '2026.06.01',
    content: `< 위치기반서비스 이용약관 >

제1조 (목적)
본 약관은 의무기록발급대행 대표 김동식(이하 "사업자")이 제공하는 'Food Picker(푸드피커)' 모바일 애플리케이션에서 위치기반서비스를 이용함에 있어, "사업자"와 이용자의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제3조 (서비스의 내용 및 요금)
• 내 주변 점포 검색 및 정렬: 이용자의 현재 위치를 기반으로 일정 반경 내에 있는 점포의 위치, 상품 정보, 거리 정보를 제공합니다.
• 지도 표시 서비스: 이용자의 현재 위치와 점포의 위치를 지도 상에 표시합니다.

위치정보관리책임자: 김동식
연락처(고객센터): 1800-8018
이메일: mrpass88@naver.com
사업장 소재지: 서울시 동대문구 천호대로 3, 904호

부칙
제1조 (시행일) 본 약관은 2026년 06월 01일부터 시행합니다.`,
  },
  {
    id: 'marketing', title: '마케팅 목적 광고성 정보 수신동의', required: false, updatedAt: '2026.06.01',
    content: `< 마케팅 목적 광고성 정보 수신동의 (선택) >

1. 수집 및 이용 목적
• 마감 할인 및 타임 세일 정보 안내
• 이벤트 및 혜택 제공: 쿠폰 발급, 프로모션, 신규 입점 점포 안내

2. 수집하는 개인정보 항목
• 성명, 연락처, 앱 푸시 토큰, 선호 식품 카테고리

3. 개인정보의 보유 및 이용 기간
• 회원 탈퇴 시 또는 마케팅 수신동의 철회 시까지

4. 동의 거부 권리 안내
• 본 동의는 '선택 사항'으로 거부하더라도 핵심 서비스는 이용하실 수 있습니다.

부칙
제1조 (시행일) 본 약관은 2026년 06월 01일부터 시행합니다.`,
  },
];

function TermsDetail({ term, onBack }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{term.title}</Text>
          <Text style={styles.headerSub}>시행일: {term.updatedAt}</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.termsContent}>
        <Text style={styles.termsText}>{term.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function TermsScreen({ navigation }) {
  const [selectedTerm, setSelectedTerm] = useState(null);

  if (selectedTerm) {
    return <TermsDetail term={selectedTerm} onBack={() => setSelectedTerm(null)} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>약관 및 법적고지</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            푸드피커 서비스 이용과 관련된 약관을 확인하실 수 있습니다. 각 항목을 눌러 전문을 확인하세요.
          </Text>
        </View>

        <View style={styles.termsList}>
          {TERMS_DATA.map((term, idx) => (
            <TouchableOpacity key={term.id} onPress={() => setSelectedTerm(term)}
              style={[styles.termItem, idx < TERMS_DATA.length - 1 && styles.termItemBorder]}>
              <View style={[styles.termIcon, { backgroundColor: term.required ? colors.freshMint : '#FFF4ED' }]}>
                <FileText size={18} color={term.required ? colors.primaryGreen : colors.warmOrange} />
              </View>
              <View style={styles.termInfo}>
                <View style={styles.termTitleRow}>
                  <Text style={styles.termTitle}>{term.title}</Text>
                  <View style={[styles.termBadge, { backgroundColor: term.required ? colors.freshMint : '#FFF4ED' }]}>
                    <Text style={[styles.termBadgeText, { color: term.required ? colors.primaryGreen : colors.warmOrange }]}>
                      {term.required ? '필수' : '선택'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.termDate}>시행일 {term.updatedAt}</Text>
              </View>
              <ChevronRight size={16} color={colors.mediumGray} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>문의</Text>
          <Text style={styles.contactInfo}>고객센터: 1800-8018</Text>
          <Text style={styles.contactInfo}>이메일: mrpass88@naver.com</Text>
          <Text style={styles.contactInfo}>소재지: 서울시 동대문구 천호대로 3, 904호</Text>
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
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  headerSub: { fontSize: 12, color: colors.mediumGray, marginTop: 2 },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  infoBox: { backgroundColor: colors.freshMint, borderRadius: 14, padding: 14 },
  infoText: { fontSize: 13, color: colors.primaryGreen, lineHeight: 21 },
  termsList: { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden' },
  termItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
  },
  termItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.softGray },
  termIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  termInfo: { flex: 1 },
  termTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  termTitle: { fontSize: 15, fontWeight: '600', color: colors.charcoalBlack },
  termBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  termBadgeText: { fontSize: 10, fontWeight: '700' },
  termDate: { fontSize: 12, color: colors.mediumGray },
  contactCard: { backgroundColor: colors.white, borderRadius: 14, padding: 16 },
  contactTitle: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 8 },
  contactInfo: { fontSize: 12, color: colors.mediumGray, marginBottom: 4 },
  termsContent: { padding: 20, paddingBottom: 60 },
  termsText: { fontSize: 13.5, lineHeight: 26, color: colors.charcoalBlack },
});
