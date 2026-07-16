import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Bell, Tag, Clock, TrendingDown, Megaphone } from 'lucide-react-native';
import { colors } from '../theme';

const STORAGE_KEY = 'notif_settings';
const DEFAULTS = {
  pickupReady: true, pickupRemind: true, closingSoon: true,
  priceDrop: false, newProduct: false, marketing: false,
};

const SETTINGS = [
  {
    group: '픽업 알림',
    items: [
      { key: 'pickupReady',  Icon: Bell,         label: '픽업 준비 완료',   desc: '주문한 상품이 픽업 가능 상태가 되면 알려드려요' },
      { key: 'pickupRemind', Icon: Clock,        label: '픽업 시간 임박',   desc: '픽업 마감 30분 전에 알려드려요' },
    ],
  },
  {
    group: '상품 알림',
    items: [
      { key: 'closingSoon',  Icon: Clock,        label: '마감 임박 상품',   desc: '찜한 상품의 마감이 임박하면 알려드려요' },
      { key: 'priceDrop',    Icon: TrendingDown, label: '가격 인하 알림',   desc: '찜한 상품 가격이 내려가면 알려드려요' },
      { key: 'newProduct',   Icon: Tag,          label: '새 상품 등록',     desc: '관심 매장에 새 상품이 등록되면 알려드려요' },
    ],
  },
  {
    group: '마케팅',
    items: [
      { key: 'marketing',    Icon: Megaphone,    label: '이벤트·혜택 알림', desc: '할인 이벤트, 쿠폰 등 혜택 정보를 알려드려요' },
    ],
  },
];

export default function NotificationSettingsScreen({ navigation }) {
  const [enabled, setEnabled] = useState(DEFAULTS);

  // 저장된 설정 불러오기(기기 로컬 영속).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => { if (v) { try { setEnabled(e => ({ ...e, ...JSON.parse(v) })); } catch {} } })
      .catch(() => {});
  }, []);

  function persist(next) {
    setEnabled(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }

  const allOn = Object.values(enabled).every(Boolean);

  function toggleAll() {
    const next = !allOn;
    persist(Object.fromEntries(Object.keys(enabled).map(k => [k, next])));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 전체 토글 */}
        <View style={styles.allRow}>
          <Text style={styles.allLabel}>모든 알림</Text>
          <Switch
            value={allOn}
            onValueChange={toggleAll}
            trackColor={{ false: '#E0E0E0', true: colors.primaryGreen }}
            thumbColor={colors.white}
          />
        </View>

        {SETTINGS.map(section => (
          <View key={section.group} style={styles.section}>
            <Text style={styles.groupLabel}>{section.group}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => {
                const Icon = item.Icon;
                return (
                  <View
                    key={item.key}
                    style={[styles.row, idx < section.items.length - 1 && styles.rowBorder]}
                  >
                    <View style={styles.iconWrap}>
                      <Icon size={16} color={colors.primaryGreen} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      <Text style={styles.rowDesc}>{item.desc}</Text>
                    </View>
                    <Switch
                      value={enabled[item.key]}
                      onValueChange={v => persist({ ...enabled, [item.key]: v })}
                      trackColor={{ false: '#E0E0E0', true: colors.primaryGreen }}
                      thumbColor={colors.white}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.notice}>
          기기 설정에서 앱 알림이 허용되어 있어야 알림을 받을 수 있어요.
        </Text>
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

  allRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
  },
  allLabel: { fontSize: 16, fontWeight: '800', color: colors.charcoalBlack },

  section: { marginBottom: 20 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: colors.mediumGray, marginBottom: 8, paddingLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowLabel: { fontSize: 14, fontWeight: '700', color: colors.charcoalBlack, marginBottom: 2 },
  rowDesc: { fontSize: 12, color: colors.mediumGray, lineHeight: 17 },

  notice: {
    fontSize: 12, color: colors.mediumGray, textAlign: 'center', lineHeight: 18,
    marginTop: 4,
  },
});
