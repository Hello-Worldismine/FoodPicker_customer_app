import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, ThumbsUp, Megaphone, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme';

const mockReviewData = {
  1: {
    ownerNotice: '안녕하세요, 그린샐러드 강남점입니다 🥗\n매일 신선한 재료만 사용하며, 항상 최상의 품질을 약속드립니다.\n맛있게 드셨다면 리뷰 남겨주세요! 큰 힘이 됩니다 😊',
    ownerNoticeDate: '2024.05.20',
    distribution: { 5: 98, 4: 18, 3: 5, 2: 2, 1: 1 },
    reviews: [
      { id: 1, user: '김민정', rating: 5, date: '2024.06.14', text: '샐러드가 정말 신선하고 맛있어요! 가성비 최고입니다. 매일 먹고 싶을 정도예요.', helpful: 8, ownerReply: '소중한 리뷰 감사해요! 앞으로도 신선하고 맛있는 샐러드로 보답하겠습니다 😊' },
      { id: 2, user: '이준혁', rating: 5, date: '2024.06.12', text: '닭가슴살이 촉촉하고 드레싱도 맛있어요. 다이어트 중인데 딱 좋습니다.', helpful: 5, ownerReply: null },
      { id: 3, user: '박소연', rating: 4, date: '2024.06.10', text: '신선하고 양이 충분해요. 다음에도 구매할 것 같아요.', helpful: 3, ownerReply: null },
      { id: 4, user: '최현우', rating: 5, date: '2024.06.08', text: '픽업도 편하고 상품도 너무 좋았어요! 강추합니다.', helpful: 2, ownerReply: '방문해 주셔서 감사합니다! 또 만나요 🙏' },
    ],
  },
  2: {
    ownerNotice: '베이커리온 역삼점을 찾아주셔서 감사합니다 🥐\n매일 새벽 4시부터 직접 구운 신선한 빵을 제공합니다.\n재고 소진 시 조기 마감될 수 있으니 서둘러 주세요!',
    ownerNoticeDate: '2024.04.10',
    distribution: { 5: 61, 4: 20, 3: 6, 2: 1, 1: 1 },
    reviews: [
      { id: 1, user: '정유진', rating: 5, date: '2024.06.13', text: '크로와상이 바삭하고 버터향이 좋아요. 자주 올게요!', helpful: 12, ownerReply: '감사합니다! 매일 정성껏 굽겠습니다 🥐' },
      { id: 2, user: '홍길동', rating: 4, date: '2024.06.11', text: '가격 대비 퀄리티가 너무 좋아요. 아침 대용으로 딱 좋습니다.', helpful: 7, ownerReply: null },
      { id: 3, user: '김지수', rating: 5, date: '2024.06.09', text: '매일 오고 싶을 정도로 맛있어요!', helpful: 4, ownerReply: null },
    ],
  },
  3: {
    ownerNotice: '한솥도시락 강남역점입니다 🍱\n국내산 재료만 사용하여 정성껏 만들고 있습니다.\n남은 도시락은 매일 마감 2시간 전 특가로 제공됩니다.',
    ownerNoticeDate: '2024.03.15',
    distribution: { 5: 130, 4: 52, 3: 14, 2: 3, 1: 2 },
    reviews: [
      { id: 1, user: '이민수', rating: 4, date: '2024.06.14', text: '불고기 도시락이 집밥 같은 맛이에요. 반찬도 맛있고요.', helpful: 9, ownerReply: '맛있게 드셨다니 정말 기쁩니다! 감사해요 😊' },
      { id: 2, user: '박지영', rating: 4, date: '2024.06.12', text: '양이 많고 맛있어요. 다음에 또 살게요!', helpful: 6, ownerReply: null },
      { id: 3, user: '강민준', rating: 5, date: '2024.06.10', text: '가성비 최고! 든든하게 먹었어요.', helpful: 3, ownerReply: null },
    ],
  },
  4: {
    ownerNotice: '파리바게뜨 선릉점입니다 🍰\n매일 신선한 케이크와 빵을 선보입니다.\n푸드피커를 통해 마감 할인 상품을 저렴하게 만나보세요!',
    ownerNoticeDate: '2024.06.01',
    distribution: { 5: 240, 4: 55, 3: 12, 2: 3, 1: 2 },
    reviews: [
      { id: 1, user: '오수현', rating: 5, date: '2024.06.13', text: '딸기 케이크가 너무 맛있어요. 생크림이 달지 않아서 좋았어요!', helpful: 15, ownerReply: '소중한 후기 감사드립니다! 자주 들러주세요 🍰' },
      { id: 2, user: '배민호', rating: 5, date: '2024.06.11', text: '할인 가격인데도 퀄리티가 훌륭해요.', helpful: 10, ownerReply: null },
      { id: 3, user: '윤세아', rating: 4, date: '2024.06.09', text: '신선한 딸기가 듬뿍 들어있어서 좋았어요.', helpful: 5, ownerReply: null },
    ],
  },
  5: {
    ownerNotice: '자연반찬 강남점입니다 🥡\n100% 국내산 재료로 당일 생산, 당일 판매를 원칙으로 합니다.\n건강한 한 끼 부탁드립니다!',
    ownerNoticeDate: '2024.05.05',
    distribution: { 5: 48, 4: 14, 3: 4, 2: 1, 1: 0 },
    reviews: [
      { id: 1, user: '임재현', rating: 5, date: '2024.06.14', text: '두부조림이 부드럽고 맛있어요. 집밥 같은 정성이 느껴져요.', helpful: 7, ownerReply: '건강하게 드셔주셔서 감사해요! 🙏' },
      { id: 2, user: '한예슬', rating: 4, date: '2024.06.12', text: '나물 반찬이 신선하고 맛있어요. 자주 올게요!', helpful: 4, ownerReply: null },
    ],
  },
  6: {
    ownerNotice: '카페블랑 강남점입니다 ☕\n에티오피아 스페셜티 원두로 매일 신선하게 로스팅합니다.\n음료는 픽업 시 바로 제조해드립니다. 맛있게 드세요!',
    ownerNoticeDate: '2024.06.10',
    distribution: { 5: 158, 4: 22, 3: 6, 2: 1, 1: 1 },
    reviews: [
      { id: 1, user: '조수빈', rating: 5, date: '2024.06.14', text: '아메리카노 향이 풍부하고 샌드위치도 신선해요!', helpful: 18, ownerReply: '항상 최고의 원두로 정성껏 내리겠습니다 ☕' },
      { id: 2, user: '신동욱', rating: 5, date: '2024.06.13', text: '스페셜티 원두 쓰는 게 티가 나요. 맛이 달라요.', helpful: 11, ownerReply: null },
      { id: 3, user: '김하늘', rating: 5, date: '2024.06.11', text: '픽업할 때 음료를 바로 만들어줘서 더 좋았어요.', helpful: 6, ownerReply: null },
      { id: 4, user: '이도현', rating: 4, date: '2024.06.09', text: '세트 가격이 합리적이에요. 다음에도 이용할 것 같아요.', helpful: 3, ownerReply: null },
    ],
  },
};

