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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: colors.softGray, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.charcoalBlack, marginBottom: 16 },
});
