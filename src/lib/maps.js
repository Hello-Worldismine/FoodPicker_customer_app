// 외부 지도앱 연동 헬퍼.
// Expo Go 에서는 네이티브 지도 SDK(react-native-maps)를 쓸 수 없으므로
// 길찾기·지도보기는 기기의 지도/브라우저 앱으로 Linking 딥링크를 연다.
// 좌표(lat/lng)가 있으면 좌표를, 없으면 주소 문자열을, 그것도 없으면 매장명을 사용한다.
import { Linking } from 'react-native';

function destParam({ lat, lng, address, label } = {}) {
  if (lat != null && lng != null) return `${lat},${lng}`;
  const text = address || label;
  return text ? encodeURIComponent(text) : null;
}

// 길찾기: 목적지까지 경로 안내
export async function openDirections(target) {
  const dest = destParam(target);
  if (!dest) return false;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

// 지도 보기: 목적지 위치를 지도에 표시
export async function openInMaps(target) {
  const q = destParam(target);
  if (!q) return false;
  const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
