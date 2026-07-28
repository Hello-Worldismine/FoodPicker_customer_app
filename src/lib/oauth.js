// 간편 로그인(소셜 로그인) 헬퍼 — 카카오 / 구글 / 네이버
//
// 공통 흐름
//   1) 리다이렉트 URL 을 앱 딥링크로 만든다: Linking.createURL('auth-callback')
//      → dev build/스토어 빌드에서는 foodpicker://auth-callback (app.json 의 scheme)
//   2) 인앱 브라우저(WebBrowser.openAuthSessionAsync)로 인증 페이지를 띄운다.
//   3) 브라우저가 딥링크로 되돌아오면 URL 에서 인증 결과를 꺼내 세션을 만든다.
//      · PKCE  : ?code=...          → exchangeCodeForSession
//      · implicit(폴백) : #access_token=... → setSession
//
// 제공자별 차이
//   · 구글 / 카카오 : Supabase Auth 가 공식 지원 → signInWithOAuth 사용.
//   · 네이버        : Supabase Auth 미지원 제공자 → 네이버 OAuth 를 직접 호출하고,
//                     받은 code 를 Edge Function 'naver-login' 이 검증해
//                     매직링크 token_hash 를 내려주면 verifyOtp 로 세션을 만든다.
//                     (동일 이메일의 기존 회원이면 그 회원으로 로그인 = 자동 연동)
//
// ⚠️ Expo Go 에서는 커스텀 스킴(foodpicker://) 딥링크가 동작하지 않는다.
//    실제 동작 확인은 dev build(`npx expo run:android` / EAS build) 에서 해야 한다.
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Supabase Auth Provider 로 처리 가능한 제공자(auth-js Provider union 에 포함된 값)
const SUPABASE_PROVIDERS = ['google', 'kakao'];

// 사람이 읽는 제공자 이름 — Alert 메시지에 사용
export const PROVIDER_LABEL = {
  google: '구글',
  kakao: '카카오',
  naver: '네이버',
};

const NAVER_AUTHORIZE_URL = 'https://nid.naver.com/oauth2.0/authorize';

// 로그인 취소를 나타내는 sentinel — 호출부에서 Alert 를 띄우지 않고 조용히 종료한다.
export const OAUTH_CANCELLED = 'OAUTH_CANCELLED';

/** 브라우저가 되돌려준 딥링크 URL 문자열 */
function redirectUrl() {
  // path 를 붙여 다른 딥링크(알림 등)와 구분한다.
  return Linking.createURL('auth-callback');
}

