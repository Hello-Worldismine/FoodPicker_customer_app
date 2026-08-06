import React, { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import OrderStatusToast from './src/components/OrderStatusToast';

// 푸시 payload → 이동할 화면. data.reference_type 은 report_logs 트리거가
// buyer_notifications.reference_type 그대로 실어 보낸다(src/lib/push.js 참고).
function toDeepLinkTarget(data) {
  if (!data) return null;
  if (data.reference_type === 'report' && data.reference_id) {
    return { name: 'InquiryDetail', params: { reportId: data.reference_id } };
  }
  return null;
}

// 네비게이터가 아직 준비되지 않았는지 되묻는 주기(ms).
const DEEP_LINK_RETRY_INTERVAL = 400;

// 푸시 알림(배너) 탭 시 해당 화면으로 딥링크.
// 주의: 알림을 탭해 앱을 켜는 콜드스타트에서는 이 훅이 도는 시점에 NavigationContainer 가 없다.
// Gate 가 세션 로딩 중에는 로딩뷰만, 닉네임 미설정이면 ProfileSetupScreen 만 렌더하고
// AppNavigator(= NavigationContainer)를 아예 마운트하지 않기 때문이다.
// 그래서 payload 를 ref 에 보관해 두고, 네비게이터가 준비되면 그때 한 번만 소비한다.
function usePushNotificationNavigation() {
  const pendingRef = useRef(null); // 아직 이동하지 못한 딥링크
  const timerRef = useRef(null);

  const stopWaiting = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 준비됐을 때만 이동하고, 소비 후 ref 를 비워 중복 이동을 막는다.
  const flushPending = useCallback(() => {
    const target = pendingRef.current;
    if (!target) {
      stopWaiting();
      return;
    }
    if (!navigationRef.isReady()) return; // 아직 준비 전 — payload 는 그대로 보관
    pendingRef.current = null;
    stopWaiting();
    try {
      navigationRef.navigate(target.name, target.params);
    } catch (e) {
      console.warn('[push] 딥링크 이동 실패:', e?.message);
    }
  }, [stopWaiting]);

  const handleNotificationDeepLink = useCallback(data => {
    const target = toDeepLinkTarget(data);
    if (!target) return;
    pendingRef.current = target; // 나중에 들어온 알림이 우선
    flushPending();
    // 아직 소비되지 않았다면(세션 로딩·닉네임 온보딩 중) 준비될 때까지 대기한다.
    // 온보딩은 사용자 입력을 기다리므로 시간 제한을 두지 않고, 소비/언마운트 시에만 멈춘다.
    if (pendingRef.current && !timerRef.current) {
      timerRef.current = setInterval(flushPending, DEEP_LINK_RETRY_INTERVAL);
    }
  }, [flushPending]);

  useEffect(() => {
    // 앱이 완전 종료 상태였다가 알림 탭으로 실행된 경우(cold start)
    Notifications.getLastNotificationResponseAsync()
      .then(response => handleNotificationDeepLink(response?.notification?.request?.content?.data))
      .catch(e => console.warn('[push] 콜드스타트 알림 조회 실패:', e?.message));
    // 앱이 백그라운드/포그라운드 상태에서 알림을 탭한 경우
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationDeepLink(response.notification.request.content.data);
    });
    return () => {
      sub.remove();
      stopWaiting();
    };
  }, [handleNotificationDeepLink, stopWaiting]);
}

// 세션 유무 → 프로필(닉네임) 설정 여부 순으로 화면을 분기
function Gate() {
  const { session, user, loading, recovering } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#22A06B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
  // ★★ 비밀번호 재설정 중에는 세션이 생겨도 AuthNavigator 를 유지한다.
  // verifyOtp 가 성공하면 복구 세션이 생기는데, 이 가드가 없으면 아래 분기가 곧바로
  // ProfileSetupScreen/AppNavigator 로 넘어가 '새 비밀번호 입력' 화면이 사라진다.
  // recovering 은 SIGNED_OUT 또는 화면 언마운트 시 반드시 false 로 돌아온다(AuthContext 참조).
  if (recovering) return <AuthNavigator />;
  if (!session) return <AuthNavigator />;
  // 닉네임 미설정(최초 로그인/기존 회원)이면 온보딩으로 유도.
  // 판정 근거가 세션 메타데이터라 추가 로딩이 필요 없고, 저장 시 USER_UPDATED 로 자동 통과된다.
  if (!user?.user_metadata?.nickname) return <ProfileSetupScreen />;
  return <AppNavigator />;
}

export default function App() {
  usePushNotificationNavigation();
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Gate />
          {/* 어느 화면에 있든 보이는 상단 안내 배너(픽업완료/주문취소). Gate 뒤에 둬야 위로 겹친다. */}
          <OrderStatusToast />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
