import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Megaphone, ShoppingBag, MapPin, TrendingDown } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

// buyer_notifications.type(order/review/coupon/price/system) → 아이콘/라벨
const NOTIF_TYPES = {
  order:  { Icon: ShoppingBag,  iconBg: '#EEF2FF', iconColor: '#4F46E5', label: '주문' },
  review: { Icon: Megaphone,    iconBg: colors.freshMint, iconColor: colors.primaryGreen, label: '리뷰' },
  coupon: { Icon: Heart,        iconBg: '#FFF0F0', iconColor: '#E53E3E', label: '쿠폰' },
  price:  { Icon: TrendingDown, iconBg: '#FFF0F0', iconColor: colors.alertRed, label: '가격' },
  system: { Icon: MapPin,       iconBg: '#FFF8E6', iconColor: colors.warmOrange, label: '안내' },
};

function formatTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth()+1}.${d.getDate()}`;
}

function getDateGroup(iso) {
  const day = Math.floor((Date.now() - new Date(iso).getTime()) / (1000*60*60*24));
  if (day === 0) return '오늘';
  if (day === 1) return '어제';
  if (day < 7)  return '이번 주';
  return '이전';
}

export default function NotificationScreen({ navigation }) {
  const { notifications, markNotificationRead } = useApp();
  const groups = [];
  const seen = new Set();
  notifications.forEach(n => {
    const g = getDateGroup(n.createdAt);
    if (!seen.has(g)) { seen.add(g); groups.push({ label: g, items: [] }); }
    groups[groups.length - 1].items.push(n);
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>새 알림 {unreadCount}</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {groups.map(group => (
          <View key={group.label}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.items.map(notif => {
              const typeInfo = NOTIF_TYPES[notif.type] || NOTIF_TYPES.system;
              const Icon = typeInfo.Icon;
              return (
                <TouchableOpacity key={notif.id} activeOpacity={0.85}
                  onPress={() => !notif.read && markNotificationRead(notif.id)}
                  style={[styles.notifCard, !notif.read && styles.notifCardUnread]}>
                  <View style={[styles.notifIcon, { backgroundColor: typeInfo.iconBg }]}>
                    <Icon size={20} color={typeInfo.iconColor} />
                    {!notif.read && <View style={styles.unreadDot} />}
                  </View>
                  <View style={styles.notifBody}>
                    <View style={styles.notifMeta}>
                      <View style={[styles.typeBadge, { backgroundColor: typeInfo.iconBg }]}>
                        <Text style={[styles.typeBadgeText, { color: typeInfo.iconColor }]}>{typeInfo.label}</Text>
                      </View>
                      <Text style={styles.notifTime}>{formatTime(notif.createdAt)}</Text>
                    </View>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifBodyText}>{notif.message}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {notifications.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>새로운 알림이 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  header: {
    backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
    borderBottomWidth: 1, borderBottomColor: colors.softGray,
  },
  backBtn: { padding: 4, flexShrink: 0 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  unreadBadge: { backgroundColor: colors.freshMint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  unreadText: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },
  content: { padding: 12, paddingBottom: 40 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: colors.mediumGray, marginBottom: 8, marginTop: 8 },
  notifCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  notifCardUnread: { backgroundColor: '#F0FAF4', borderWidth: 1.5, borderColor: `${colors.primaryGreen}22` },
  notifIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'relative',
  },
  unreadDot: {
    position: 'absolute', top: -3, right: -3,
    width: 10, height: 10, backgroundColor: colors.primaryGreen, borderRadius: 5,
    borderWidth: 2, borderColor: colors.white,
  },
  notifBody: { flex: 1 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  notifTime: { fontSize: 11, color: colors.mediumGray, flexShrink: 0, marginLeft: 8 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2 },
  notifBodyText: { fontSize: 13, color: colors.mediumGray, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyText: { fontSize: 15, color: colors.mediumGray },
});
