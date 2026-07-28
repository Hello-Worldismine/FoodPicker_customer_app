import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Smartphone, ShieldCheck, Check, Trash2 } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import {
  fetchMyPaymentPref, upsertMyPaymentPref,
  fetchMyPaymentMethods, setDefaultPaymentMethod, deleteMyPaymentMethod,
} from '../lib/api';
import { paymentMethodLabel, EASY_PAY_LABEL, formatDate } from '../lib/format';

// 결제수단 관리 — 카드번호/유효기간/CVC 는 입력받지 않는다(PCI 범위 밖, DB 에도 컬럼 없음).
// 이 화면이 다루는 것은 ① 기본 결제수단 선택값(user_payment_prefs)
// ② 최근 사용 이력(orders.payment_method) ③ 토스 빌링키로 등록된 카드의 표시 정보뿐이다.
const METHOD_OPTIONS = [
  { key: 'CARD',     label: '신용/체크카드', Icon: CreditCard, desc: '카드·간편결제 통합 결제창이 열려요' },
  { key: 'EASY_PAY', label: '간편결제',      Icon: Smartphone, desc: '지정한 간편결제 앱 창이 바로 열려요' },
];

// 토스 '간편결제사 코드' 중 국내 주요 4곳만 노출. null = 통합 결제창에서 직접 선택.
// 실제로 열리는지는 토스페이먼츠 상점 계약(간편결제사 사용 신청)에 달려 있다.
const EASY_PAY_CHOICES = [null, 'TOSSPAY', 'KAKAOPAY', 'NAVERPAY', 'PAYCO'];

