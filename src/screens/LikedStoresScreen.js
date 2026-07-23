import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Star, MapPin, Clock } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

const STATUS_LABEL = {
  selling: { label: '판매중', color: colors.primaryGreen, bg: '#E9F8F1' },
  closing: { label: '마감임박', color: '#C2410C', bg: '#FFF7ED' },
  soldout: { label: '품절', color: colors.mediumGray, bg: '#F3F4F6' },
};

function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

export default function LikedStoresScreen({ navigation }) {
  const { stores, likedStores, handleStoreLike } = useApp();

  const likedList = stores.filter(s => likedStores.includes(s.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>관심 매장</Text>
        <View style={{ width: 40 }} />
      </View>

      {likedList.length > 0 && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            총 <Text style={styles.countNum}>{likedList.length}개</Text>의 매장을 관심 등록했어요
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {likedList.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Heart size={32} color={colors.mediumGray} />
            </View>
            <Text style={styles.emptyTitle}>관심 매장이 없어요</Text>
            <Text style={styles.emptyText}>
              매장 페이지에서 ♡를 눌러{'\n'}관심 매장에 추가해보세요
            </Text>
          </View>
        ) : (
          likedList.map(store => {
            const statusInfo = STATUS_LABEL[store.status] || STATUS_LABEL.soldout;
            return (
              <TouchableOpacity
                key={store.id}
                style={styles.row}
                onPress={() => navigation.navigate('Store', { storeId: store.id })}
                activeOpacity={0.75}
              >
                {/* 이미지 */}
                <View style={styles.imgWrap}>
                  {store.image
                    ? <Image source={{ uri: store.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    : <Text style={{ fontSize: 36 }}>{store.emoji}</Text>
                  }
                </View>

                {/* 정보 */}
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{store.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.sub}>{store.subcategory}</Text>

                  <View style={styles.metaRow}>
                    <Star size={11} color="#FACC15" fill="#FACC15" />
                    <Text style={styles.rating}>{store.rating}</Text>
                    <Text style={styles.reviewCnt}>({store.reviewCount})</Text>
                    <Text style={styles.dot}>·</Text>
                    <MapPin size={11} color={colors.mediumGray} />
                    <Text style={styles.dist}>{fmtDist(store.distance)}</Text>
                  </View>

                </View>

                {/* 하트 */}
                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => handleStoreLike(store.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Heart size={22} color={colors.alertRed} fill={colors.alertRed} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },

  countBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  countText: { fontSize: 13, color: colors.mediumGray },
  countNum: { color: colors.primaryGreen, fontWeight: '700' },

  content: { paddingBottom: 100 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.softGray,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.mediumGray, textAlign: 'center', lineHeight: 22 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
    gap: 14,
  },
  imgWrap: {
    width: 80, height: 80, borderRadius: 14,
    overflow: 'hidden', backgroundColor: '#F0F5F2',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack, flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },
  sub: { fontSize: 12, color: colors.mediumGray, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  rating: { fontSize: 12, fontWeight: '700', color: colors.charcoalBlack },
  reviewCnt: { fontSize: 11, color: colors.mediumGray },
  dot: { fontSize: 11, color: '#CCC' },
  dist: { fontSize: 11, color: colors.mediumGray },
  pickup: { fontSize: 12, color: colors.warmOrange },

  heartBtn: { padding: 4, flexShrink: 0 },
});
