import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, Navigation2, Home, Building2,
  MapPin, Check, Trash2, X, Plus, Pencil,
} from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { getCurrentCoords, reverseGeocode } from '../lib/location';

// TODO: GET /api/addresses/search?q={query} 로 교체 (카카오 주소 API 또는 도로명주소 API 연동)
const SEARCH_RESULTS = [
  { address: '서울 강남구 테헤란로 152', detail: '강남파이낸스센터' },
  { address: '서울 강남구 테헤란로 427', detail: '위워크타워' },
  { address: '서울 강남구 역삼로 123', detail: '역삼빌딩' },
  { address: '서울 마포구 와우산로 94', detail: '신촌아이파크' },
  { address: '경기 성남시 분당구 정자일로 95', detail: '파크뷰아파트' },
];

function IconComp({ icon, size = 18, color }) {
  if (icon === 'home')     return <Home     size={size} color={color} />;
  if (icon === 'building') return <Building2 size={size} color={color} />;
  return <MapPin size={size} color={color} />;
}

export default function AddressScreen({ navigation }) {
  const { addresses, currentAddress, handleSelectAddress, handleAddAddress, handleDeleteAddress } = useApp();

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [addModal, setAddModal] = useState(null); // { address, detail }
  const [labelInput, setLabelInput] = useState('');
  const [locating, setLocating] = useState(false);

  async function handleUseCurrentLocation() {
    if (locating) return;
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) { Alert.alert('위치 권한 필요', '현재 위치를 사용하려면 위치 권한을 허용해주세요.'); return; }
      const addr = await reverseGeocode(coords.lat, coords.lng);
      if (!addr) { Alert.alert('주소를 찾지 못했어요', '잠시 후 다시 시도해주세요.'); return; }
      setQuery('');
      setShowResults(false);
      setLabelInput('');
      setAddModal({ address: addr, detail: '현재 위치' });
    } finally {
      setLocating(false);
    }
  }

  const filtered = query.trim()
    ? SEARCH_RESULTS.filter(r =>
        r.address.includes(query) || r.detail.includes(query)
      )
    : [];

  function handleSearchFocus() {
    setShowResults(true);
  }

  function handleSelectResult(result) {
    setQuery('');
    setShowResults(false);
    setLabelInput('');
    setAddModal(result);
  }

  function handleConfirmAdd() {
    if (!labelInput.trim()) {
      Alert.alert('이름을 입력해 주세요');
      return;
    }
    handleAddAddress({
      label: labelInput.trim(),
      icon: 'pin',
      address: addModal.address,
    });
    setAddModal(null);
  }

  function confirmDelete(id) {
    Alert.alert('주소 삭제', '이 주소를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => handleDeleteAddress(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주소 설정</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('AddressEdit')}
        >
          <Pencil size={20} color={colors.charcoalBlack} />
        </TouchableOpacity>
      </View>

      {/* 검색바 */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={15} color={colors.mediumGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="지번, 도로명, 건물명으로 검색"
            placeholderTextColor={colors.mediumGray}
            value={query}
            onChangeText={t => { setQuery(t); setShowResults(true); }}
            onFocus={handleSearchFocus}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setShowResults(false); }}>
              <X size={14} color={colors.mediumGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 검색 결과 or 주소 목록 — 검색바 바로 아래 일반 흐름으로 렌더 */}
      {showResults ? (
        <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.resultCurrentBtn}
            onPress={handleUseCurrentLocation}
            disabled={locating}
          >
            <Navigation2 size={16} color={locating ? colors.mediumGray : colors.primaryGreen} />
            <Text style={styles.resultCurrentText}>{locating ? '위치 찾는 중…' : '현재 위치로 찾기'}</Text>
          </TouchableOpacity>
          {filtered.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={styles.resultRow}
              onPress={() => handleSelectResult(r)}
            >
              <MapPin size={15} color={colors.mediumGray} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultAddr}>{r.address}</Text>
                <Text style={styles.resultDetail}>{r.detail}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {query.length > 0 && filtered.length === 0 && (
            <View style={styles.noResult}>
              <Text style={styles.noResultText}>검색 결과가 없습니다</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* 현재 위치로 찾기 */}
          <TouchableOpacity style={styles.gpsBtn} onPress={handleUseCurrentLocation} disabled={locating}>
            <Navigation2 size={18} color={locating ? colors.mediumGray : colors.primaryGreen} />
            <Text style={styles.gpsBtnText}>{locating ? '위치 찾는 중…' : '현재 위치로 찾기'}</Text>
          </TouchableOpacity>

          {/* 저장된 주소 목록 */}
          <View style={styles.addrList}>
            {addresses.map((addr, idx) => {
              const isSelected = currentAddress?.id === addr.id;
              return (
                <View
                  key={addr.id}
                  style={[styles.addrRow, idx < addresses.length - 1 && styles.addrRowBorder]}
                >
                  <TouchableOpacity
                    style={styles.addrMain}
                    onPress={() => { handleSelectAddress(addr.id); navigation.goBack(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.addrIconWrap, isSelected && styles.addrIconWrapActive]}>
                      <IconComp icon={addr.icon} size={17} color={isSelected ? colors.primaryGreen : colors.mediumGray} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.addrLabelRow}>
                        <Text style={[styles.addrLabel, isSelected && styles.addrLabelActive]}>
                          {addr.label}
                        </Text>
                        {isSelected && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>현재 설정된 주소</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addrText} numberOfLines={2}>{addr.address}</Text>
                    </View>
                    {isSelected && (
                      <Check size={18} color={colors.primaryGreen} style={{ flexShrink: 0 }} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(addr.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={15} color="#CCC" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* 주소 추가 확인 모달 */}
      <Modal visible={!!addModal} transparent animationType="slide" onRequestClose={() => setAddModal(null)}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setAddModal(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>주소 이름 설정</Text>
            {addModal && (
              <View style={styles.selectedAddrBox}>
                <MapPin size={14} color={colors.primaryGreen} />
                <Text style={styles.selectedAddrText}>{addModal.address}</Text>
              </View>
            )}
            <Text style={styles.inputLabel}>이름</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={labelInput}
                onChangeText={setLabelInput}
                placeholder="예: 우리집, 회사, 학교"
                placeholderTextColor={colors.mediumGray}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirmAdd}
              />
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAdd}>
              <Plus size={16} color={colors.white} />
              <Text style={styles.confirmBtnText}>주소 추가</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  iconBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },

  searchWrap: {
    backgroundColor: colors.white, paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.softGray, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.charcoalBlack },

  resultsScroll: { flex: 1, backgroundColor: colors.white },
  resultCurrentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  resultCurrentText: { fontSize: 15, fontWeight: '700', color: colors.primaryGreen },
  resultRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F4F4F4',
  },
  resultAddr: { fontSize: 14, fontWeight: '600', color: colors.charcoalBlack, marginBottom: 2 },
  resultDetail: { fontSize: 12, color: colors.mediumGray },
  noResult: { alignItems: 'center', paddingTop: 40 },
  noResultText: { fontSize: 14, color: colors.mediumGray },

  content: { padding: 16, paddingBottom: 60 },

  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.primaryGreen, borderRadius: 12,
    paddingVertical: 14, marginBottom: 16,
  },
  gpsBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryGreen },

  addrList: { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden' },
  addrRow: { flexDirection: 'row', alignItems: 'center' },
  addrRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
  addrMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 16, paddingVertical: 16,
  },
  addrIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.softGray,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addrIconWrapActive: { backgroundColor: colors.freshMint },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  addrLabel: { fontSize: 15, fontWeight: '700', color: colors.charcoalBlack },
  addrLabelActive: { color: colors.primaryGreen },
  currentBadge: {
    backgroundColor: colors.freshMint, borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryGreen },
  addrText: { fontSize: 13, color: colors.charcoalBlack, lineHeight: 19, marginBottom: 2 },
  addrDetail: { fontSize: 12, color: colors.mediumGray },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 16 },

  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack, marginBottom: 14 },
  selectedAddrBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.softGray, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 18,
  },
  selectedAddrText: { flex: 1, fontSize: 13, color: colors.charcoalBlack },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 8 },
  inputWrap: {
    borderWidth: 1.5, borderColor: colors.primaryGreen,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 20,
  },
  input: { fontSize: 15, color: colors.charcoalBlack, paddingVertical: 12 },
  confirmBtn: {
    backgroundColor: colors.primaryGreen,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
    marginBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },
});
