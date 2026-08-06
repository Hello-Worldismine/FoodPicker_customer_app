import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  requestPasswordReset, verifyRecoveryOtp, changePassword, hasEmailIdentity,
  endRecoverySession, validateNewPassword, normalizeOtp,
  OTP_LENGTH, PASSWORD_MIN, RESEND_COOLDOWN_SEC,
} from '../lib/auth';

// 비밀번호 찾기 — 6자리 이메일 OTP 방식(딥링크 아님. 이유는 src/lib/auth.js 상단 참조).
//   Step 1: 이메일 입력 → 인증코드 메일 발송
//   Step 2: 인증코드 + 새 비밀번호 → 복구 세션 생성 → 비밀번호 변경 → 로그아웃 → 로그인 화면
//
// ★★ Step 2 의 verifyOtp 가 성공하면 '세션이 생긴다'. AuthContext.recovering 을 세우지 않으면
//    App.js Gate 가 이 화면을 통째로 언마운트해 비밀번호를 바꿀 수 없다.
//    그래서 verifyOtp '전에' setRecovering(true) 를 세우고, 화면을 떠날 때 반드시 되돌린다.
export default function FindPasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { setRecovering } = useAuth();
  // 아이디 찾기에서 넘어온 경우의 안내용(마스킹돼 있어 그대로 입력값으로 쓸 수는 없다).
  const maskedEmail = route?.params?.maskedEmail ?? null;

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // verifyOtp 성공 여부 — 중도 이탈 시 복구 세션을 정리해야 하는지 판단한다.
  const recoveredRef = useRef(false);

  // 재발송 쿨다운(서버도 같은 이메일에 60초 간격 제한을 건다).
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ★ 화면을 벗어나면 반드시 recovering 을 내린다 — 안 내리면 앱이 이 화면에 잠긴다.
  //   복구 세션이 남아 있으면 함께 로그아웃한다(비밀번호를 바꾸지 않고 로그인 상태가 되는 것 방지).
  useEffect(() => () => {
    if (recoveredRef.current) endRecoverySession();
    setRecovering(false);
  }, [setRecovering]);

  async function handleSendCode(isResend) {
    if (loading || cooldown > 0) return;
    if (!email.trim()) { Alert.alert('입력 확인', '이메일을 입력해주세요.'); return; }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setCooldown(RESEND_COOLDOWN_SEC);
      setStep(2);
      // ★ 계정 존재 여부와 무관하게 항상 같은 문구를 보여준다(계정 열거 방지).
      Alert.alert(
        isResend ? '인증코드를 다시 보냈습니다' : '인증코드를 보냈습니다',
        '입력하신 주소로 메일을 보냈습니다.\n메일함(스팸함 포함)에서 6자리 코드를 확인해주세요.',
      );
    } catch (e) {
      Alert.alert('전송 실패', e.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (loading) return;
    if (normalizeOtp(code).length !== OTP_LENGTH) {
      Alert.alert('입력 확인', `인증코드 ${OTP_LENGTH}자리를 입력해주세요.`);
      return;
    }
    const check = validateNewPassword(password, passwordConfirm);
    if (!check.ok) { Alert.alert('입력 확인', check.message); return; }

    setLoading(true);
    try {
      // ★ OTP 는 1회용이다. 이미 검증에 성공했다면 다시 부르면 안 된다.
      //   '코드 검증 성공 → 비밀번호 변경 실패'(이전과 같은 비밀번호 / 콘솔의 최소 길이 정책 /
      //   유출 비밀번호 차단)는 흔한 경로인데, 재시도 때 verifyOtp 를 다시 태우면
      //   이미 소비된 코드라 '인증코드가 만료되었거나 올바르지 않습니다' 로 막힌다.
      //   사용자는 비밀번호만 다시 입력하면 되는 상황인데 코드부터 다시 받아야 하고,
      //   문구도 실제 원인과 무관해 원인 파악이 불가능해진다.
      if (!recoveredRef.current) {
        // ★ 세션이 생기기 '전에' 게이트를 잠근다. 순서를 바꾸면 화면이 사라진다.
        setRecovering(true);
        await verifyRecoveryOtp(email, code);
        recoveredRef.current = true;

        // 소셜 전용 계정(비밀번호 없음) 안내 — 복구 세션이 있어야 identity 를 읽을 수 있다.
        // ⚠️ 요청 단계에서 미리 판별하면 계정 열거 오라클이 되므로 여기서만 확인한다.
        const emailIdentity = await hasEmailIdentity();
        if (!emailIdentity) {
          Alert.alert(
            '안내',
            '지금까지 카카오/구글로 로그인해오셨어요.\n비밀번호를 만들면 이메일로도 로그인할 수 있습니다.',
          );
        }
      }

      await changePassword(password);
      recoveredRef.current = false; // 아래에서 직접 로그아웃하므로 cleanup 중복 실행 방지

      // 보안상 재설정 후에는 로그인 상태를 유지하지 않는다.
      // signOut → SIGNED_OUT 이벤트로 recovering 이 false 가 되고 Gate 가 로그인 화면을 띄운다.
      await endRecoverySession();
      setRecovering(false);
      Alert.alert('비밀번호 변경 완료', '새 비밀번호로 로그인해주세요.', [
        { text: '확인', onPress: () => navigation.popToTop() },
      ]);
    } catch (e) {
      // 실패하면 게이트를 원상복구한다(복구 세션이 안 생겼으면 잠가둘 이유가 없다).
      if (!recoveredRef.current) setRecovering(false);
      Alert.alert('변경 실패', e.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10, padding: 4 }}>
          <ChevronLeft color={colors.charcoalBlack} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>비밀번호 찾기</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{step === 1 ? '가입하신 이메일을 입력해주세요' : '메일로 받은 인증코드를 입력해주세요'}</Text>
          <Text style={styles.sub}>
            {step === 1
              ? '해당 주소로 6자리 인증코드를 보내드려요.'
              : `${email.trim()} 으로 보낸 ${OTP_LENGTH}자리 코드예요.`}
          </Text>

          {step === 1 && !!maskedEmail && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                찾은 아이디: {maskedEmail}{'\n'}
                보안을 위해 일부를 가렸어요. 전체 이메일 주소를 입력해주세요.
              </Text>
            </View>
          )}

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={[styles.input, step === 2 && styles.inputReadonly]}
            placeholder="email@example.com" placeholderTextColor="#C4C9D0"
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            value={email} onChangeText={setEmail} editable={step === 1 && !loading}
          />

          {step === 1 ? (
            <>
              {/* ★ 쿨다운 중에도 버튼이 눌리는 모양이면 '고장난 것처럼' 보인다.
                  disabled 와 라벨에 남은 시간을 함께 드러내 상태를 숨기지 않는다. */}
              <TouchableOpacity activeOpacity={0.85} onPress={() => handleSendCode(false)}
                disabled={loading || cooldown > 0}
                style={[styles.primaryBtn, (loading || cooldown > 0) && { opacity: 0.7 }]}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.primaryBtnText}>
                    {cooldown > 0 ? `인증코드 받기 (${cooldown}초 후 가능)` : '인증코드 받기'}
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>
                · 아이디(로그인 계정)는 가입하신 이메일 주소입니다.{'\n'}
                · 메일이 오지 않으면 스팸함도 확인해주세요.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>인증코드</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000" placeholderTextColor="#C4C9D0"
                keyboardType="number-pad" maxLength={OTP_LENGTH}
                value={code} onChangeText={t => setCode(normalizeOtp(t))} editable={!loading}
              />
              <TouchableOpacity onPress={() => handleSendCode(true)} disabled={loading || cooldown > 0}
                style={styles.resendBtn}>
                <Text style={[styles.resendText, (loading || cooldown > 0) && { color: colors.mediumGray }]}>
                  {cooldown > 0 ? `인증코드 재발송 (${cooldown}초 후 가능)` : '인증코드 재발송'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>새 비밀번호</Text>
              <TextInput
                style={styles.input} placeholder={`${PASSWORD_MIN}자 이상`} placeholderTextColor="#C4C9D0"
                secureTextEntry value={password} onChangeText={setPassword} editable={!loading}
              />
              <Text style={styles.label}>새 비밀번호 확인</Text>
              <TextInput
                style={styles.input} placeholder="비밀번호 재입력" placeholderTextColor="#C4C9D0"
                secureTextEntry value={passwordConfirm} onChangeText={setPasswordConfirm} editable={!loading}
                onSubmitEditing={handleSubmit}
              />

              <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={loading}
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>비밀번호 변경</Text>}
              </TouchableOpacity>

              {/* 다른 이메일로 다시 받는 경로다. 서버 재발송 제한은 '같은 이메일' 기준이라
                  쿨다운을 그대로 두면 다른 주소인데도 최대 60초 동안 발송이 막힌다.
                  이미 코드를 검증해 둔 상태였다면 그 복구 세션도 폐기한다(1회용 코드 재사용 방지). */}
              <TouchableOpacity
                onPress={() => {
                  setStep(1);
                  setCode('');
                  setCooldown(0);
                  if (recoveredRef.current) { recoveredRef.current = false; endRecoverySession(); }
                  setRecovering(false);
                }}
                disabled={loading} style={styles.backStepBtn}>
                <Text style={styles.backStepText}>이메일 주소를 잘못 입력했어요</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 헤더는 SignUpScreen 과 같은 패턴(상단 인셋 + ChevronLeft + 제목).
  header: {
    paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.charcoalBlack },

  title: { fontSize: 20, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 6 },
  sub: { fontSize: 13, color: colors.mediumGray, marginBottom: 24, lineHeight: 19 },

  label: { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.charcoalBlack, marginBottom: 16,
  },
  inputReadonly: { color: colors.mediumGray },
  codeInput: { fontSize: 22, fontWeight: '800', letterSpacing: 6, textAlign: 'center', marginBottom: 8 },

  primaryBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  resendBtn: { alignSelf: 'flex-end', paddingVertical: 8, marginBottom: 12 },
  resendText: { fontSize: 13, fontWeight: '600', color: colors.primaryGreen },

  backStepBtn: { alignItems: 'center', paddingVertical: 16 },
  backStepText: { fontSize: 13, color: colors.mediumGray },

  hint: { fontSize: 12, color: '#6B7280', lineHeight: 19, marginTop: 16 },
  infoBox: { backgroundColor: colors.freshMint, borderRadius: 12, padding: 14, marginBottom: 20 },
  infoText: { fontSize: 12, color: '#1F6B4C', lineHeight: 20 },
});