/** url 의 query/fragment 를 합쳐 파라미터로 파싱 (제공자마다 위치가 다르다) */
function parseParams(url) {
  const out = {};
  if (!url) return out;
  const parts = url.split(/[?#]/).slice(1);
  for (const part of parts) {
    for (const [k, v] of new URLSearchParams(part).entries()) out[k] = v;
  }
  return out;
}

/** OAuth 취소/닫기 여부 */
function isCancelled(result) {
  return result?.type === 'cancel' || result?.type === 'dismiss' || result?.type === 'locked';
}

/**
 * 인앱 브라우저로 인증 페이지를 띄우고 콜백 URL 을 돌려준다.
 * 취소 시 OAUTH_CANCELLED 를 throw.
 */
async function openAuth(authUrl) {
  const redirectTo = redirectUrl();
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo, {
    // iOS: 기존 사파리 쿠키를 공유하지 않아 매번 계정 선택 화면이 뜨도록
    preferEphemeralSession: false,
    showInRecents: Platform.OS === 'android',
  });
  if (isCancelled(result)) {
    const err = new Error('로그인이 취소되었습니다.');
    err.code = OAUTH_CANCELLED;
    throw err;
  }
  if (result?.type !== 'success' || !result.url) {
    throw new Error('인증 창을 여는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
  return result.url;
}

/** 콜백 URL → Supabase 세션. code(PKCE) 우선, access_token(implicit) 폴백 */
async function sessionFromCallbackUrl(callbackUrl) {
  const params = parseParams(callbackUrl);

  // 제공자/Supabase 가 에러를 되돌려준 경우
  if (params.error || params.error_description) {
    throw new Error(mapAuthError(params.error_description || params.error));
  }

  // 1) PKCE
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw new Error(mapAuthError(error.message));
    return data.session ?? null;
  }

  // 2) implicit 폴백 (flowType 설정이 무시되는 경로 대비)
  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw new Error(mapAuthError(error.message));
    return data.session ?? null;
  }

  throw new Error('인증 정보를 받지 못했습니다. 잠시 후 다시 시도해주세요.');
}

/** Supabase/제공자 에러 메시지를 한국어로 매핑 */
export function mapAuthError(message) {
  const raw = String(message ?? '');
  const low = raw.toLowerCase();

  if (low.includes('provider is not enabled') || low.includes('unsupported provider')) {
    return '해당 간편 로그인이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.';
  }
  if (low.includes('identity is already linked')) {
    return '해당 소셜 계정은 다른 회원에 연결되어 있습니다.';
  }
  if (low.includes('manual linking is disabled')) {
    return '계정 연동 기능이 비활성화되어 있습니다. 고객센터로 문의해주세요.';
  }
  if (low.includes('email address not authorized') || low.includes('access_denied')) {
    return '소셜 계정에서 이메일 제공에 동의해야 로그인할 수 있습니다.';
  }
  if (low.includes('user already registered') || low.includes('already registered')) {
    return '이미 가입된 이메일입니다. 이메일로 로그인한 뒤 [연결된 계정 관리]에서 연동해주세요.';
  }
  if (low.includes('invalid') && low.includes('code')) {
    return '인증이 만료되었습니다. 다시 시도해주세요.';
  }
  if (low.includes('token has expired') || low.includes('otp_expired')) {
    return '인증이 만료되었습니다. 다시 시도해주세요.';
  }
  if (low.includes('network') || low.includes('failed to fetch')) {
    return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
  }
  return raw || '로그인 중 오류가 발생했습니다.';
}

/**
 * 구글 / 카카오 간편 로그인.
 * @param {'google'|'kakao'} provider
 * @returns {Promise<import('@supabase/supabase-js').Session|null>}
 */
export async function signInWithSocial(provider) {
  if (!SUPABASE_PROVIDERS.includes(provider)) {
    throw new Error(`지원하지 않는 로그인 방식입니다: ${provider}`);
  }
  const redirectTo = redirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(mapAuthError(error.message));
  if (!data?.url) throw new Error('인증 주소를 받지 못했습니다. 잠시 후 다시 시도해주세요.');

  const callbackUrl = await openAuth(data.url);
  return sessionFromCallbackUrl(callbackUrl);
}

/** CSRF 방지용 state 값 */
function randomState() {
  let s = '';
  for (let i = 0; i < 4; i += 1) s += Math.random().toString(36).slice(2, 10);
  return s.slice(0, 32);
}

/**
 * 네이버 간편 로그인.
 * Supabase Auth 가 네이버를 지원하지 않아 네이버 OAuth 를 직접 호출하고,
 * Edge Function 'naver-login' 이 code 를 검증해 매직링크 token_hash 를 내려준다.
 */
export async function signInWithNaver() {
  const clientId = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error('네이버 로그인이 아직 준비되지 않았습니다. (EXPO_PUBLIC_NAVER_CLIENT_ID 미설정)');
  }
  const redirectTo = redirectUrl();
  const state = randomState();

  const authUrl =
    `${NAVER_AUTHORIZE_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectTo)}` +
    `&state=${encodeURIComponent(state)}`;

  const callbackUrl = await openAuth(authUrl);
  const params = parseParams(callbackUrl);

  if (params.error || params.error_description) {
    throw new Error(mapAuthError(params.error_description || params.error));
  }
  if (!params.code) {
    throw new Error('네이버 인증 정보를 받지 못했습니다. 다시 시도해주세요.');
  }
  // state 위조 확인 — 네이버는 요청한 state 를 그대로 되돌려준다.
  if (params.state && params.state !== state) {
    throw new Error('인증 정보가 올바르지 않습니다. 다시 시도해주세요.');
  }

  // Edge Function 이 네이버 토큰 교환 + 프로필 조회 + (없으면) 회원 생성까지 처리한다.
  const { data, error } = await supabase.functions.invoke('naver-login', {
    body: { code: params.code, state, redirectUri: redirectTo },
  });
  if (error) {
    // FunctionsHttpError(4xx/5xx) 는 응답 본문을 context 에 담고 있어 서버 메시지를 꺼내 쓴다.
    let msg = error.message;
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        if (body && body.error) msg = body.error;
      }
    } catch (e) {}
    throw new Error(mapAuthError(msg));
  }
  if (data?.error) throw new Error(mapAuthError(data.error));
  if (!data?.token_hash) {
    throw new Error('네이버 로그인 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: data.token_hash,
  });
  if (verifyError) throw new Error(mapAuthError(verifyError.message));
  return verified.session ?? null;
}

/** 제공자 이름으로 알맞은 로그인 함수를 실행 */
export async function signInWithProvider(provider) {
  if (provider === 'naver') return signInWithNaver();
  return signInWithSocial(provider);
}

/**
 * 기존 회원(로그인 상태)에 소셜 계정을 연결한다.
 * Supabase 대시보드에서 Manual Linking 이 켜져 있어야 한다.
 * 네이버는 Supabase 제공자가 아니므로 연동 대상에서 제외한다.
 */
export async function linkSocial(provider) {
  if (!SUPABASE_PROVIDERS.includes(provider)) {
    throw new Error('네이버는 동일한 이메일로 로그인하면 자동으로 연동됩니다.');
  }
  const redirectTo = redirectUrl();
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(mapAuthError(error.message));
  if (!data?.url) throw new Error('인증 주소를 받지 못했습니다. 잠시 후 다시 시도해주세요.');

  const callbackUrl = await openAuth(data.url);
  return sessionFromCallbackUrl(callbackUrl);
}

/** 연결된 소셜 계정(identity) 해제 */
export async function unlinkSocial(identity) {
  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) throw new Error(mapAuthError(error.message));
}

/** 연결된 identity 목록 */
export async function fetchIdentities() {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw new Error(mapAuthError(error.message));
  return data?.identities ?? [];
}

/**
 * 표시명 보정.
 * 서버 RPC 들이 표시명을 raw_user_meta_data->>'name' 으로만 읽기 때문에,
 * 소셜 가입자(name 없음)는 주문/리뷰에서 '구매자' 로 표시된다.
 * 소셜 제공자가 준 full_name/nickname 등으로 name 을 한 번 채워준다.
 */
export async function ensureUserName() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;

  const meta = data.user.user_metadata ?? {};
  if (typeof meta.name === 'string' && meta.name.trim()) return meta.name.trim();

  const candidate = [meta.full_name, meta.nickname, meta.preferred_username, meta.user_name, meta.given_name]
    .find(v => typeof v === 'string' && v.trim());
  // 아무것도 없으면 이메일 아이디 부분을 사용
  const fallback = data.user.email ? data.user.email.split('@')[0] : '';
  const name = (candidate ?? fallback).trim();
  if (!name) return null;

  const { error: updateError } = await supabase.auth.updateUser({ data: { name } });
  if (updateError) {
    console.warn('[oauth] 표시명 저장 실패:', updateError.message);
    return null;
  }
  return name;
}
