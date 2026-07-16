// 기기 GPS 위치 헬퍼 (expo-location). Expo Go 에서 동작.
import * as Location from 'expo-location';

// 현재 좌표 반환. 권한 거부/실패 시 null.
export async function getCurrentCoords() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

// 좌표 → 한국식 주소 문자열. 실패 시 null.
export async function reverseGeocode(lat, lng) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!results || !results.length) return null;
    const r = results[0];
    const parts = [r.region, r.city, r.district, r.street, r.streetNumber, r.name]
      .filter(Boolean);
    // 중복 토큰 제거(예: name 이 street 와 같은 경우)
    const seen = new Set();
    const dedup = parts.filter(p => (seen.has(p) ? false : (seen.add(p), true)));
    return dedup.join(' ') || null;
  } catch {
    return null;
  }
}
