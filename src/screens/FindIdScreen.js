import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { colors } from '../theme';
import * as api from '../lib/api';
import { signInWithProvider, ensureUserName, PROVIDER_LABEL, OAUTH_CANCELLED } from '../lib/oauth';

// 아이디 찾기 — '아이디'는 로그인 이메일이다.
//
// 구성
//   ① 상단: 소셜로 가입한 사람은 '같은 소셜로 다시 로그인'이 정답이다(이메일을 몰라도 들어온다).
//   ② 하단: 이름 + 휴대폰 → find_email_by_buyer RPC → '마스킹된' 이메일.
//
// ★ 전체 이메일은 절대 보여주지 않는다. 이름+번호만으로 타인 계정을 수집할 수 있기 때문이다.
// ★ 실패는 이유를 구분하지 않고 '일치하는 계정이 없습니다' 단일 문구로 통일한다
//   (번호는 맞고 이름만 틀렸다는 식의 힌트가 새면 그 자체가 계정 열거 신호가 된다).
export default function FindIdScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState(null);
  // 조회 결과: null=아직 조회 안 함 / { masked } / { notFound: true }
  const [result, setResult] = useState(null);
  const busy = loading || socialBusy != null;

  const phoneCheck = api.validatePhone(phone);
  const canSubmit = !!name.trim() && phoneCheck.ok;

  async function handleFind() {
    if (busy) return;
    if (!name.trim()) { Alert.alert('입력 확인', '이름을 입력해주세요.'); return; }
    if (!phoneCheck.ok) { Alert.alert('입력 확인', phoneCheck.message); return; }

    setLoading(true);
    setResult(null);
    try {
      const masked = await api.findMyEmail(name, phone);
      setResult(masked ? { masked } : { notFound: true });
    } catch (e) {
      // 레이트리밋 등 서버 예외만 Alert 로 알린다(미일치는 예외가 아니라 null 이다).
      Alert.alert('조회 실패', e.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  // 소셜 가입자용 보조 경로 — 로그인에 성공하면 Gate 가 알아서 앱으로 넘긴다.
  async function handleSocial(provider) {
    if (busy) return;
    setSocialBusy(provider);
    try {
      await signInWithProvider(provider);
      await ensureUserName();
    } catch (e) {
      if (e?.code !== OAUTH_CANCELLED) {
        Alert.alert(`${PROVIDER_LABEL[provider] ?? ''} 로그인 실패`, e?.message ?? '잠시 후 다시 시도해주세요.');
      }
    } finally {
      setSocialBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10, padding: 4 }}>
          <ChevronLeft color={colors.charcoalBlack} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>아이디 찾기</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* ① 소셜 가입자 — 이메일을 몰라도 바로 들어올 수 있는 가장 확실한 경로 */}
          <Text style={styles.sectionTitle}>소셜로 가입하셨나요?</Text>
          <Text style={styles.sectionSub}>가입했던 서비스로 로그인하면 아이디 확인 없이 바로 이용할 수 있어요.</Text>

          <TouchableOpacity style={[styles.socialBtn, busy && styles.socialBtnDisabled]} activeOpacity={0.85}
            disabled={busy} onPress={() => handleSocial('kakao')}>
            <View style={[styles.socialIconWrap, { backgroundColor: '#3C1E1E' }]}>
              <Text style={[styles.socialIconText, { color: '#FEE500' }]}>K</Text>
            </View>
            {socialBusy === 'kakao'
              ? <ActivityIndicator style={{ flex: 1 }} color={colors.charcoalBlack} />
              : <Text style={styles.socialLabel}>카카오로 계속하기</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#03C75A' }, busy && styles.socialBtnDisabled]} activeOpacity={0.85}
            disabled={busy} onPress={() => handleSocial('naver')}>
            <View style={[styles.socialIconWrap, { backgroundColor: '#02A04A' }]}>
              <Text style={[styles.socialIconText, { color: '#fff' }]}>N</Text>
            </View>
            {socialBusy === 'naver'
              ? <ActivityIndicator style={{ flex: 1 }} color="#fff" />
              : <Text style={[styles.socialLabel, { color: '#fff' }]}>네이버로 계속하기</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0' }, busy && styles.socialBtnDisabled]} activeOpacity={0.85}
            disabled={busy} onPress={() => handleSocial('google')}>
            <View style={[styles.socialIconWrap, { backgroundColor: '#F5F5F5' }]}>
              <Text style={[styles.socialIconText, { color: '#4285F4' }]}>G</Text>
            </View>
            {socialBusy === 'google'
              ? <ActivityIndicator style={{ flex: 1 }} color={colors.mediumGray} />
              : <Text style={styles.socialLabel}>Google로 계속하기</Text>}
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>이메일로 가입했어요</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ② 이름 + 휴대폰으로 찾기 */}
          <Text style={styles.sectionTitle}>이름과 휴대폰 번호로 찾기</Text>
          <Text style={styles.sectionSub}>가입 시 입력한 이름과, 마이페이지에 등록한 휴대폰 번호가 모두 일치해야 해요.</Text>

          <Text style={styles.label}>이름</Text>
          <TextInput style={styles.input} placeholder="가입 시 입력한 이름" placeholderTextColor="#C4C9D0"
            value={name} onChangeText={t => { setName(t); setResult(null); }} autoCorrect={false} editable={!busy} />

          <Text style={styles.label}>휴대폰 번호</Text>
          <TextInput style={styles.input} placeholder="010-1234-5678" placeholderTextColor="#C4C9D0"
            keyboardType="number-pad" maxLength={13}
            value={phone} onChangeText={t => { setPhone(api.formatPhone(t)); setResult(null); }}
            editable={!busy} onSubmitEditing={handleFind} />

          <TouchableOpacity activeOpacity={0.85} onPress={handleFind} disabled={busy || !canSubmit}
            style={[styles.primaryBtn, (busy || !canSubmit) && { opacity: 0.6 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>아이디 찾기</Text>}
          </TouchableOpacity>

          {/* 결과 */}
          {result?.masked && (
            <View style={styles.resultBox}>
              <View style={styles.resultRow}>
                <Mail size={16} color={colors.primaryGreen} />
                <Text style={styles.resultEmail}>{result.masked}</Text>
              </View>
              <Text style={styles.resultNote}>보안을 위해 이메일 일부를 가려서 보여드려요.</Text>
              <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85}
                onPress={() => navigation.navigate('FindPassword', { maskedEmail: result.masked })}>
                <Text style={styles.secondaryBtnText}>이 이메일로 비밀번호 재설정</Text>
              </TouchableOpacity>
            </View>
          )}
          {result?.notFound && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                일치하는 계정이 없습니다.{'\n'}
                휴대폰 번호는 마이페이지에서 등록한 경우에만 조회할 수 있어요.
              </Text>
            </View>
          )}

          <Text style={styles.hint}>
            · 아이디(로그인 계정)는 가입하신 이메일 주소입니다.{'\n'}
            · 휴대폰 번호를 등록한 적이 없다면 조회되지 않습니다. 로그인 후 [마이페이지 → 휴대폰 번호]에서 등록할 수 있어요.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.charcoalBlack },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 6 },
  sectionSub: { fontSize: 13, color: colors.mediumGray, marginBottom: 16, lineHeight: 19 },

  label: { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.charcoalBlack, marginBottom: 16,
  },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
    marginBottom: 10, gap: 10,
  },
  socialBtnDisabled: { opacity: 0.6 },
  socialIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  socialIconText: { fontSize: 13, fontWeight: '900' },
  socialLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: colors.mediumGray, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  resultBox: { backgroundColor: colors.freshMint, borderRadius: 14, padding: 16, marginTop: 20 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultEmail: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  resultNote: { fontSize: 12, color: '#1F6B4C', marginTop: 6, lineHeight: 18 },
  secondaryBtn: {
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primaryGreen,
    paddingVertical: 13, alignItems: 'center', marginTop: 14,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },

  emptyBox: { backgroundColor: colors.softGray, borderRadius: 14, padding: 16, marginTop: 20 },
  emptyText: { fontSize: 13, color: colors.charcoalBlack, lineHeight: 20 },

  hint: { fontSize: 12, color: '#6B7280', lineHeight: 19, marginTop: 20 },
});
