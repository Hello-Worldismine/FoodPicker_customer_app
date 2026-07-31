import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Navigation2, Search, MapPin, LogOut } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import { getCurrentCoords, reverseGeocode } from '../lib/location';
import DaumPostcodeModal from '../components/DaumPostcodeModal';

// 최초 로그인 온보딩 — App.js Gate 가 nickname 미설정 계정에만 띄운다.
// 저장 순서에 주의: 닉네임을 supabase.auth.updateUser 로 저장하는 순간 USER_UPDATED 가 발생해
// Gate 가 이 화면을 내려버린다. 그래서 닉네임은 '맨 마지막'에 저장하고, 주소는 그 전에 처리한다.
const TOTAL_STEPS = 2;
const STEP_META = {
  1: { title: '닉네임을 정해주세요', sub: '주문하면 판매자에게 이 이름이 보여요' },
  2: { title: '자주 가는 주소', sub: '가까운 매장을 먼저 보여드릴게요' },
};

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { handleAddAddress } = useApp();
  const { signOut } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — 닉네임
  // ★ 실명(user_metadata.name)을 prefill 하지 않는다. 소셜 로그인의 full_name 은 실명이라
  //   그대로 확정되면 판매자에게 실명이 노출된다. 사용자가 직접 정하게 한다.
  const [nickname, setNickname] = useState('');
  const check = api.validateNickname(nickname);
  const nicknameTouched = nickname.trim().length > 0;

  // Step 2 — 주소(선택)
  const [postcodeVisible, setPostcodeVisible] = useState(false);
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [locating, setLocating] = useState(false);

  async function handleUseCurrentLocation() {
    if (locating) return;
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) { Alert.alert('위치 권한 필요', '현재 위치를 사용하려면 위치 권한을 허용해주세요.'); return; }
      const addr = await reverseGeocode(coords.lat, coords.lng);
      if (!addr) { Alert.alert('주소를 찾지 못했어요', '잠시 후 다시 시도해주세요.'); return; }
      setAddress(addr);
      if (!label.trim()) setLabel('우리집');
    } finally {
      setLocating(false);
    }
  }

  // withAddress=false 면 '나중에 하기'(주소는 요구사항상 필수가 아니다).
  async function finish(withAddress) {
    if (submitting) return;
    if (!check.ok) { setStep(1); Alert.alert('닉네임 확인', check.message); return; }
    setSubmitting(true);
    try {
      if (withAddress && address.trim()) {
        await handleAddAddress({ label: label.trim() || '우리집', icon: 'pin', address: address.trim() });
      }
      // 마지막에 저장 → USER_UPDATED 로 세션이 갱신되면 Gate 가 자동으로 앱 본체를 띄운다.
      await api.setMyNickname(check.value);
    } catch (e) {
      Alert.alert('저장 실패', e.message || '잠시 후 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* 헤더 — 단계 표시 + 로그아웃(계정을 잘못 선택했을 때의 탈출구) */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.headerBtn}>
            <ChevronLeft size={22} color={colors.charcoalBlack} />
          </TouchableOpacity>
        ) : <View style={styles.headerBtn} />}
        <Text style={styles.stepText}>{step} / {TOTAL_STEPS}</Text>
        <TouchableOpacity onPress={() => signOut()} style={[styles.headerBtn, { alignItems: 'flex-end' }]}>
          <LogOut size={19} color={colors.mediumGray} />
        </TouchableOpacity>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{STEP_META[step].title}</Text>
          <Text style={styles.sub}>{STEP_META[step].sub}</Text>

          {step === 1 && (
            <>
              <Text style={styles.label}>닉네임</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="판매자에게 보여질 이름"
                placeholderTextColor={colors.mediumGray}
                maxLength={api.NICKNAME_MAX}
                autoCorrect={false}
                returnKeyType="done"
              />
              <Text style={[styles.help, nicknameTouched && !check.ok && styles.helpError]}>
                {nicknameTouched && !check.ok
                  ? check.message
                  : `${api.NICKNAME_MIN}~${api.NICKNAME_MAX}자 · 실명 대신 사용할 이름을 정해주세요.`}
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  · 주문내역과 리뷰에 이 닉네임이 표시됩니다.{'\n'}
                  · 실명은 판매자에게 공개되지 않습니다.{'\n'}
                  · 운영자·관리자 등 오해를 부르는 이름은 사용할 수 없습니다.
                </Text>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <TouchableOpacity style={styles.gpsBtn} onPress={handleUseCurrentLocation} disabled={locating}>
                <Navigation2 size={18} color={locating ? colors.mediumGray : colors.primaryGreen} />
                <Text style={styles.gpsBtnText}>{locating ? '위치 찾는 중…' : '현재 위치로 찾기'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchBar} activeOpacity={0.7} onPress={() => setPostcodeVisible(true)}>
                <Search size={15} color={colors.mediumGray} />
                <Text style={styles.searchPlaceholder}>지번, 도로명, 건물명으로 검색</Text>
              </TouchableOpacity>

              {!!address && (
                <>
                  <View style={styles.selectedAddrBox}>
                    <MapPin size={14} color={colors.primaryGreen} />
                    <Text style={styles.selectedAddrText}>{address}</Text>
                  </View>
                  <Text style={styles.label}>주소 이름</Text>
                  <TextInput
                    style={styles.input}
                    value={label}
                    onChangeText={setLabel}
                    placeholder="예: 우리집, 회사, 학교"
                    placeholderTextColor={colors.mediumGray}
                    maxLength={20}
                    returnKeyType="done"
                  />
                </>
              )}
              <Text style={styles.help}>주소는 나중에 마이페이지에서 언제든 추가할 수 있어요.</Text>
            </>
          )}
        </ScrollView>

        {/* 하단 액션 */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.primaryBtn, !check.ok && styles.primaryBtnDisabled]}
              onPress={() => setStep(2)}
              disabled={!check.ok}
            >
              <Text style={styles.primaryBtnText}>다음</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
                onPress={() => finish(true)}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.primaryBtnText}>{address ? '완료' : '시작하기'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => finish(false)} disabled={submitting}>
                <Text style={styles.skipBtnText}>나중에 하기</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <DaumPostcodeModal
        visible={postcodeVisible}
        onClose={() => setPostcodeVisible(false)}
        onSelect={(addr) => { setAddress(addr); if (!label.trim()) setLabel('우리집'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerBtn: { width: 44, justifyContent: 'center' },
  stepText: { fontSize: 13, fontWeight: '700', color: colors.mediumGray },
  progressTrack: { height: 3, backgroundColor: colors.softGray },
  progressFill: { height: 3, backgroundColor: colors.primaryGreen },

  content: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '900', color: colors.charcoalBlack, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.mediumGray, marginBottom: 28 },

  label: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 8 },
  input: {
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.charcoalBlack,
  },
  help: { fontSize: 12, color: colors.mediumGray, marginTop: 8, lineHeight: 18 },
  helpError: { color: colors.alertRed },
  infoBox: { backgroundColor: colors.freshMint, borderRadius: 12, padding: 14, marginTop: 20 },
  infoText: { fontSize: 12, color: '#1F6B4C', lineHeight: 20 },

  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.primaryGreen, borderRadius: 12,
    paddingVertical: 14, marginBottom: 10,
  },
  gpsBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryGreen },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: colors.mediumGray },
  selectedAddrBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.freshMint, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 18,
  },
  selectedAddrText: { flex: 1, fontSize: 13, color: colors.charcoalBlack },

  footer: { paddingHorizontal: 24, paddingTop: 8, backgroundColor: colors.white },
  primaryBtn: {
    backgroundColor: colors.primaryGreen, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#C9D6CE' },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: colors.white },
  skipBtn: { paddingVertical: 14, alignItems: 'center' },
  skipBtnText: { fontSize: 14, fontWeight: '600', color: colors.mediumGray },
});
