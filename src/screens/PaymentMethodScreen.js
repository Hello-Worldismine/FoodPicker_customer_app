import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Plus, Trash2, Check } from 'lucide-react-native';
import { colors } from '../theme';

const CARD_BRANDS = {
  '신한': { bg: '#0046FF', text: '#FFFFFF' },
  '국민': { bg: '#FFBC00', text: '#1A1A1A' },
  '하나': { bg: '#00A650', text: '#FFFFFF' },
  '우리': { bg: '#0075C2', text: '#FFFFFF' },
  '삼성': { bg: '#1428A0', text: '#FFFFFF' },
  '현대': { bg: '#002C5F', text: '#FFFFFF' },
  '카카오페이': { bg: '#FEE500', text: '#1A1A1A' },
  '네이버페이': { bg: '#03C75A', text: '#FFFFFF' },
};

const INITIAL_CARDS = [
  { id: 1, brand: '신한', number: '1234', type: '신용', isDefault: true },
  { id: 2, brand: '카카오페이', number: '5678', type: '간편결제', isDefault: false },
];

export default function PaymentMethodScreen({ navigation }) {
  const [cards, setCards] = useState(INITIAL_CARDS);

  function handleDelete(id) {
    Alert.alert('결제수단 삭제', '이 결제수단을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => setCards(prev => prev.filter(c => c.id !== id)),
      },
    ]);
  }

  function handleSetDefault(id) {
    setCards(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>결제수단 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cards.length === 0 ? (
          <View style={styles.empty}>
            <CreditCard size={48} color={colors.mediumGray} />
            <Text style={styles.emptyTitle}>등록된 결제수단이 없어요</Text>
            <Text style={styles.emptySub}>카드를 추가하면 빠르게 결제할 수 있어요</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            <Text style={styles.sectionLabel}>등록된 결제수단</Text>
            {cards.map(card => {
              const brand = CARD_BRANDS[card.brand] || { bg: colors.mediumGray, text: '#FFF' };
              return (
                <View key={card.id} style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: brand.bg }]}>
                    <Text style={[styles.cardIconText, { color: brand.text }]}>{card.brand[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{card.brand} {card.type}</Text>
                    <Text style={styles.cardNumber}>**** **** **** {card.number}</Text>
                  </View>
                  {card.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Check size={11} color={colors.primaryGreen} />
                      <Text style={styles.defaultText}>기본</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.setDefaultBtn}
                      onPress={() => handleSetDefault(card.id)}
                    >
                      <Text style={styles.setDefaultText}>기본 설정</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(card.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={colors.mediumGray} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.addBtn}>
          <Plus size={18} color={colors.primaryGreen} />
          <Text style={styles.addBtnText}>결제수단 추가</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>안전한 결제 정보 보호</Text>
          <Text style={styles.infoText}>
            카드 정보는 암호화되어 안전하게 보관됩니다.{'\n'}
            실제 카드번호는 저장되지 않습니다.
          </Text>
        </View>
      </ScrollView>
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

  content: { padding: 16, paddingBottom: 60 },

  empty: { alignItems: 'center', paddingTop: 60, paddingBottom: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoalBlack, marginTop: 6 },
  emptySub: { fontSize: 13, color: colors.mediumGray, textAlign: 'center' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.mediumGray, marginBottom: 10 },
  cardList: { marginBottom: 16 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardIconText: { fontSize: 18, fontWeight: '900' },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 3 },
  cardNumber: { fontSize: 12, color: colors.mediumGray },
  defaultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.freshMint, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  defaultText: { fontSize: 11, fontWeight: '700', color: colors.primaryGreen },
  setDefaultBtn: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  setDefaultText: { fontSize: 11, color: colors.mediumGray },
  deleteBtn: { padding: 4 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primaryGreen, borderStyle: 'dashed',
    paddingVertical: 16, marginBottom: 20,
  },
  addBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryGreen },

  infoBox: {
    backgroundColor: colors.freshMint, borderRadius: 12, padding: 14,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen, marginBottom: 6 },
  infoText: { fontSize: 12, color: '#15803D', lineHeight: 19 },
});
