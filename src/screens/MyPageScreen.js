import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardList, Ticket, Heart, CreditCard, Bell, HelpCircle, FileText,
  LogOut, UserX, ChevronRight, User, Link2, KeyRound, Smartphone,
} from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import { deleteMyAccount } from '../lib/api';

// TODO: GET /api/users/me/stats 로 교체 (환경 기여 통계)
const ENV_STATS = [
  { label: '구한 음식', value: '12개' },
  { label: '예상 절감', value: '38,000원' },
  { label: '폐기 감소', value: '4.2kg' },
];

export default function MyPageScreen({ navigation }) {
  const { orders, coupons, likedStores } = useApp();
  const { user, signOut } = useAuth();
  // 표시명은 닉네임이 정본이다(판매자에게 보이는 이름). 미설정 계정만 name 으로 폴백.
  const nickname = user?.user_metadata?.nickname || '';
  const displayName = nickname || user?.user_metadata?.name || '고객';
  const displayEmail = user?.email || '';

  // 닉네임 수정 모달
  const [editVisible, setEditVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const check = api.validateNickname(nicknameInput);

  function openEdit() {
    setNicknameInput(nickname);
    setEditVisible(true);
  }
  async function saveNickname() {
    if (saving || !check.ok) return;
    setSaving(true);
    try {
      // 저장되면 USER_UPDATED 로 세션이 갱신돼 화면이 자동 리렌더된다(로컬 상태 동기화 불필요).
      await api.setMyNickname(nicknameInput);
      setEditVisible(false);
    } catch (e) {
      Alert.alert('닉네임 변경 실패', e.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  // 휴대폰 번호(아이디 찾기 본인확인용) — 기존 회원도 여기서 등록/변경할 수 있어야
  // '이름+휴대폰으로 아이디 찾기'가 신규 가입자에게만 동작하는 반쪽 기능이 되지 않는다.
  const [phone, setPhone] = useState(null);        // 정규화된 숫자열 또는 null(미등록)
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const phoneCheck = api.validatePhone(phoneInput);

  useEffect(() => {
    let alive = true;
    api.fetchMyPhone()
      .then(p => { if (alive) setPhone(p); })
      .catch(e => console.warn('[마이페이지] 휴대폰 조회 실패:', e.message));
    return () => { alive = false; };
  }, []);

  function openPhoneEdit() {
    setPhoneInput(phone ? api.formatPhone(phone) : '');
    setPhoneVisible(true);
  }
  async function savePhone() {
    if (phoneSaving || !phoneCheck.ok) return;
    setPhoneSaving(true);
    try {
      const saved = await api.setMyPhone(phoneInput);
      setPhone(saved || phoneCheck.value);
      setPhoneVisible(false);
    } catch (e) {
      Alert.alert('휴대폰 저장 실패', e.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setPhoneSaving(false);
    }
  }
  function confirmClearPhone() {
    Alert.alert(
      '휴대폰 번호 삭제',
      '삭제하면 이름+휴대폰으로 아이디(이메일)를 찾을 수 없게 됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.clearMyPhone();
              setPhone(null);
              setPhoneVisible(false);
            } catch (e) {
              Alert.alert('삭제 실패', e.message || '잠시 후 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  }

  function confirmLogout() {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      '회원탈퇴',
      '탈퇴하면 계정과 찜·주문·쿠폰·알림 등 모든 데이터가 삭제되며 복구할 수 없습니다.\n정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMyAccount();
              await signOut();
            } catch {
              Alert.alert('탈퇴 실패', '잠시 후 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  }

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'pickupReady').length;

  const menuItems = [
    { key: 'orders',      Icon: ClipboardList, label: '주문내역',             onPress: () => navigation.navigate('MyOrders'),     badge: pendingCount > 0 ? pendingCount : null },
    { key: 'coupons',     Icon: Ticket,        label: '쿠폰함',               onPress: () => navigation.navigate('Coupons'),      badge: coupons.length > 0 ? `${coupons.length}장` : null },
    { key: 'likedStores', Icon: Heart,         label: '관심 매장',             onPress: () => navigation.navigate('LikedStores'),  badge: likedStores.length > 0 ? `${likedStores.length}개` : null },
    { key: 'payment',  Icon: CreditCard,    label: '결제수단 관리',         onPress: () => navigation.navigate('PaymentMethod') },
    { key: 'phone',    Icon: Smartphone,    label: '휴대폰 번호',           onPress: openPhoneEdit, badge: phone ? api.formatPhone(phone) : '미등록' },
    { key: 'password', Icon: KeyRound,      label: '비밀번호 변경',         onPress: () => navigation.navigate('ChangePassword') },
    { key: 'linked',   Icon: Link2,         label: '연결된 계정 관리',       onPress: () => navigation.navigate('LinkedAccounts') },
    { key: 'notif',    Icon: Bell,          label: '알림 설정',             onPress: () => navigation.navigate('NotificationSettings') },
    { key: 'support',  Icon: HelpCircle,    label: '고객센터',              onPress: () => navigation.navigate('Support') },
    { key: 'faq',      Icon: FileText,      label: '자주 묻는 질문',        onPress: () => navigation.navigate('FAQ') },
    { key: 'terms',    Icon: FileText,      label: '약관 및 개인정보처리방침', onPress: () => navigation.navigate('Terms') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 프로필 */}
        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <User size={28} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{displayEmail}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
              <Text style={styles.editBtnText}>수정</Text>
            </TouchableOpacity>
          </View>

          {/* 환경 기여 통계 */}
          <View style={styles.envStats}>
            {ENV_STATS.map(s => (
              <View key={s.label} style={styles.envStat}>
                <Text style={styles.envStatValue}>{s.value}</Text>
                <Text style={styles.envStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.envNote}>* 수치는 예상값입니다</Text>
        </View>

        {/* 메뉴 */}
        <View style={styles.menuList}>
          {menuItems.map((item, idx) => {
            const Icon = item.Icon;
            // 채운 초록 배지는 '처리할 일이 있다'는 신호라서 개수 항목에만 쓴다.
            // 쿠폰/관심매장/휴대폰처럼 단순 정보는 테두리만 있는 연한 배지로 구분한다.
            const softBadge = item.key === 'coupons' || item.key === 'likedStores' || item.key === 'phone';
            return (
              <TouchableOpacity key={item.key} onPress={item.onPress}
                style={[styles.menuItem, idx < menuItems.length - 1 && styles.menuItemBorder]}>
                <Icon size={18} color={colors.charcoalBlack} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.badge != null && (
                  <View style={[styles.menuBadge, softBadge && styles.menuBadgeCoupon]}>
                    <Text style={[styles.menuBadgeText, softBadge && styles.menuBadgeTextCoupon]}>
                      {item.badge}
                    </Text>
                  </View>
                )}
                <ChevronRight size={16} color={colors.mediumGray} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 계정 */}
        <View style={styles.accountList}>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={confirmLogout}>
            <LogOut size={18} color={colors.mediumGray} />
            <Text style={[styles.menuLabel, { color: colors.mediumGray }]}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={confirmDeleteAccount}>
            <UserX size={18} color={colors.alertRed} />
            <Text style={[styles.menuLabel, { color: colors.alertRed }]}>회원탈퇴</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>푸드피커 v1.0.0</Text>
      </ScrollView>

      {/* 닉네임 수정 모달 — 진행 중 주문의 표시명도 함께 갱신된다(sync_my_display_name) */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setEditVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>닉네임 수정</Text>
            <Text style={styles.sheetSub}>주문하면 판매자에게 이 이름이 보여요.</Text>
            <TextInput
              style={styles.sheetInput}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="판매자에게 보여질 이름"
              placeholderTextColor={colors.mediumGray}
              maxLength={api.NICKNAME_MAX}
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveNickname}
            />
            <Text style={[styles.sheetHelp, nicknameInput.trim() && !check.ok && { color: colors.alertRed }]}>
              {nicknameInput.trim() && !check.ok
                ? check.message
                : `${api.NICKNAME_MIN}~${api.NICKNAME_MAX}자 · 실명은 판매자에게 공개되지 않습니다.`}
            </Text>
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setEditVisible(false)} disabled={saving}>
                <Text style={styles.sheetCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetSave, (!check.ok || saving) && { opacity: 0.6 }]}
                onPress={saveNickname}
                disabled={!check.ok || saving}
              >
                {saving
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.sheetSaveText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 휴대폰 번호 등록/변경 — 아이디(이메일) 찾기의 본인확인 인자 */}
      <Modal visible={phoneVisible} transparent animationType="slide" onRequestClose={() => setPhoneVisible(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setPhoneVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>휴대폰 번호</Text>
            <Text style={styles.sheetSub}>아이디(이메일)를 잊었을 때 이름과 함께 본인 확인에 사용해요.</Text>
            <TextInput
              style={styles.sheetInput}
              value={phoneInput}
              onChangeText={t => setPhoneInput(api.formatPhone(t))}
              placeholder="010-1234-5678"
              placeholderTextColor={colors.mediumGray}
              keyboardType="number-pad"
              maxLength={13}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={savePhone}
            />
            <Text style={[styles.sheetHelp, phoneInput.trim() && !phoneCheck.ok && { color: colors.alertRed }]}>
              {phoneInput.trim() && !phoneCheck.ok
                ? phoneCheck.message
                : '판매자에게 공개되지 않으며, 마케팅 연락에 사용하지 않습니다.'}
            </Text>
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setPhoneVisible(false)} disabled={phoneSaving}>
                <Text style={styles.sheetCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetSave, (!phoneCheck.ok || phoneSaving) && { opacity: 0.6 }]}
                onPress={savePhone}
                disabled={!phoneCheck.ok || phoneSaving}
              >
                {phoneSaving
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.sheetSaveText}>저장</Text>}
              </TouchableOpacity>
            </View>
            {!!phone && (
              <TouchableOpacity style={styles.sheetDelete} onPress={confirmClearPhone} disabled={phoneSaving}>
                <Text style={styles.sheetDeleteText}>등록된 번호 삭제</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  content: { paddingBottom: 100 },
  profileSection: { backgroundColor: colors.white, padding: 20, paddingBottom: 16, marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: 18, fontWeight: '800', color: colors.charcoalBlack },
  userEmail: { fontSize: 13, color: colors.mediumGray, marginTop: 3 },
  editBtn: { backgroundColor: colors.softGray, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack },
  envStats: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  envStat: { flex: 1, backgroundColor: colors.freshMint, borderRadius: 12, padding: 10, alignItems: 'center' },
  envStatValue: { fontSize: 14, fontWeight: '800', color: colors.primaryGreen },
  envStatLabel: { fontSize: 10, color: colors.mediumGray, marginTop: 2 },
  envNote: { fontSize: 11, color: colors.mediumGray, textAlign: 'center' },
  menuList: { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 12 },
  accountList: { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.softGray },
  menuLabel: { flex: 1, fontSize: 15, color: colors.charcoalBlack },
  menuBadge: {
    backgroundColor: colors.primaryGreen, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 6,
  },
  menuBadgeCoupon: {
    backgroundColor: colors.freshMint,
    borderWidth: 1, borderColor: colors.primaryGreen,
  },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  menuBadgeTextCoupon: { color: colors.primaryGreen },
  versionText: { fontSize: 12, color: colors.mediumGray, textAlign: 'center', marginTop: 8 },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 6 },
  sheetSub: { fontSize: 13, color: colors.mediumGray, marginBottom: 18 },
  sheetInput: {
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.charcoalBlack,
  },
  sheetHelp: { fontSize: 12, color: colors.mediumGray, marginTop: 8, marginBottom: 20, lineHeight: 18 },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetCancel: { flex: 1, backgroundColor: colors.softGray, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
  sheetSave: {
    flex: 1, backgroundColor: colors.primaryGreen, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  sheetSaveText: { fontSize: 15, fontWeight: '700', color: colors.white },
  sheetDelete: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  sheetDeleteText: { fontSize: 13, fontWeight: '600', color: colors.alertRed },
});
