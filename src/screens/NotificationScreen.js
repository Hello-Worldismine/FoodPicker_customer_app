import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Megaphone, ShoppingBag, MapPin } from 'lucide-react-native';
import { colors } from '../theme';

const NOTIF_TYPES = {
  liked_closing:  { Icon: Heart,       iconBg: '#FFF0F0', iconColor: '#E53E3E', label: '찜 상품 알림' },
  ad:             { Icon: Megaphone,   iconBg: colors.freshMint, iconColor: colors.primaryGreen, label: '이벤트/광고' },
  order_complete: { Icon: ShoppingBag, iconBg: '#EEF2FF', iconColor: '#4F46E5', label: '결제 완료' },
  pickup:         { Icon: MapPin,      iconBg: '#FFF8E6', iconColor: colors.warmOrange, label: '픽업 안내' },
};

const mockNotifications = [
  { id: 1, type: 'pickup', title: '픽업 시간이 다가오고 있어요!', body: '그린샐러드 강남점 픽업 시간까지 30분 남았습니다. 준비해 주세요 🏃', time: new Date(Date.now() - 1000*60*15).toISOString(), read: false },
  { id: 2, type: 'order_complete', title: '결제가 완료됐어요', body: '닭가슴살 샐러드 결제가 완료됐습니다. 픽업번호: FP-1024', time: new Date(Date.now() - 1000*60*40).toISOString(), read: false },
  { id: 3, type: 'liked_closing', title: '찜한 상품이 마감임박이에요!', body: '딸기 생크림 케이크 조각 (파리바게뜨 선릉점) — 오늘 21:30 마감, 재고 2개 남았어요.', time: new Date(Date.now() - 1000*60*90).toISOString(), read: false },
  { id: 4, type: 'ad', title: '베이커리 특가 이벤트 🥐', body: '오늘 하루만! 베이커리 상품 전체 추가 10% 할인. 지금 바로 확인해보세요.', time: new Date(Date.now() - 1000*60*60*3).toISOString(), read: true },
  { id: 5, type: 'liked_closing', title: '찜한 상품이 마감임박이에요!', body: '아메리카노 + 샌드위치 세트 (카페블랑 강남점) — 오늘 18:00 마감, 재고 6개.', time: new Date(Date.now() - 1000*60*60*5).toISOString(), read: true },
  { id: 6, type: 'order_complete', title: '결제가 완료됐어요', body: '통밀 크로와상 2개입 결제가 완료됐습니다. 픽업번호: FP-1018', time: new Date(Date.now() - 1000*60*60*27).toISOString(), read: true },
  { id: 7, type: 'pickup', title: '픽업 완료! 맛있게 드세요 😊', body: '통밀 크로와상 2개입 픽업이 확인됐습니다. 이용해 주셔서 감사합니다.', time: new Date(Date.now() - 1000*60*60*28).toISOString(), read: true },
  { id: 8, type: 'ad', title: '주변에 새 매장이 생겼어요! 🏪', body: '강남구에 새로운 파트너 매장 자연반찬 강남점이 오픈했습니다. 첫 구매 할인 혜택을 확인해보세요.', time: new Date(Date.now() - 1000*60*60*72).toISOString(), read: true },
];

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
  const groups = [];
  const seen = new Set();
  mockNotifications.forEach(n => {
    const g = getDateGroup(n.time);
    if (!seen.has(g)) { seen.add(g); groups.push({ label: g, items: [] }); }
    groups[groups.length - 1].items.push(n);
  });

  const unreadCount = mockNotifications.filter(n => !n.read).length;

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
              const typeInfo = NOTIF_TYPES[notif.type] || NOTIF_TYPES.ad;
              const Icon = typeInfo.icon;
              return (
                <TouchableOpacity key={notif.id} activeOpacity={0.85}
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
                      <Text style={styles.notifTime}>{formatTime(notif.time)}</Text>
                    </View>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifBodyText}>{notif.body}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {mockNotifications.length === 0 && (
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
