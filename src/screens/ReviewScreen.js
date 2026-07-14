import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, ThumbsUp, Megaphone, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { toggleReviewHelpful, fetchMyHelpfulVotes } from '../lib/api';

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
  const { fetchStoreReviews } = useApp();
  const [reviews, setReviews] = useState([]);
  const [myVotes, setMyVotes] = useState(new Set());
  const [sort, setSort] = useState('helpful');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchStoreReviews(store.id).then(r => { if (mounted) setReviews(r); }).catch(() => {});
    fetchMyHelpfulVotes().then(s => { if (mounted) setMyVotes(s); }).catch(() => {});
    return () => { mounted = false; };
  }, [store.id]);

  async function handleHelpful(reviewId) {
    const voted = myVotes.has(reviewId);
    // 낙관적 업데이트
    setMyVotes(prev => { const n = new Set(prev); voted ? n.delete(reviewId) : n.add(reviewId); return n; });
    setReviews(prev => prev.map(r => r.id === reviewId
      ? { ...r, helpful: Math.max(0, r.helpful + (voted ? -1 : 1)) } : r));
    try {
      const res = await toggleReviewHelpful(reviewId); // { helpful_count, voted }
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful: res.helpful_count } : r));
      setMyVotes(prev => { const n = new Set(prev); res.voted ? n.add(reviewId) : n.delete(reviewId); return n; });
    } catch {
      // 실패 시 롤백
      setMyVotes(prev => { const n = new Set(prev); voted ? n.add(reviewId) : n.delete(reviewId); return n; });
      setReviews(prev => prev.map(r => r.id === reviewId
        ? { ...r, helpful: Math.max(0, r.helpful + (voted ? 1 : -1)) } : r));
    }
  }

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
  const data = { ownerNotice: store.notice || null, ownerNoticeDate: null, distribution, reviews };

  const maxCount = Math.max(1, ...Object.values(data.distribution));
  const totalReviews = reviews.length;

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
            {review.images && review.images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.reviewPhotos} contentContainerStyle={{ gap: 8 }}>
                {review.images.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.reviewPhoto} />
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.helpfulBtn, myVotes.has(review.id) && styles.helpfulBtnActive]}
              onPress={() => handleHelpful(review.id)}
              activeOpacity={0.7}
            >
              <ThumbsUp size={13} color={myVotes.has(review.id) ? colors.primaryGreen : colors.mediumGray} />
              <Text style={[styles.helpfulText, myVotes.has(review.id) && styles.helpfulTextActive]}>도움돼요 {review.helpful}</Text>
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
  reviewPhotos: { marginTop: 10 },
  reviewPhoto: { width: 96, height: 96, borderRadius: 10, backgroundColor: colors.softGray },
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
  helpfulBtnActive: { borderColor: colors.primaryGreen, backgroundColor: colors.freshMint },
  helpfulText: { fontSize: 12, color: colors.mediumGray },
  helpfulTextActive: { color: colors.primaryGreen, fontWeight: '700' },
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
