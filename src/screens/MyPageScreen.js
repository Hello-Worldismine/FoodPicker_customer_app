import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardList, Ticket, Heart, CreditCard, Bell, HelpCircle, FileText,
  LogOut, UserX, ChevronRight, User,
} from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
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
  const displayName = user?.user_metadata?.name || '고객';
  const displayEmail = user?.email || '';

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
            return (
              <TouchableOpacity key={item.key} onPress={item.onPress}
                style={[styles.menuItem, idx < menuItems.length - 1 && styles.menuItemBorder]}>
                <Icon size={18} color={colors.charcoalBlack} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.badge != null && (
                  <View style={[styles.menuBadge, (item.key === 'coupons' || item.key === 'likedStores') && styles.menuBadgeCoupon]}>
                    <Text style={[styles.menuBadgeText, (item.key === 'coupons' || item.key === 'likedStores') && styles.menuBadgeTextCoupon]}>
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
});
