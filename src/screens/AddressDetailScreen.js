import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Home, Building2, MapPin, Search, X, Navigation2 } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

const LABEL_PRESETS = [
  { key: 'home',     Icon: Home,      label: '우리집',   icon: 'home' },
  { key: 'building', Icon: Building2, label: '회사',     icon: 'building' },
  { key: 'custom',   Icon: MapPin,    label: '직접입력', icon: 'pin' },
];

const SEARCH_RESULTS = [
  { address: '서울 강남구 테헤란로 152', detail: '강남파이낸스센터' },
  { address: '서울 강남구 테헤란로 427', detail: '위워크타워' },
  { address: '서울 강남구 역삼로 123', detail: '역삼빌딩' },
  { address: '서울 마포구 와우산로 94', detail: '신촌아이파크' },
  { address: '경기 성남시 분당구 정자일로 95', detail: '파크뷰아파트' },
  { address: '서울 종로구 세종대로 209', detail: '광화문광장' },
  { address: '서울 서초구 반포대로 222', detail: '서울성모병원' },
];

function PseudoMap() {
  return (
    <View style={styles.mapArea}>
      <View style={[styles.road, { top: '45%', left: 0, right: 0, height: 10 }]} />
      <View style={[styles.road, { left: '40%', top: 0, bottom: 0, width: 10 }]} />
      {[[10,10,34,28],[48,10,34,28],[10,60,34,28],[48,60,34,28]].map(([l,t,w,h],i) => (
        <View key={i} style={[styles.block, { left:`${l}%`, top:`${t}%`, width:`${w}%`, height:`${h}%` }]} />
      ))}
      <View style={styles.pinWrap}>
        <View style={styles.pinCircle}>
          <MapPin size={22} color={colors.white} fill={colors.white} />
        </View>
        <View style={styles.pinTip} />
      </View>
    </View>
  );
}

export default function AddressDetailScreen({ route, navigation }) {
  const { address } = route.params;
  const { handleUpdateAddress } = useApp();

  const initPreset = LABEL_PRESETS.find(p => p.icon === address.icon) || LABEL_PRESETS[2];
  const [selectedPreset, setSelectedPreset] = useState(initPreset.key);
  const [customLabel, setCustomLabel] = useState(
    initPreset.key === 'custom' ? address.label : ''
  );
  const [currentAddr, setCurrentAddr] = useState(address.address);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredResults = searchQuery.trim()
    ? SEARCH_RESULTS.filter(r =>
        r.address.includes(searchQuery) || r.detail.includes(searchQuery)
      )
    : SEARCH_RESULTS;

  function handleSelectResult(result) {
    setCurrentAddr(result.address);
    setSearchQuery('');
    setShowSearch(false);
  }

  function handleSave() {
    const preset = LABEL_PRESETS.find(p => p.key === selectedPreset);
    const label = selectedPreset === 'custom'
      ? (customLabel.trim() || address.label)
      : preset.label;
    handleUpdateAddress({ id: address.id, label, icon: preset.icon, address: currentAddr });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.outer} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주소 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 지도 */}
      <PseudoMap />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 현재 주소 + 변경 버튼 */}
        <View style={styles.addrBox}>
          <View style={styles.addrRow}>
            <MapPin size={16} color={colors.primaryGreen} style={{ flexShrink: 0, marginTop: 2 }} />
            <Text style={styles.addrMain}>{currentAddr}</Text>
          </View>
          <TouchableOpacity
            style={styles.changeAddrBtn}
            onPress={() => { setShowSearch(s => !s); setSearchQuery(''); }}
          >
            <Text style={styles.changeAddrBtnText}>
              {showSearch ? '취소' : '주소 변경'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 주소 검색 섹션 */}
        {showSearch && (
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={15} color={colors.mediumGray} />
              <TextInput
                style={styles.searchInput}
                placeholder="지번, 도로명, 건물명으로 검색"
                placeholderTextColor={colors.mediumGray}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={colors.mediumGray} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.gpsRow}>
              <Navigation2 size={15} color={colors.primaryGreen} />
              <Text style={styles.gpsText}>현재 위치로 찾기</Text>
            </TouchableOpacity>

            {filteredResults.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.resultRow, i < filteredResults.length - 1 && styles.resultRowBorder]}
                onPress={() => handleSelectResult(r)}
              >
                <MapPin size={14} color={colors.mediumGray} style={{ flexShrink: 0, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultAddr}>{r.address}</Text>
                  <Text style={styles.resultDetail}>{r.detail}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {searchQuery.length > 0 && filteredResults.length === 0 && (
              <View style={styles.noResult}>
                <Text style={styles.noResultText}>검색 결과가 없습니다</Text>
              </View>
            )}
          </View>
        )}

        {/* 라벨 선택 */}
        <Text style={styles.sectionLabel}>장소 이름</Text>
        <View style={styles.presetRow}>
          {LABEL_PRESETS.map(p => {
            const Icon = p.Icon;
            const active = selectedPreset === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.presetBtn, active && styles.presetBtnActive]}
                onPress={() => setSelectedPreset(p.key)}
              >
                <Icon size={15} color={active ? colors.primaryGreen : colors.mediumGray} />
                <Text style={[styles.presetText, active && styles.presetTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedPreset === 'custom' && (
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="예) 학교, 스터디카페"
              placeholderTextColor={colors.mediumGray}
              returnKeyType="done"
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>주소 저장</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.white },

  mapArea: {
    height: 200, backgroundColor: '#E8F4E8', overflow: 'hidden', position: 'relative',
  },
  road: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 4 },
  block: { position: 'absolute', backgroundColor: 'rgba(180,210,185,0.6)', borderRadius: 4 },
  pinWrap: {
    position: 'absolute', left: '50%', top: '30%',
    transform: [{ translateX: -18 }], alignItems: 'center',
  },
  pinCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },
  pinTip: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: colors.primaryGreen,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },

  content: { paddingHorizontal: 20, paddingTop: 20 },

  addrBox: {
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
    paddingBottom: 16, marginBottom: 20,
  },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  addrMain: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.charcoalBlack, lineHeight: 24 },
  changeAddrBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: colors.primaryGreen, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  changeAddrBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },

  searchSection: {
    backgroundColor: colors.softGray, borderRadius: 14,
    marginBottom: 20, overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.white,
    margin: 12, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: colors.primaryGreen,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.charcoalBlack },
  gpsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E8E8E8',
    backgroundColor: colors.white, marginHorizontal: 12, borderRadius: 10, marginBottom: 8,
  },
  gpsText: { fontSize: 14, fontWeight: '700', color: colors.primaryGreen },
  resultRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: colors.white, marginHorizontal: 12,
  },
  resultRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultAddr: { fontSize: 14, fontWeight: '600', color: colors.charcoalBlack, marginBottom: 2 },
  resultDetail: { fontSize: 12, color: colors.mediumGray },
  noResult: { alignItems: 'center', paddingVertical: 24 },
  noResultText: { fontSize: 14, color: colors.mediumGray },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.mediumGray, marginBottom: 10 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  presetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingVertical: 10,
  },
  presetBtnActive: { borderColor: colors.primaryGreen, backgroundColor: colors.freshMint },
  presetText: { fontSize: 13, color: colors.mediumGray, fontWeight: '600' },
  presetTextActive: { color: colors.primaryGreen },

  inputWrap: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, marginBottom: 8,
  },
  input: { fontSize: 14, color: colors.charcoalBlack, paddingVertical: 12 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1, borderTopColor: '#EFEFEF',
  },
  saveBtn: {
    backgroundColor: colors.charcoalBlack,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: colors.white },
});
