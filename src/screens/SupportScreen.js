import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Mail, MessageSquare, Clock, ChevronRight, ExternalLink } from 'lucide-react-native';
import { colors } from '../theme';

// 실시간 채팅 상담은 보류(챗 백엔드 미연동) → 노출하지 않음.
const CHANNELS = [
  {
    Icon: MessageSquare,
    label: '1:1 문의',
    desc: '답변까지 1~2일 소요',
    badge: null,
    // 관리자 웹 신고/문의관리(reports)와 연동된 앱 내 문의 작성 화면으로 이동
    screen: 'Inquiry',
  },
  {
    Icon: Mail,
    label: '이메일 문의',
    desc: 'foodpicker77@gmail.com',
    badge: null,
    onPress: () => Linking.openURL('mailto:foodpicker77@gmail.com'),
  },
  {
    Icon: Phone,
    label: '전화 상담',
    desc: '1800-8018',
    badge: null,
    onPress: () => Linking.openURL('tel:18008018'),
  },
];

// 빠른 문의 = FAQ 주제 바로가기
const QUICK_LINKS = ['주문 취소 방법', '픽업 시간 변경 문의', '환불 처리 현황', '앱 오류 신고'];

export default function SupportScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>고객센터</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 운영 시간 */}
        <View style={styles.hoursBox}>
          <Clock size={16} color={colors.primaryGreen} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hoursTitle}>운영 시간</Text>
            <Text style={styles.hoursText}>평일 09:00 ~ 18:00{'\n'}주말·공휴일 휴무</Text>
          </View>
        </View>

        {/* 상담 채널 */}
        <Text style={styles.sectionLabel}>상담 채널</Text>
        <View style={styles.card}>
          {CHANNELS.map((ch, idx) => {
            const Icon = ch.Icon;
            return (
              <TouchableOpacity
                key={ch.label}
                style={[styles.row, idx < CHANNELS.length - 1 && styles.rowBorder]}
                onPress={ch.screen ? () => navigation.navigate(ch.screen) : ch.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <Icon size={18} color={colors.primaryGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{ch.label}</Text>
                  <Text style={styles.rowDesc}>{ch.desc}</Text>
                </View>
                {ch.badge && (
                  <View style={[styles.badge, { backgroundColor: ch.badgeColor }]}>
                    <Text style={styles.badgeText}>{ch.badge}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={colors.mediumGray} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 빠른 문의 */}
        <Text style={styles.sectionLabel}>빠른 문의</Text>
        <View style={styles.card}>
          {QUICK_LINKS.map((label, idx) => (
            <TouchableOpacity
              key={label}
              style={[styles.row, idx < QUICK_LINKS.length - 1 && styles.rowBorder]}
              onPress={() => navigation.navigate('FAQ')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickLabel}>{label}</Text>
              <ExternalLink size={14} color={colors.mediumGray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 앱 정보 */}
        <View style={styles.appInfoBox}>
          <Text style={styles.appInfoText}>푸드피커 v1.0.0</Text>
          <Text style={styles.appInfoSub}>문의 시 버전 정보를 함께 알려주시면 더 빠른 도움이 가능해요</Text>
        </View>
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

  hoursBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.freshMint, borderRadius: 14,
    padding: 16, marginBottom: 24,
  },
  hoursTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen, marginBottom: 4 },
  hoursText: { fontSize: 13, color: '#15803D', lineHeight: 20 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.mediumGray, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2 },
  rowDesc: { fontSize: 12, color: colors.mediumGray },
  badge: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  quickLabel: { flex: 1, fontSize: 14, color: colors.charcoalBlack },

  appInfoBox: { alignItems: 'center', paddingTop: 8, gap: 4 },
  appInfoText: { fontSize: 13, fontWeight: '700', color: colors.mediumGray },
  appInfoSub: { fontSize: 12, color: colors.mediumGray, textAlign: 'center', lineHeight: 18 },
});
