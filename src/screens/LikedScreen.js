import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Modal,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Bell, BellOff, X, Check } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import ListProductCard from '../components/ListProductCard';

export default function LikedScreen({ navigation }) {
  const { productList, handleLike } = useApp();
  const likedProducts = productList.filter(p => p.liked);

  // TODO: priceAlerts를 로컬 state 대신 GET /api/price-alerts 로 초기화
  //       알림 설정: POST /api/price-alerts  body: { productId, targetPrice }
  //       알림 해제: DELETE /api/price-alerts/:productId
  //       가격 조건 충족 시 서버에서 FCM 푸시 알림 발송 필요
  const [priceAlerts, setPriceAlerts] = useState({});
  const [alertModal, setAlertModal] = useState(null);
  const [targetInput, setTargetInput] = useState('');
  const [inputError, setInputError] = useState('');

  function openAlertModal(product) {
    setTargetInput(priceAlerts[product.id] ? String(priceAlerts[product.id]) : '');
    setInputError('');
    setAlertModal(product);
  }

  function handleSetAlert() {
    const product = alertModal;
    const value = parseInt(targetInput.replace(/[^0-9]/g, ''), 10);
    if (!value || value <= 0) {
      setInputError('올바른 금액을 입력해주세요.');
      return;
    }
    if (value >= product.salePrice) {
      setInputError(`현재가(${product.salePrice.toLocaleString()}원)보다 낮게 입력해주세요.`);
      return;
    }
    setPriceAlerts(prev => ({ ...prev, [product.id]: value }));
    setAlertModal(null);
  }

  function handleRemoveAlert() {
    setPriceAlerts(prev => {
      const next = { ...prev };
      delete next[alertModal.id];
      return next;
    });
    setAlertModal(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            <ListProductCard
              key={p.id}
              product={p}
              onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
              onLike={handleLike}
              onStorePress={storeId => navigation.navigate('Store', { storeId })}
              alertPrice={priceAlerts[p.id]}
              onAlertPress={() => openAlertModal(p)}
            />
          ))
        )}
      </ScrollView>

      {/* 가격 알림 설정 모달 */}
      <Modal
        visible={!!alertModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertModal(null)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setAlertModal(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Bell size={20} color={colors.primaryGreen} />
                <Text style={styles.sheetTitle}>가격 알림 설정</Text>
                <TouchableOpacity onPress={() => setAlertModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={colors.mediumGray} />
                </TouchableOpacity>
              </View>

              {alertModal && (
                <>
                  <Text style={styles.productName} numberOfLines={1}>{alertModal.name}</Text>
                  <View style={styles.currentPriceRow}>
                    <Text style={styles.currentLabel}>현재 판매가</Text>
                    <Text style={styles.currentPrice}>{alertModal.salePrice.toLocaleString()}원</Text>
                  </View>
                  <Text style={styles.inputLabel}>목표 가격 입력</Text>
                  <View style={[styles.inputWrap, inputError && styles.inputWrapError]}>
                    <TextInput
                      style={styles.priceInput}
                      value={targetInput}
                      onChangeText={t => { setTargetInput(t.replace(/[^0-9]/g, '')); setInputError(''); }}
                      keyboardType="number-pad"
                      placeholder={`${(alertModal.salePrice - 1).toLocaleString()} 이하`}
                      placeholderTextColor={colors.mediumGray}
                      autoFocus
                    />
                    <Text style={styles.inputUnit}>원</Text>
                  </View>
                  {inputError
                    ? <Text style={styles.inputError}>{inputError}</Text>
                    : <Text style={styles.inputHint}>현재가보다 낮은 금액을 입력해주세요</Text>
                  }
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSetAlert}>
                    <Check size={16} color={colors.white} />
                    <Text style={styles.confirmBtnText}>알림 설정 완료</Text>
                  </TouchableOpacity>
                  {priceAlerts[alertModal.id] != null && (
                    <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveAlert}>
                      <BellOff size={14} color={colors.mediumGray} />
                      <Text style={styles.removeBtnText}>알림 해제</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.charcoalBlack },
  headerSub: { fontSize: 13, color: colors.mediumGray, marginTop: 3 },
  content: { backgroundColor: colors.white, paddingBottom: 100 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.softGray,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.mediumGray, textAlign: 'center', lineHeight: 22 },

  /* 모달 */
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },

  productName: {
    fontSize: 14, color: colors.charcoalBlack, fontWeight: '600',
    backgroundColor: colors.softGray, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
  },
  currentPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  currentLabel: { fontSize: 13, color: colors.mediumGray },
  currentPrice: { fontSize: 18, fontWeight: '900', color: colors.primaryGreen },

  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primaryGreen,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 6,
  },
  inputWrapError: { borderColor: colors.alertRed },
  priceInput: {
    flex: 1, fontSize: 18, fontWeight: '700', color: colors.charcoalBlack, paddingVertical: 12,
  },
  inputUnit: { fontSize: 16, color: colors.mediumGray, marginLeft: 4 },
  inputHint: { fontSize: 12, color: colors.mediumGray, marginBottom: 20 },
  inputError: { fontSize: 12, color: colors.alertRed, marginBottom: 20 },

  confirmBtn: {
    backgroundColor: colors.primaryGreen,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14, marginBottom: 10,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    marginBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  removeBtnText: { fontSize: 14, color: colors.mediumGray },
});
