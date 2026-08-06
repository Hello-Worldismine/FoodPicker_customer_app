// 비밀번호 재설정(찾기) · 변경 도메인 로직
//
// [채택 방식] 6자리 이메일 OTP — 딥링크가 아니다.
//   ① requestPasswordReset(email)     → 메일로 6자리 인증코드 발송
//   ② verifyRecoveryOtp(email, code)  → 복구 세션 생성(PASSWORD_RECOVERY 이벤트 발생)
//   ③ changePassword(newPassword)     → supabase.auth.updateUser({ password })
//
// [왜 딥링크가 아닌가]
//   · Expo Go 에서도 동작한다 — 커스텀 스킴(foodpicker://) 딥링크는 Expo Go 가 처리하지 못한다.
//   · 메일을 PC 에서 열어도 된다 — 이 앱은 flowType:'pkce' 라 링크 방식이면 code_verifier 가
//     '요청한 그 기기'의 저장소에만 있어 다른 기기에서 열면 무조건 실패한다.
//   · 기존 딥링크 핸들러(AuthContext.handleUrl)가 recovery 토큰을 '그냥 로그인'으로
//     오소비하는 사고를 구조적으로 없앤다(탭할 링크 자체가 없다).
//
// ★★ ②가 성공하는 순간 '세션이 생긴다'. App.js Gate 의 recovering 가드가 없으면
//    AuthNavigator 가 즉시 언마운트되어 ③을 호출할 화면이 사라진다.
//    AuthContext 의 recovering 상태와 반드시 함께 쓸 것.
//
// ※ 대시보드 선행 설정: Authentication → Emails → Templates → "Reset Password" 본문에
//    {{ .Token }} 이 있어야 6자리 코드가 메일에 실린다(기본 템플릿에는 없다).
import { supabase } from './supabase';
import { mapAuthError, fetchIdentities } from './oauth';

// 비밀번호 최소 길이 — SignUpScreen 의 검증 규칙과 같은 값.
export const PASSWORD_MIN = 6;
// 이메일 OTP 자릿수(Supabase 기본값 6).
export const OTP_LENGTH = 6;
// 같은 이메일에 대한 재발송은 서버가 60초 간격으로 제한한다 → 버튼 쿨다운도 60초로 맞춘다.
export const RESEND_COOLDOWN_SEC = 60;

/**
 * 재설정 전용 에러 매핑. 공통 케이스는 oauth.js 의 mapAuthError 를 그대로 재사용하고
 * 여기서는 비밀번호/OTP 전용 케이스만 앞단에서 가로챈다.
 */
export function mapResetError(message) {
  const raw = String(message ?? '');
  const low = raw.toLowerCase();

  // 같은 주소로 너무 자주 요청(GoTrue 는 'For security purposes, you can only request this after N seconds')
  if (low.includes('for security purposes') || low.includes('rate limit')
      || low.includes('too many requests') || low.includes('429')) {
    return '요청이 너무 잦습니다. 1분 후 다시 시도해주세요.';
  }
  if (low.includes('over_email_send_rate_limit')) {
    return '메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (low.includes('same as the old password') || low.includes('different from the old password')
      || low.includes('same_password')) {
    return '이전과 다른 비밀번호를 입력해주세요.';
  }
  if (low.includes('password should be at least') || low.includes('weak_password')
      || low.includes('password_too_short')) {
    return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`;
  }
  if (low.includes('pwned') || low.includes('leaked')) {
    return '보안에 취약한 비밀번호입니다. 다른 비밀번호를 사용해주세요.';
  }
  // 만료/오입력 코드 — 사용자가 가장 자주 만나는 문구라 재설정 맥락에 맞춰 다시 쓴다.
  if (low.includes('token has expired or is invalid') || low.includes('otp_expired')
      || (low.includes('invalid') && low.includes('token'))) {
    return '인증코드가 만료되었거나 올바르지 않습니다. 코드를 다시 받아주세요.';
  }
  return mapAuthError(raw);
}

/** 새 비밀번호 검증 — { ok, message }. 서버도 같은 규칙으로 재검증한다. */
export function validateNewPassword(password, confirm) {
  const pw = String(password ?? '');
  if (pw.length < PASSWORD_MIN) {
    return { ok: false, message: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.` };
  }
  if (pw !== String(confirm ?? '')) {
    return { ok: false, message: '비밀번호가 일치하지 않습니다.' };
  }
  return { ok: true, message: '' };
}

