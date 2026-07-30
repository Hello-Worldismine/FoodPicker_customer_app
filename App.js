import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import OrderStatusToast from './src/components/OrderStatusToast';

// 세션 유무로 인증 화면 / 앱 본체를 분기
function Gate() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#22A06B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
  return session ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
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
