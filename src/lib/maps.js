// 외부 지도앱 연동 헬퍼 — 네이버 지도.
// Expo Go 에서는 네이티브 지도 SDK(react-native-maps)를 쓸 수 없으므로
// 길찾기·지도보기는 네이버지도 앱 딥링크(nmap://)로 열고, 앱이 없으면 네이버지도 웹으로 폴백한다.
// (구글맵으로 열면 iOS 에서 사파리를 타고 Google Maps 로 넘어간다 — 수정사항 요청)
//
// 좌표(lat/lng)가 있으면 좌표를, 없으면 주소 문자열을, 그것도 없으면 매장명을 사용한다.
// nmap 딥링크는 목적지 좌표가 필수라, 좌표가 없으면 '검색'으로 열어 사용자가 그 자리에서
// 길찾기를 이어가게 한다.
import { Linking } from 'react-native';

// nmap 딥링크 필수 파라미터. 네이버지도에서 '뒤로가기' 시 돌아올 앱을 식별한다.
// app.json 의 ios.bundleIdentifier / android.package 와 동일해야 한다.
const APP_NAME = 'com.foodpicker.userapp';

const enc = (s) => encodeURIComponent(String(s));

function coords({ lat, lng } = {}) {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) ? { lat: la, lng: ln } : null;
}

// 지도에 표시할 이름. 주소보다 매장명이 라벨로 자연스럽다.
function nameOf({ label, address } = {}) {
  return (label || address || '목적지').toString().trim() || '목적지';
}

// 좌표가 없을 때 검색어. 주소가 매장명보다 정확히 찍힌다.
function queryOf({ address, label } = {}) {
  const text = (address || label || '').toString().trim();
  return text || null;
}

// 후보 URL 을 앞에서부터 시도한다.
// 네이버지도 앱이 없으면 openURL 이 reject 되므로 자연스럽게 웹으로 넘어간다.
async function openFirst(urls) {
  for (const url of urls) {
    if (!url) continue;
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // 다음 후보로
    }
  }
  return false;
}

// 길찾기: 목적지까지 경로 안내 (출발지는 생략 → 네이버지도가 현재 위치를 사용)
export async function openDirections(target) {
  const c = coords(target);
  const name = nameOf(target);
  if (c) {
    return openFirst([
      // 대중교통 탭으로 진입 — 앱 안에서 자동차/도보로 바로 전환할 수 있다.
      `nmap://route/public?dlat=${c.lat}&dlng=${c.lng}&dname=${enc(name)}&appname=${APP_NAME}`,
      `https://map.naver.com/p/directions/-/${c.lng},${c.lat},${enc(name)}/-/transit`,
    ]);
  }
  const q = queryOf(target);
  if (!q) return false;
  // 좌표를 모르면 목적지를 특정할 수 없으므로 검색 결과로 보낸다.
  return openFirst([
    `nmap://search?query=${enc(q)}&appname=${APP_NAME}`,
    `https://map.naver.com/p/search/${enc(q)}`,
  ]);
}

// 지도 보기: 목적지 위치를 지도에 표시
export async function openInMaps(target) {
  const c = coords(target);
  const q = queryOf(target);
  if (c) {
    return openFirst([
      `nmap://place?lat=${c.lat}&lng=${c.lng}&name=${enc(nameOf(target))}&appname=${APP_NAME}`,
      `nmap://map?lat=${c.lat}&lng=${c.lng}&zoom=16&appname=${APP_NAME}`,
      q
        ? `https://map.naver.com/p/search/${enc(q)}`
        : `https://map.naver.com/p/search/${enc(`${c.lat},${c.lng}`)}`,
    ]);
  }
  if (!q) return false;
  return openFirst([
    `nmap://search?query=${enc(q)}&appname=${APP_NAME}`,
    `https://map.naver.com/p/search/${enc(q)}`,
  ]);
}
