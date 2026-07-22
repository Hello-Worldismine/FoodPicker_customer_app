import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Home, Building2, MapPin, Navigation2 } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { getCurrentCoords, reverseGeocode } from '../lib/location';
import DaumPostcodeModal from '../components/DaumPostcodeModal';

const LABEL_PRESETS = [
  { key: 'home',     Icon: Home,      label: '우리집',   icon: 'home' },
  { key: 'building', Icon: Building2, label: '회사',     icon: 'building' },
  { key: 'custom',   Icon: MapPin,    label: '직접입력', icon: 'pin' },
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
  const [postcodeVisible, setPostcodeVisible] = useState(false);
  const [locating, setLocating] = useState(false);

  async function handleUseCurrentLocation() {
    if (locating) return;
    setLocating(true);
    const coords = await getCurrentCoords();
    if (coords) {
      const addr = await reverseGeocode(coords.lat, coords.lng);
      if (addr) {
        setCurrentAddr(addr);
      }
    }
    setLocating(false);
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
        {/* 현재 주소 + 변경/현재위치 버튼 */}
        <View style={styles.addrBox}>
          <View style={styles.addrRow}>
            <MapPin size={16} color={colors.primaryGreen} style={{ flexShrink: 0, marginTop: 2 }} />
            <Text style={styles.addrMain}>{currentAddr}</Text>
          </View>
          <View style={styles.addrBtnRow}>
            <TouchableOpacity
              style={styles.changeAddrBtn}
              onPress={() => setPostcodeVisible(true)}
            >
              <Text style={styles.changeAddrBtnText}>주소 변경</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.changeAddrBtn}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              <Navigation2 size={14} color={locating ? colors.mediumGray : colors.primaryGreen} />
              <Text style={styles.changeAddrBtnText}>
                {locating ? '위치 찾는 중…' : '현재 위치로 찾기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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

      {/* 다음 우편번호 검색 모달 */}
      <DaumPostcodeModal
        visible={postcodeVisible}
        onClose={() => setPostcodeVisible(false)}
        onSelect={addr => setCurrentAddr(addr)}
      />
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
  addrBtnRow: { flexDirection: 'row', gap: 8 },
  changeAddrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: colors.primaryGreen, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  changeAddrBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },

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
