import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Mail, Link2, Check } from 'lucide-react-native';
import { colors } from '../theme';
import { fetchIdentities, linkSocial, unlinkSocial, PROVIDER_LABEL, OAUTH_CANCELLED } from '../lib/oauth';

// 화면에 노출할 연동 대상. 네이버는 Supabase Auth 제공자가 아니라 identity 로 관리되지 않는다.
// (네이버는 동일 이메일로 로그인하면 Edge Function 이 기존 회원으로 붙여준다)
const LINKABLE = [
  { provider: 'kakao',  label: '카카오',  bg: '#FEE500', fg: '#3C1E1E', mark: 'K' },
  { provider: 'google', label: 'Google', bg: '#F5F5F5', fg: '#4285F4', mark: 'G' },
];

// 이메일/비밀번호 로그인도 identity('email')로 잡히므로 함께 표시한다.
const PROVIDER_META = {
  email: { label: '이메일', bg: colors.freshMint, fg: colors.primaryGreen, mark: '@' },
  kakao: LINKABLE[0],
  google: LINKABLE[1],
};

export default function LinkedAccountsScreen({ navigation }) {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // 진행 중인 provider

  const load = useCallback(async () => {
    try {
      const list = await fetchIdentities();
      setIdentities(list);
    } catch (e) {
      Alert.alert('불러오기 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function findIdentity(provider) {
    return identities.find(i => i.provider === provider) ?? null;
  }

  async function handleLink(provider) {
    if (busy) return;
    setBusy(provider);
    try {
      await linkSocial(provider);
      await load();
      Alert.alert('연동 완료', `${PROVIDER_LABEL[provider] ?? provider} 계정이 연결되었습니다.\n다음부터 간편 로그인으로 바로 로그인할 수 있어요.`);
    } catch (e) {
      if (e?.code !== OAUTH_CANCELLED) {
        Alert.alert('연동 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
      }
    } finally {
      setBusy(null);
    }
  }

  function handleUnlink(provider) {
    const identity = findIdentity(provider);
    if (!identity) return;
    // 마지막 로그인 수단을 끊으면 계정에 접근할 수 없게 되므로 차단한다.
    if (identities.length <= 1) {
      Alert.alert('해제할 수 없음', '로그인 수단이 하나뿐입니다.\n다른 로그인 수단을 먼저 연결해주세요.');
      return;
    }
    const label = PROVIDER_LABEL[provider] ?? PROVIDER_META[provider]?.label ?? provider;
    Alert.alert('연동 해제', `${label} 계정 연결을 해제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        style: 'destructive',
        onPress: async () => {
          setBusy(provider);
          try {
            await unlinkSocial(identity);
            await load();
          } catch (e) {
            Alert.alert('해제 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  // 이메일 identity 는 연결/해제 버튼 없이 상태만 보여준다.
  const emailIdentity = findIdentity('email');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>연결된 계정 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primaryGreen} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primaryGreen} />}
        >
          <Text style={styles.intro}>
            같은 계정에 여러 로그인 수단을 연결할 수 있어요.{'\n'}
            연결하면 다음부터 간편 로그인으로 바로 들어올 수 있습니다.
          </Text>

          {/* 이메일 로그인 */}
          {emailIdentity != null && (
            <View style={styles.section}>
              <Text style={styles.groupLabel}>이메일</Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.freshMint }]}>
                    <Mail size={17} color={colors.primaryGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>이메일 로그인</Text>
                    <Text style={styles.rowDesc} numberOfLines={1}>
                      {emailIdentity.identity_data?.email ?? '연결됨'}
                    </Text>
                  </View>
                  <View style={styles.linkedBadge}>
                    <Check size={13} color={colors.primaryGreen} />
                    <Text style={styles.linkedBadgeText}>연결됨</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 소셜 계정 */}
          <View style={styles.section}>
            <Text style={styles.groupLabel}>간편 로그인</Text>
            <View style={styles.card}>
              {LINKABLE.map((item, idx) => {
                const identity = findIdentity(item.provider);
                const linked = identity != null;
                const working = busy === item.provider;
                return (
                  <View key={item.provider} style={[styles.row, idx < LINKABLE.length - 1 && styles.rowBorder]}>
                    <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                      <Text style={[styles.mark, { color: item.fg }]}>{item.mark}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      <Text style={styles.rowDesc} numberOfLines={1}>
                        {linked ? (identity.identity_data?.email ?? '연결됨') : '연결되지 않음'}
                      </Text>
                    </View>
                    {working ? (
                      <ActivityIndicator color={colors.primaryGreen} />
                    ) : linked ? (
                      <TouchableOpacity style={styles.unlinkBtn} onPress={() => handleUnlink(item.provider)} disabled={busy != null}>
                        <Text style={styles.unlinkBtnText}>해제</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.linkBtn} onPress={() => handleLink(item.provider)} disabled={busy != null}>
                        <Link2 size={13} color={colors.white} />
                        <Text style={styles.linkBtnText}>연결</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.notice}>
            · 네이버는 별도 연결 없이, 같은 이메일로 네이버 로그인하면 이 계정으로 로그인됩니다.{'\n'}
            · 로그인 수단이 하나만 남으면 해제할 수 없습니다.{'\n'}
            · 이미 다른 회원에 연결된 소셜 계정은 연결할 수 없습니다.
          </Text>
        </ScrollView>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 16, paddingBottom: 60 },
  intro: { fontSize: 13, color: colors.mediumGray, lineHeight: 19, marginBottom: 18, paddingHorizontal: 4 },

  section: { marginBottom: 20 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: colors.mediumGray, marginBottom: 8, paddingLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  mark: { fontSize: 14, fontWeight: '900' },
  rowLabel: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2 },
  rowDesc: { fontSize: 12, color: colors.mediumGray, lineHeight: 17 },

  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryGreen, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  linkBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  unlinkBtn: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  unlinkBtnText: { fontSize: 13, fontWeight: '700', color: colors.mediumGray },
  linkedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.freshMint, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  linkedBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },

  notice: { fontSize: 12, color: colors.mediumGray, lineHeight: 19, paddingHorizontal: 4 },
});
