import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { colors } from '../theme';

export default function SignUpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name.trim()) { Alert.alert('입력 확인', '이름을 입력해주세요.'); return; }
    if (!email.trim() || !password) { Alert.alert('입력 확인', '이메일과 비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { Alert.alert('입력 확인', '비밀번호는 6자 이상이어야 합니다.'); return; }
    if (password !== passwordConfirm) { Alert.alert('입력 확인', '비밀번호가 일치하지 않습니다.'); return; }

    setLoading(true);
    // name → raw_user_meta_data.name (주문/리뷰 표시명으로 서버 RPC 가 마스킹해 사용)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    setLoading(false);

    if (error) {
      const msg = error.message.includes('already registered') ? '이미 가입된 이메일입니다.' : error.message;
      Alert.alert('회원가입 실패', msg);
      return;
    }
    if (data.session) {
      Alert.alert('가입 완료', '환영합니다! 바로 이용하실 수 있어요.');
    } else {
      Alert.alert('가입 신청 완료', '입력하신 이메일로 인증 메일을 보냈습니다.\n인증 완료 후 로그인해주세요.',
        [{ text: '확인', onPress: () => navigation.goBack() }]);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10, padding: 4 }}>
          <ChevronLeft color={colors.charcoalBlack} size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.charcoalBlack }}>회원가입</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>이름</Text>
          <TextInput style={styles.input} placeholder="이름" placeholderTextColor="#C4C9D0" value={name} onChangeText={setName} />
          <Text style={styles.label}>이메일</Text>
          <TextInput style={styles.input} placeholder="email@example.com" placeholderTextColor="#C4C9D0"
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Text style={styles.label}>비밀번호</Text>
          <TextInput style={styles.input} placeholder="6자 이상" placeholderTextColor="#C4C9D0" secureTextEntry value={password} onChangeText={setPassword} />
          <Text style={styles.label}>비밀번호 확인</Text>
          <TextInput style={styles.input} placeholder="비밀번호 재입력" placeholderTextColor="#C4C9D0" secureTextEntry value={passwordConfirm} onChangeText={setPasswordConfirm} />

          <TouchableOpacity activeOpacity={0.85} onPress={handleSignUp} disabled={loading}
            style={{ backgroundColor: colors.primaryGreen, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>회원가입</Text>}
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
