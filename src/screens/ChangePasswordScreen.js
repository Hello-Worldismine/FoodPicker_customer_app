import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { reauthenticate, changePassword, validateNewPassword, PASSWORD_MIN } from '../lib/auth';

// 로그인 상태에서의 비밀번호 변경(비밀번호 '찾기'와 별개).
// 현재 비밀번호를 다시 확인한 뒤 변경한다 — Supabase 의 Secure password change 옵션이
// 켜져 있으면 서버도 최근 재인증을 요구하므로 이 구조가 그대로 맞다.
//
// 재인증은 signInWithPassword 로 한다. 같은 사용자로 세션이 갱신될 뿐이라
// Gate 분기(세션 있음 + 닉네임 있음)가 그대로 유지돼 화면이 내려가지 않는다.
export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const email = user?.email ?? '';

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;
    if (!current) { Alert.alert('입력 확인', '현재 비밀번호를 입력해주세요.'); return; }
    const check = validateNewPassword(password, passwordConfirm);
    if (!check.ok) { Alert.alert('입력 확인', check.message); return; }
    if (current === password) { Alert.alert('입력 확인', '이전과 다른 비밀번호를 입력해주세요.'); return; }

    setLoading(true);
    try {
      await reauthenticate(email, current);
      await changePassword(password);
      Alert.alert('비밀번호 변경 완료', '다음 로그인부터 새 비밀번호를 사용해주세요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg = (e.message || '').includes('현재 비밀번호')
        // 소셜(카카오/구글)로만 가입한 계정은 비밀번호 자체가 없어 재인증이 실패한다.
        ? '현재 비밀번호가 올바르지 않습니다.\n소셜 로그인으로 가입해 비밀번호가 없다면, 로그아웃 후 로그인 화면의 [비밀번호 찾기]에서 새로 만들어주세요.'
        : e.message || '잠시 후 다시 시도해주세요.';
      Alert.alert('변경 실패', msg);
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
        <Text style={styles.headerTitle}>비밀번호 변경</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.accountLabel}>{email}</Text>
          <Text style={styles.sub}>본인 확인을 위해 현재 비밀번호를 한 번 더 입력해주세요.</Text>

          <Text style={styles.label}>현재 비밀번호</Text>
          <TextInput style={styles.input} placeholder="현재 비밀번호" placeholderTextColor="#C4C9D0"
            secureTextEntry value={current} onChangeText={setCurrent} editable={!loading} />

          <Text style={styles.label}>새 비밀번호</Text>
          <TextInput style={styles.input} placeholder={`${PASSWORD_MIN}자 이상`} placeholderTextColor="#C4C9D0"
            secureTextEntry value={password} onChangeText={setPassword} editable={!loading} />

          <Text style={styles.label}>새 비밀번호 확인</Text>
          <TextInput style={styles.input} placeholder="새 비밀번호 재입력" placeholderTextColor="#C4C9D0"
            secureTextEntry value={passwordConfirm} onChangeText={setPasswordConfirm} editable={!loading}
            onSubmitEditing={handleSubmit} />

          <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>비밀번호 변경</Text>}
          </TouchableOpacity>

          <Text style={styles.hint}>
            · 비밀번호가 기억나지 않으면 로그아웃 후 로그인 화면의 [비밀번호 찾기]를 이용해주세요.
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

  accountLabel: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 6 },
  sub: { fontSize: 13, color: colors.mediumGray, marginBottom: 24, lineHeight: 19 },

  label: { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.charcoalBlack, marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 12, color: '#6B7280', lineHeight: 19, marginTop: 20 },
});
