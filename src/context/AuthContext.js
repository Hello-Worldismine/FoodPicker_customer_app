import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { unregisterPushToken } from '../lib/push';

// 구매자 인증 세션을 앱 전역에 제공. 세션 유무로 로그인 게이트를 판단한다.
// 구매자 = auth.users(role 없음). 가입 시 이름은 raw_user_meta_data.name 으로 저장(주문/리뷰 표시명).
const AuthContext = createContext(null);

// 이메일 확인/매직링크 딥링크(foodpicker://auth-callback#access_token=...)에서 토큰 추출.
// type 도 함께 돌려준다 — recovery(비밀번호 재설정) 링크를 걸러내는 데 쓴다.
function parseTokensFromUrl(url) {
  if (!url) return null;
  const frag = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
  if (!frag) return null;
  const params = new URLSearchParams(frag);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const type = params.get('type');
  return access_token && refresh_token ? { access_token, refresh_token, type } : null;
}

// 비밀번호 재설정용 URL 인가?
// 재설정은 6자리 OTP 로 처리하므로(src/lib/auth.js) 이 앱은 recovery 링크를 소비하지 않는다.
// 여기서 세션을 만들어버리면 ① 새 비밀번호 입력 화면에 도달할 수 없고
// ② 1회용 토큰이 소모돼 재설정 화면이 같은 코드를 다시 쓸 수 없다.
function isRecoveryUrl(url) {
  const low = String(url ?? '').toLowerCase();
  return low.includes('type=recovery') || low.includes('reset-password') || low.includes('password-reset');
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // ★★ 비밀번호 재설정 진행 중 표시.
  // verifyOtp 가 성공하는 순간 세션이 생기는데, 그대로 두면 App.js Gate 가 AuthNavigator 를
  // 언마운트해 '새 비밀번호 입력' 화면이 사라진다. Gate 최상단에서 이 값을 먼저 검사한다.
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      // 재설정 완료/중도 이탈 후에는 반드시 내려야 앱이 잠기지 않는다.
      else if (event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // 딥링크로 앱이 열리면(이메일 인증 링크, 소셜 로그인 콜백 등) 토큰/코드로 세션을 만든다.
  // 간편 로그인은 lib/oauth.js 가 openAuthSessionAsync 반환값으로 직접 처리하지만,
  // 인앱 브라우저가 콜백을 놓치고 OS 가 앱을 딥링크로 깨우는 경우의 안전망이다.
  useEffect(() => {
    let cancelled = false;

    async function handleUrl(url) {
      if (cancelled || !url) return;
      // ★ 비밀번호 재설정 링크는 여기서 처리하지 않는다(위 isRecoveryUrl 주석 참조).
      if (isRecoveryUrl(url)) return;
      // 이미 세션이 있으면 code 재교환(1회성)을 시도하지 않는다.
      const { data: current } = await supabase.auth.getSession();
      if (cancelled || current?.session) return;

      // 1) implicit 플로우: #access_token&refresh_token
      const tokens = parseTokensFromUrl(url);
      if (tokens) {
        if (tokens.type === 'recovery') return; // 프래그먼트에만 type 이 실린 경우의 2차 방어

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
    recovering,
    setRecovering,
    signOut: async () => { await unregisterPushToken(); return supabase.auth.signOut(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
