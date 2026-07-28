// Supabase 클라이언트 (Expo React Native) — 소비자(구매자) 앱
// 판매자 앱과 동일한 Supabase 프로젝트를 공유한다. URL/anon key는 루트 .env 의 EXPO_PUBLIC_* 값에서 주입.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// 값에 섞인 공백/개행/끝 슬래시는 iOS(NSURLSession)의 엄격한 URL 파서에서
// "Invalid path specified in request URL" 를 유발하므로 방어적으로 정리한다.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다. ' +
      '프로젝트 루트의 .env 를 채운 뒤 `npx expo start -c` 로 캐시를 지우고 다시 실행하세요.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // 네이티브에는 URL 바가 없으므로 SDK 의 자동 URL 감지는 끄고,
    // 딥링크(foodpicker://auth-callback)는 AuthContext / lib/oauth.js 에서 직접 처리한다.
    detectSessionInUrl: false,
    // 소셜 로그인(OAuth) 은 PKCE 로 진행한다. implicit(기본값)은 access_token 이
    // URL 프래그먼트로 노출되고 refresh_token 회수도 불안정해 네이티브에 부적합하다.
    flowType: 'pkce',
  },
});

// 앱이 포그라운드일 때만 토큰 자동 갱신 (Supabase 권장 패턴)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
