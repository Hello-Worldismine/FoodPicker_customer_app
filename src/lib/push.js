// 푸시 알림(Expo Push + FCM) 등록.
// 주의: 원격 푸시는 Expo Go 가 아닌 EAS 개발/프로덕션 빌드 + 실기기에서만 동작.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 앱 포그라운드에서도 알림 배너 표시.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    null
  );
}

// 권한 요청 → Expo push token 획득 → Supabase push_tokens 에 upsert. 실패 시 null.
export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) return null; // 에뮬레이터/시뮬레이터는 원격 토큰 불가

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = getProjectId();
    if (!projectId) {
      console.warn('[push] EAS projectId 없음 — eas init 후 재시도 필요');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return null;

    await supabase.from('push_tokens').upsert(
      { buyer_id: uid, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
    return token;
  } catch (e) {
    console.warn('[push] 등록 실패:', e.message);
    return null;
  }
}

// 로그아웃 시 이 기기 토큰 제거(다른 계정으로 오배송 방지).
export async function unregisterPushToken() {
  try {
    if (!Device.isDevice) return;
    const projectId = getProjectId();
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) await supabase.from('push_tokens').delete().eq('token', token);
  } catch {}
}