export default function PaymentMethodScreen({ navigation }) {
  const { orders } = useApp();
  const [pref, setPref] = useState({ defaultMethod: 'CARD', easyPayProvider: null });
  const [prefLoading, setPrefLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState(null);

  React.useEffect(() => {
    let alive = true;
    fetchMyPaymentPref()
      .then(p => { if (alive) setPref(p); })
      .catch(() => {}) // 미설정/조회 실패는 앱 기본값(카드) 유지
      .finally(() => { if (alive) setPrefLoading(false); });
    loadCards(() => alive);
    return () => { alive = false; };
  }, []);

  function loadCards(isAlive = () => true) {
    setCardsLoading(true);
    fetchMyPaymentMethods()
      .then(list => { if (isAlive()) { setCards(list); setCardsError(null); } })
      .catch(e => { if (isAlive()) setCardsError(e.message); })
      .finally(() => { if (isAlive()) setCardsLoading(false); });
  }

  // 기본 결제수단 저장 — 낙관적 반영 후 실패하면 되돌린다.
  async function savePref(next) {
    const prev = pref;
    setPref(next);
    setSaving(true);
    try {
      const saved = await upsertMyPaymentPref(next);
      setPref(saved);
    } catch (e) {
      setPref(prev);
      Alert.alert('저장 실패', e.message || '기본 결제수단을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function selectMethod(key) {
    if (saving || key === pref.defaultMethod) return;
    savePref({ defaultMethod: key, easyPayProvider: key === 'EASY_PAY' ? pref.easyPayProvider : null });
  }
  function selectProvider(code) {
    if (saving || code === pref.easyPayProvider) return;
    savePref({ defaultMethod: 'EASY_PAY', easyPayProvider: code });
  }

  async function handleSetDefaultCard(id) {
    try {
      await setDefaultPaymentMethod(id);
      setCards(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));
    } catch (e) {
      Alert.alert('변경 실패', e.message);
      loadCards();
    }
  }
  function handleDeleteCard(card) {
    Alert.alert('카드 삭제', `${card.cardCompany || '카드'} ${card.cardNumberMasked || ''}를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyPaymentMethod(card.id);
            setCards(prev => prev.filter(c => c.id !== card.id));
          } catch (e) {
            Alert.alert('삭제 실패', e.message);
            loadCards();
          }
        },
      },
    ]);
  }

  // 최근 사용한 결제수단 — orders(ordered_at desc)의 payment_method 를 순서 유지로 집계.
  const recentMethods = React.useMemo(() => {
    const acc = new Map();
    (orders || []).forEach(o => {
      if (!o.paymentMethod) return; // 전액 쿠폰(무결제) 주문
      const hit = acc.get(o.paymentMethod);
      if (hit) hit.count += 1;
      else acc.set(o.paymentMethod, { method: o.paymentMethod, count: 1, lastAt: o.orderedAt });
    });
    return Array.from(acc.values());
  }, [orders]);

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

        {/* 기본 결제수단 — 주문/결제 화면의 초기 선택값 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>기본 결제수단</Text>
          <Text style={styles.sectionDesc}>주문할 때 이 결제수단이 먼저 선택돼요.</Text>
          {prefLoading ? (
            <ActivityIndicator color={colors.primaryGreen} style={{ marginVertical: 16 }} />
          ) : (
            <>
              {METHOD_OPTIONS.map(opt => {
                const on = pref.defaultMethod === opt.key;
                return (
                  <TouchableOpacity key={opt.key} onPress={() => selectMethod(opt.key)}
                    style={[styles.option, on && styles.optionOn]}>
                    <View style={styles.optionIcon}>
                      <opt.Icon size={18} color={on ? colors.primaryGreen : colors.mediumGray} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionName}>{opt.label}</Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]}>
                      {on && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* 간편결제사 지정 — null 이면 통합 결제창에서 직접 고른다 */}
              {pref.defaultMethod === 'EASY_PAY' && (
                <View style={styles.providerBox}>
                  <Text style={styles.providerLabel}>간편결제사</Text>
                  <View style={styles.chipRow}>
                    {EASY_PAY_CHOICES.map(code => {
                      const on = pref.easyPayProvider === code;
                      return (
                        <TouchableOpacity key={code || 'NONE'} onPress={() => selectProvider(code)}
                          style={[styles.chip, on && styles.chipOn]}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>
                            {code ? (EASY_PAY_LABEL[code] || code) : '결제창에서 선택'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.providerHint}>
                    지정한 간편결제사는 매장(가맹점)이 토스페이먼츠에 사용 신청한 경우에만 열립니다.
                    열리지 않으면 '결제창에서 선택'으로 두세요.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* 최근 사용한 결제수단 — orders.payment_method 집계 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>최근 사용한 결제수단</Text>
          {recentMethods.length === 0 ? (
            <Text style={styles.emptyText}>아직 결제한 내역이 없어요.</Text>
          ) : (
            recentMethods.map((m, idx) => (
              <View key={m.method} style={[styles.recentRow, idx > 0 && styles.recentRowBorder]}>
                <View style={styles.optionIcon}>
                  <CreditCard size={18} color={colors.primaryGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{paymentMethodLabel(m.method)}</Text>
                  <Text style={styles.optionDesc}>
                    최근 사용 {formatDate(m.lastAt)} · 총 {m.count}회
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 등록된 카드 — 토스 빌링키(자동결제) 기반. 승인 전에는 항상 비어 있다. */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>등록된 카드</Text>
          {cardsLoading ? (
            <ActivityIndicator color={colors.primaryGreen} style={{ marginVertical: 16 }} />
          ) : cardsError ? (
            <Text style={styles.emptyText}>카드 목록을 불러오지 못했습니다. ({cardsError})</Text>
          ) : cards.length === 0 ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>등록된 카드가 없습니다</Text>
              <Text style={styles.noticeText}>
                토스페이먼츠 자동결제(빌링) 사용 승인 후 카드를 등록할 수 있습니다.{'\n'}
                현재는 주문할 때마다 결제창에서 결제하는 방식만 지원합니다.
              </Text>
            </View>
          ) : (
            cards.map(c => (
              <View key={c.id} style={styles.cardRow}>
                <View style={styles.optionIcon}>
                  <CreditCard size={18} color={colors.primaryGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>
                    {c.cardCompany || '카드'}{c.cardType ? ` (${c.cardType})` : ''}
                  </Text>
                  <Text style={styles.optionDesc}>{c.cardNumberMasked || ''}</Text>
                </View>
                {c.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Check size={12} color={colors.white} strokeWidth={3} />
                    <Text style={styles.defaultBadgeText}>기본</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => handleSetDefaultCard(c.id)}>
                    <Text style={styles.setDefaultBtn}>기본 지정</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDeleteCard(c)} style={styles.deleteBtn}>
                  <Trash2 size={18} color={colors.alertRed} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoTitleRow}>
            <ShieldCheck size={16} color={colors.primaryGreen} />
            <Text style={styles.infoTitle}>안전한 결제 정보 보호</Text>
          </View>
          <Text style={styles.infoText}>
            결제는 토스페이먼츠 결제창에서 처리됩니다.{'\n'}
            카드번호·유효기간·CVC 는 앱과 서버에 저장되지 않습니다.
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

  content: { padding: 16, paddingBottom: 60, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.charcoalBlack },
  sectionDesc: { fontSize: 12, color: colors.mediumGray, marginTop: 4, marginBottom: 12 },
  emptyText: { fontSize: 13, color: colors.mediumGray, marginTop: 10 },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.softGray, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  optionOn: { backgroundColor: colors.freshMint, borderColor: colors.primaryGreen },
  optionIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionName: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack },
  optionDesc: { fontSize: 12, color: colors.mediumGray, marginTop: 2 },
  radio: {
    width: 20, height: 20, borderRadius: 10, flexShrink: 0,
    borderWidth: 2, borderColor: '#D0D3D7', backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primaryGreen },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primaryGreen },

  providerBox: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.softGray },
  providerLabel: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.softGray, borderWidth: 1.5, borderColor: 'transparent',
  },
  chipOn: { backgroundColor: colors.freshMint, borderColor: colors.primaryGreen },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.mediumGray },
  chipTextOn: { color: colors.primaryGreen, fontWeight: '800' },
  providerHint: { fontSize: 11, color: colors.mediumGray, lineHeight: 17, marginTop: 10 },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  recentRowBorder: { borderTopWidth: 1, borderTopColor: colors.softGray },

  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.softGray, borderRadius: 12, padding: 12, marginTop: 8,
  },
  defaultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primaryGreen, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '800', color: colors.white },
  setDefaultBtn: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },
  deleteBtn: { padding: 4 },

  noticeBox: { backgroundColor: colors.softGray, borderRadius: 12, padding: 14, marginTop: 10 },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 6 },
  noticeText: { fontSize: 12, color: colors.mediumGray, lineHeight: 19 },

  infoBox: { backgroundColor: colors.freshMint, borderRadius: 12, padding: 14 },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  infoText: { fontSize: 12, color: '#15803D', lineHeight: 19 },
});
