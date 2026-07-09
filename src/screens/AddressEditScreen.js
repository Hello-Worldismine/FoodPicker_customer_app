import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Home, Building2, MapPin, Trash2 } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

function IconComp({ icon, size = 18, color }) {
  if (icon === 'home')     return <Home      size={size} color={color} />;
  if (icon === 'building') return <Building2 size={size} color={color} />;
  return                          <MapPin    size={size} color={color} />;
}

export default function AddressEditScreen({ navigation }) {
  const { addresses, currentAddress, handleDeleteAddress } = useApp();

  function confirmDelete(id) {
    Alert.alert('주소 삭제', '이 주소를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => handleDeleteAddress(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주소 편집</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {addresses.map((addr, idx) => {
          const isCurrent = currentAddress?.id === addr.id;
          return (
            <View
              key={addr.id}
              style={[styles.card, idx < addresses.length - 1 && { marginBottom: 10 }]}
            >
              {/* 상단: 아이콘 + 라벨 + 배지 */}
              <View style={styles.labelRow}>
                <View style={[styles.iconWrap, isCurrent && styles.iconWrapActive]}>
                  <IconComp icon={addr.icon} size={16} color={isCurrent ? colors.primaryGreen : colors.mediumGray} />
                </View>
                <Text style={[styles.label, isCurrent && styles.labelActive]}>{addr.label}</Text>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>현재 설정된 주소</Text>
                  </View>
                )}
              </View>

              {/* 주소 텍스트 */}
              <Text style={styles.addrText}>{addr.address}</Text>

              {/* 버튼 */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate('AddressDetail', { address: addr })}
                >
                  <Text style={styles.editBtnText}>수정</Text>
                </TouchableOpacity>
                {!isCurrent && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(addr.id)}
                  >
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
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

  card: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: 16,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.softGray,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.freshMint },
  label: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack },
  labelActive: { color: colors.primaryGreen },
  currentBadge: {
    backgroundColor: colors.freshMint, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryGreen },

  addrText: { fontSize: 13, color: colors.charcoalBlack, lineHeight: 20, marginBottom: 4 },
  detailText: { fontSize: 12, color: colors.mediumGray, lineHeight: 18, marginBottom: 4 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: {
    borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: colors.charcoalBlack },
  deleteBtn: {
    borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: colors.mediumGray },
});
