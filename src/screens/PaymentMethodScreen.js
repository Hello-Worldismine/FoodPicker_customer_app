import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Smartphone, ShieldCheck } from 'lucide-react-native';
import { colors } from '../theme';

// 결제수단은 앱에 등록하지 않는다 — 주문 시 토스페이먼츠 결제창에서 선택/결제한다.
export default function PaymentMethodScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>결제수단 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ShieldCheck size={28} color={colors.primaryGreen} />
          </View>
          <Text style={styles.heroTitle}>토스페이먼츠 안전결제</Text>
          <Text style={styles.heroDesc}>
            결제는 주문 시 토스페이먼츠 결제창에서 진행됩니다.{'\n'}
            별도의 결제수단 등록 없이 결제창에서{'\n'}
            카드/간편결제를 선택할 수 있어요.
          </Text>
        </View>

        <View style={styles.methodList}>
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}>
              <CreditCard size={18} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>신용/체크카드</Text>
              <Text style={styles.methodDesc}>국내 주요 카드사 결제 지원</Text>
            </View>
          </View>
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}>
              <Smartphone size={18} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>간편결제</Text>
              <Text style={styles.methodDesc}>결제창에서 지원하는 간편결제 선택 가능</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>안전한 결제 정보 보호</Text>
          <Text style={styles.infoText}>
            결제 정보는 토스페이먼츠에서 암호화되어 처리됩니다.{'\n'}
            카드번호는 앱에 저장되지 않습니다.
          </Text>
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

  heroCard: {
    backgroundColor: colors.white, borderRadius: 16,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
    marginBottom: 16,
  },
  heroIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 8 },
  heroDesc: { fontSize: 13, color: colors.mediumGray, textAlign: 'center', lineHeight: 20 },

  methodList: { marginBottom: 16 },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  methodIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  methodName: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 3 },
  methodDesc: { fontSize: 12, color: colors.mediumGray },

  infoBox: {
    backgroundColor: colors.freshMint, borderRadius: 12, padding: 14,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen, marginBottom: 6 },
  infoText: { fontSize: 12, color: '#15803D', lineHeight: 19 },
});
