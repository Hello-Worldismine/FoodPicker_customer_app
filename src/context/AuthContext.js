import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { unregisterPushToken } from '../lib/push';

// 구매자 인증 세션을 앱 전역에 제공. 세션 유무로 로그인 게이트를 판단한다.
// 구매자 = auth.users(role 없음). 가입 시 이름은 raw_user_meta_data.name 으로 저장(주문/리뷰 표시명).
const AuthContext = createContext(null);

// 이메일 확인/매직링크 딥링크(foodpicker://auth-callback#access_token=...)에서 토큰 추출
function parseTokensFromUrl(url) {
  if (!url) return null;
  const frag = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
  if (!frag) return null;
  const params = new URLSearchParams(frag);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // 딥링크로 앱이 열리면(이메일 인증 링크, 소셜 로그인 콜백 등) 토큰/코드로 세션을 만든다.
  // 간편 로그인은 lib/oauth.js 가 openAuthSessionAsync 반환값으로 직접 처리하지만,
  // 인앱 브라우저가 콜백을 놓치고 OS 가 앱을 딥링크로 깨우는 경우의 안전망이다.
  useEffect(() => {
    let cancelled = false;

    async function handleUrl(url) {
      if (cancelled || !url) return;
      // 이미 세션이 있으면 code 재교환(1회성)을 시도하지 않는다.
      const { data: current } = await supabase.auth.getSession();
      if (cancelled || current?.session) return;

      // 1) implicit 플로우: #access_token&refresh_token
      const tokens = parseTokensFromUrl(url);
      if (tokens) {
        const { error } = await supabase.auth.setSession(tokens);
        if (error) console.warn('[deep link setSession]', error.message);
        return;
      }
      // 2) PKCE 플로우: ?code=... (exchangeCodeForSession)
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      if (codeMatch) {
        const { error } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1]));
        if (error) console.warn('[deep link exchangeCode]', error.message);
      }
    }

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => { handleUrl(url); });
    return () => { cancelled = true; sub.remove(); };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => { await unregisterPushToken(); return supabase.auth.signOut(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
