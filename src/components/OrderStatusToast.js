// 화면 상단 비차단 안내 배너 — 픽업완료/주문취소 등 서버발 상태 변경 알림용.
// Alert 는 화면 흐름을 막으므로 쓰지 않는다. 3초 후 자동으로 사라지고, 탭하면 즉시 닫힌다.
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, Bell } from 'lucide-react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

const AUTO_HIDE_MS = 3000;

// tone → 배경/글자색/아이콘
const TONES = {
  success: { bg: colors.primaryGreen, fg: colors.white, Icon: CheckCircle },
  warn:    { bg: colors.alertRed,     fg: colors.white, Icon: XCircle },
  info:    { bg: colors.charcoalBlack, fg: colors.white, Icon: Bell },
};

export default function OrderStatusToast() {
  const app = useApp();
  const toast = (app && app.toast) || null;
  const hideToast = app && app.hideToast;
  const insets = useSafeAreaInsets();

  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const close = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    Animated.timing(anim, {
      toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(() => { if (hideToast) hideToast(); });
  }, [anim, hideToast]);

  // 새 메시지(key 변경)마다 슬라이드 인 → 3초 뒤 슬라이드 아웃.
  const toastKey = toast ? toast.key : null;
  useEffect(() => {
    if (!toastKey) return undefined;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    timerRef.current = setTimeout(close, AUTO_HIDE_MS);
    return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [toastKey, anim, close]);

  if (!toast) return null;

  const tone = TONES[toast.tone] || TONES.info;
  const Icon = tone.Icon;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + 8,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.toast, { backgroundColor: tone.bg }]}
        activeOpacity={0.9}
        onPress={close}
      >
        <Icon size={18} color={tone.fg} />
        <Text style={[styles.message, { color: tone.fg }]} numberOfLines={2}>{toast.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 어느 화면 위에서도 보이도록 절대 배치 + 최상단 z-index.
  wrap: {
    position: 'absolute', left: 12, right: 12,
    zIndex: 9999, elevation: 24,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
  },
  message: { flex: 1, fontSize: 14, fontWeight: '700' },
});