const SORT_OPTIONS = [
  { key: 'helpful', label: '추천순' },
  { key: 'recent',  label: '최신순' },
  { key: 'high',    label: '별점 높은순' },
  { key: 'low',     label: '별점 낮은순' },
];

function RatingBar({ score, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <View style={rb.row}>
      <Text style={rb.scoreText}>{score}점</Text>
      <View style={rb.track}>
        <View style={[rb.fill, { width: `${pct}%`, backgroundColor: pct > 0 ? '#FFD700' : 'transparent' }]} />
      </View>
      <Text style={rb.countText}>{count}</Text>
    </View>
  );
}

const rb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  scoreText: { fontSize: 12, color: colors.mediumGray, width: 26, textAlign: 'right' },
  track: { flex: 1, height: 6, backgroundColor: colors.softGray, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  countText: { fontSize: 12, color: colors.mediumGray, width: 28 },
});

export default function ReviewScreen({ navigation, route }) {
  const { store } = route.params;
  const [sort, setSort] = useState('helpful');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const data = mockReviewData[store.id] || {
    ownerNotice: null, ownerNoticeDate: null,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [],
  };

  const maxCount = Math.max(...Object.values(data.distribution));
  const totalReviews = Object.values(data.distribution).reduce((a, b) => a + b, 0);

  const sortedReviews = [...data.reviews].sort((a, b) => {
    if (sort === 'helpful') return b.helpful - a.helpful;
    if (sort === 'recent')  return new Date(b.date) - new Date(a.date);
    if (sort === 'high')    return b.rating - a.rating;
    if (sort === 'low')     return a.rating - b.rating;
    return 0;
  });

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label || '추천순';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리뷰</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 평점 요약 */}
        <View style={styles.card}>
          <Text style={styles.storeName}>{store.name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.ratingLeft}>
              <Text style={styles.ratingBig}>{store.rating}</Text>
              <View style={styles.stars}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={16} color="#FFD700"
                    fill={n <= Math.round(store.rating) ? '#FFD700' : 'none'} />
                ))}
              </View>
              <Text style={styles.totalReviews}>{totalReviews.toLocaleString()}개</Text>
            </View>
            <View style={styles.ratingBars}>
              {[5,4,3,2,1].map(score => (
                <RatingBar key={score} score={score} count={data.distribution[score] || 0} maxCount={maxCount} />
              ))}
            </View>
          </View>
        </View>

        {/* 사장님 공지 */}
        {data.ownerNotice && (
          <View style={styles.card}>
            <View style={styles.ownerNoticeHeader}>
              <View style={styles.ownerIcon}>
                <Megaphone size={15} color={colors.white} />
              </View>
              <Text style={styles.ownerNoticeTitle}>사장님 공지</Text>
              <Text style={styles.ownerNoticeDate}>{data.ownerNoticeDate}</Text>
            </View>
            <Text style={styles.ownerNoticeText}>{data.ownerNotice}</Text>
          </View>
        )}

        {/* 리뷰 목록 헤더 */}
        <View style={styles.reviewListHeader}>
          <Text style={styles.reviewCount}>
            최근 리뷰 <Text style={{ color: colors.primaryGreen }}>{sortedReviews.length}개</Text>
          </Text>
          <View>
            <TouchableOpacity onPress={() => setShowSortMenu(v => !v)} style={styles.sortBtn}>
              <Text style={styles.sortBtnText}>{currentSortLabel}</Text>
              <ChevronDown size={14} color={colors.mediumGray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 리뷰 카드 */}
        {sortedReviews.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>아직 리뷰가 없습니다</Text>
          </View>
        ) : sortedReviews.map(review => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <View style={styles.reviewUser}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{review.user[0]}</Text>
                </View>
                <View>
                  <Text style={styles.userName}>{review.user}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
              </View>
              <View style={styles.reviewStars}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={14} color="#FFD700"
                    fill={n <= review.rating ? '#FFD700' : 'none'} />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
            <TouchableOpacity style={styles.helpfulBtn}>
              <ThumbsUp size={13} color={colors.mediumGray} />
              <Text style={styles.helpfulText}>도움돼요 {review.helpful}</Text>
            </TouchableOpacity>
            {review.ownerReply && (
              <View style={styles.ownerReply}>
                <View style={styles.ownerReplyHeader}>
                  <View style={styles.ownerReplyIcon}>
                    <Text style={styles.ownerReplyIconText}>사</Text>
                  </View>
                  <Text style={styles.ownerReplyTitle}>사장님 댓글</Text>
                </View>
                <Text style={styles.ownerReplyText}>{review.ownerReply}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* 정렬 모달 */}
      <Modal visible={showSortMenu} transparent animationType="fade" onRequestClose={() => setShowSortMenu(false)}>
        <TouchableOpacity style={styles.sortOverlay} onPress={() => setShowSortMenu(false)} activeOpacity={1}>
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} onPress={() => { setSort(opt.key); setShowSortMenu(false); }}
                style={[styles.sortMenuItem, sort === opt.key && styles.sortMenuItemActive]}>
                <Text style={[styles.sortMenuText, sort === opt.key && styles.sortMenuTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  content: { padding: 12, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  storeName: { fontSize: 13, color: colors.mediumGray, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  ratingLeft: { alignItems: 'center', flexShrink: 0 },
  ratingBig: { fontSize: 48, fontWeight: '900', color: colors.charcoalBlack, lineHeight: 52 },
  stars: { flexDirection: 'row', gap: 3, marginTop: 8 },
  totalReviews: { fontSize: 12, color: colors.mediumGray, marginTop: 6 },
  ratingBars: { flex: 1 },
  ownerNoticeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 7 },
  ownerIcon: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryGreen,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ownerNoticeTitle: { fontSize: 14, fontWeight: '800', color: colors.charcoalBlack, flex: 1 },
  ownerNoticeDate: { fontSize: 12, color: colors.mediumGray },
  ownerNoticeText: { fontSize: 13, color: '#444', lineHeight: 22 },
  reviewListHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  reviewCount: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.white, borderWidth: 1, borderColor: '#E8EAED',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  sortBtnText: { fontSize: 13, color: colors.charcoalBlack, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: 15, color: colors.mediumGray },
  reviewCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reviewUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: colors.primaryGreen },
  userName: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack },
  reviewDate: { fontSize: 12, color: colors.mediumGray, marginTop: 1 },
  reviewStars: { flexDirection: 'row', gap: 2, flexShrink: 0 },
  reviewText: { fontSize: 14, color: colors.charcoalBlack, lineHeight: 23, marginBottom: 12 },
  helpfulBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: colors.softGray, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start',
  },
  helpfulText: { fontSize: 12, color: colors.mediumGray },
  ownerReply: {
    marginTop: 12, backgroundColor: colors.softGray, borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: colors.primaryGreen,
  },
  ownerReplyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  ownerReplyIcon: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryGreen,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ownerReplyIconText: { fontSize: 11, color: colors.white },
  ownerReplyTitle: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },
  ownerReplyText: { fontSize: 13, color: '#444', lineHeight: 21 },
  sortOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  sortMenu: {
    backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden',
    minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  sortMenuItem: { paddingHorizontal: 16, paddingVertical: 11 },
  sortMenuItemActive: { backgroundColor: colors.freshMint },
  sortMenuText: { fontSize: 13, color: colors.charcoalBlack },
  sortMenuTextActive: { fontWeight: '700', color: colors.primaryGreen },
});
