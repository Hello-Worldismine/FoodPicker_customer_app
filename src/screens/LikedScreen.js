import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

export default function LikedScreen({ navigation }) {
  const { productList, handleLike } = useApp();
  const likedProducts = productList.filter(p => p.liked);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>찜한 상품</Text>
        {likedProducts.length > 0 && (
          <Text style={styles.headerSub}>
            총 <Text style={{ color: colors.primaryGreen, fontWeight: '700' }}>{likedProducts.length}개</Text>의 상품을 찜했어요
          </Text>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {likedProducts.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Heart size={32} color={colors.mediumGray} />
            </View>
            <Text style={styles.emptyTitle}>찜한 상품이 없어요</Text>
            <Text style={styles.emptyText}>
              마음에 드는 상품의 ♡를 눌러{'\n'}찜 목록에 추가해보세요
            </Text>
          </View>
        ) : (
          likedProducts.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
              onLike={handleLike}
              onStorePress={storeId => navigation.navigate('Store', { storeId })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.softGray,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.charcoalBlack },
  headerSub: { fontSize: 13, color: colors.mediumGray, marginTop: 3 },
  content: { padding: 12, paddingBottom: 100, gap: 0 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.softGray,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.mediumGray, textAlign: 'center', lineHeight: 22 },
});
