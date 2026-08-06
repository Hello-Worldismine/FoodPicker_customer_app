import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import FindIdScreen from '../screens/FindIdScreen';
import FindPasswordScreen from '../screens/FindPasswordScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        {/* 아이디/비밀번호 찾기는 '로그인 전' 화면이다.
            ★ 비밀번호 재설정은 verifyOtp 로 세션이 생겨도 AuthContext.recovering 이 켜져 있는 동안
              App.js Gate 가 이 네비게이터를 계속 렌더한다(그래야 새 비밀번호 화면이 살아 있다). */}
        <Stack.Screen name="FindId" component={FindIdScreen} />
        <Stack.Screen name="FindPassword" component={FindPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
