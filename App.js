import React, { useEffect } from 'react';
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

// 푸시 알림(배너) 탭 시 해당 화면으로 딥링크. data.reference_type 은 report_logs 트리거가
// buyer_notifications.reference_type 그대로 실어 보낸다(src/lib/push.js 참고).
function handleNotificationDeepLink(data) {
  if (!data || !navigationRef.isReady()) return;
  if (data.reference_type === 'report' && data.reference_id) {
    navigationRef.navigate('InquiryDetail', { reportId: data.reference_id });
  }
}

function usePushNotificationNavigation() {
  useEffect(() => {
    // 앱이 완전 종료 상태였다가 알림 탭으로 실행된 경우(cold start)
    Notifications.getLastNotificationResponseAsync().then(response => {
      const data = response?.notification?.request?.content?.data;
      if (data) handleNotificationDeepLink(data);
    });
    // 앱이 백그라운드/포그라운드 상태에서 알림을 탭한 경우
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationDeepLink(response.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);
}

// 세션 유무 → 프로필(닉네임) 설정 여부 순으로 화면을 분기
function Gate() {
  const { session, user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#22A06B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
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
