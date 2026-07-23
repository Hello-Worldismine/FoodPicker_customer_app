import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('입력 확인', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      const msg = error.message.includes('Email not confirmed')
        ? '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.'
        : error.message.includes('Invalid login credentials')
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message;
      Alert.alert('로그인 실패', msg);
    }
    // 성공 시 AuthProvider.onAuthStateChange 가 게이트를 앱으로 전환
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: insets.top + 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <Text style={{ fontSize: 40 }}>🥗</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primaryGreen, marginTop: 8 }}>푸드피커</Text>
            <Text style={{ fontSize: 14, color: colors.mediumGray, marginTop: 4 }}>버려질 음식을 구하고, 합리적으로 픽업하세요</Text>
          </View>

          <Text style={styles.label}>이메일</Text>
          <TextInput style={styles.input} placeholder="email@example.com" placeholderTextColor="#C4C9D0"
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Text style={styles.label}>비밀번호</Text>
          <TextInput style={styles.input} placeholder="비밀번호" placeholderTextColor="#C4C9D0"
            secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={handleLogin} />

          <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} disabled={loading}
            style={{ backgroundColor: colors.primaryGreen, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>로그인</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: colors.mediumGray, fontSize: 14 }}>계정이 없으신가요? <Text style={{ color: colors.primaryGreen, fontWeight: '700' }}>회원가입</Text></Text>
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>간편 로그인</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 카카오 로그인 */}
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.85} onPress={() => {}}>
            <View style={[styles.socialIconWrap, { backgroundColor: '#3C1E1E' }]}>
              <Text style={[styles.socialIconText, { color: '#FEE500' }]}>K</Text>
            </View>
            <Text style={styles.socialLabel}>카카오로 계속하기</Text>
          </TouchableOpacity>

          {/* 네이버 로그인 */}
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#03C75A' }]} activeOpacity={0.85} onPress={() => {}}>
            <View style={[styles.socialIconWrap, { backgroundColor: '#02A04A' }]}>
              <Text style={[styles.socialIconText, { color: '#fff' }]}>N</Text>
            </View>
            <Text style={[styles.socialLabel, { color: '#fff' }]}>네이버로 계속하기</Text>
          </TouchableOpacity>

          {/* 구글 로그인 */}
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0' }]} activeOpacity={0.85} onPress={() => {}}>
            <View style={[styles.socialIconWrap, { backgroundColor: '#F5F5F5' }]}>
              <Text style={[styles.socialIconText, { color: '#4285F4' }]}>G</Text>
            </View>
            <Text style={styles.socialLabel}>Google로 계속하기</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: colors.softGray, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.charcoalBlack, marginBottom: 16 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: colors.mediumGray, fontWeight: '600' },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
    marginBottom: 10, gap: 10,
  },
  socialIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  socialIconText: { fontSize: 13, fontWeight: '900' },
  socialLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
});