/** 6자리 숫자 코드만 남긴다(메일에서 복사할 때 붙는 공백·하이픈 제거). */
export function normalizeOtp(raw) {
  return String(raw ?? '').replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
}

/**
 * ① 재설정 인증코드 요청.
 * ★ redirectTo 를 넘기지 않는다 — 링크가 아니라 코드로 처리하기 때문이다.
 * ★ 호출부는 계정 존재 여부와 무관하게 '동일 문구'를 보여야 한다(계정 열거 방지).
 *   Supabase 도 미가입 주소에 대해 성공을 반환한다.
 */
export async function requestPasswordReset(email) {
  const address = String(email ?? '').trim();
  if (!address) throw new Error('이메일을 입력해주세요.');
  const { error } = await supabase.auth.resetPasswordForEmail(address);
  if (error) throw new Error(mapResetError(error.message));
  return true;
}

/**
 * ② 인증코드 검증 → 복구 세션 생성.
 * 성공 즉시 onAuthStateChange 가 PASSWORD_RECOVERY 를 발행한다.
 * ★ 호출 '전에' AuthContext.setRecovering(true) 를 세워둘 것 — 세션이 먼저 반영되면
 *   Gate 가 화면을 내려버린다.
 */
export async function verifyRecoveryOtp(email, token) {
  const address = String(email ?? '').trim();
  const code = normalizeOtp(token);
  if (code.length !== OTP_LENGTH) {
    throw new Error(`인증코드 ${OTP_LENGTH}자리를 입력해주세요.`);
  }
  const { data, error } = await supabase.auth.verifyOtp({
    email: address,
    token: code,
    type: 'recovery',
  });
  if (error) throw new Error(mapResetError(error.message));
  return data?.session ?? null;
}

/** ③ 새 비밀번호 저장. 복구 세션 또는 로그인 세션이 있어야 한다. */
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: String(newPassword ?? '') });
  if (error) throw new Error(mapResetError(error.message));
  return true;
}

/**
 * 로그인 상태에서 '현재 비밀번호' 재확인.
 * Supabase 의 Secure password change 옵션이 켜져 있으면 서버도 재인증을 요구하므로
 * 이 절차가 그대로 맞다. 성공하면 같은 사용자로 세션이 갱신될 뿐 화면 전환은 없다.
 */
export async function reauthenticate(email, password) {
  const address = String(email ?? '').trim();
  if (!address) throw new Error('계정 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
  const { error } = await supabase.auth.signInWithPassword({ email: address, password });
  if (error) {
    if (String(error.message).toLowerCase().includes('invalid login credentials')) {
      throw new Error('현재 비밀번호가 올바르지 않습니다.');
    }
    throw new Error(mapResetError(error.message));
  }
  return true;
}

/**
 * 소셜 전용 계정(비밀번호 없음) 판별 — 복구 세션 확보 후에만 호출할 수 있다.
 * ⚠️ 요청 단계에서 미리 판별하면 '이 이메일이 가입돼 있는가'를 알려주는
 *    계정 열거 오라클이 되므로 절대 앞단에서 쓰지 않는다.
 * 판별 실패(네트워크 등) 시에는 안내를 띄우지 않도록 true 를 돌려준다.
 */
export async function hasEmailIdentity() {
  try {
    const identities = await fetchIdentities();
    if (!Array.isArray(identities) || identities.length === 0) return true;
    return identities.some(i => i?.provider === 'email');
  } catch (e) {
    console.warn('[auth] identity 조회 실패:', e?.message);
    return true;
  }
}

/** 복구 세션을 정리한다(중도 이탈·완료 후 공통). 푸시 토큰은 건드리지 않는다. */
export async function endRecoverySession() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[auth] 복구 세션 종료 실패:', e?.message);
  }
}
