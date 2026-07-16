// 네이버 지도(Web Dynamic Map) — WebView 로 렌더. 시크릿 불필요(도메인 제한 방식).
// NCP 콘솔에서 이 애플리케이션에 'Web Dynamic Map' 구독 + 아래 WEB_SERVICE_URL 을 Web 서비스 URL 로 등록해야 인증됨.
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

const CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;
// NCP 콘솔 > 애플리케이션 > Web 서비스 URL 에 등록할 값(WebView referer).
export const NAVER_WEB_SERVICE_URL = 'https://foodpicker.app';

function buildHtml({ lat, lng, zoom, markers, interactive }) {
  const markerJs = (markers || [])
    .map((m, i) => `
      (function(){
        var mk = new naver.maps.Marker({
          position: new naver.maps.LatLng(${m.lat}, ${m.lng}),
          map: map,
          title: ${JSON.stringify(m.title || '')}
        });
        naver.maps.Event.addListener(mk, 'click', function(){ post('marker:' + ${i}); });
      })();`)
    .join('\n');

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
    <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>
  </head><body>
    <div id="map"></div>
    <script>
      function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m); }
      window.navermap_authFailure = function(){ post('authfail'); };
    </script>
    <script src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${CLIENT_ID}"></script>
    <script>
      try {
        var map = new naver.maps.Map('map', {
          center: new naver.maps.LatLng(${lat}, ${lng}),
          zoom: ${zoom},
          draggable: ${!!interactive},
          pinchZoom: ${!!interactive},
          scrollWheel: ${!!interactive},
          disableDoubleTapZoom: ${!interactive},
          disableTwoFingerTapZoom: ${!interactive}
        });
        ${markerJs}
        post('ready');
      } catch (e) { post('error:' + (e && e.message)); }
    </script>
  </body></html>`;
}

export default function NaverMap({
  lat, lng, zoom = 16, markers, interactive = true, style, onMarkerPress,
}) {
  const [status, setStatus] = useState('loading'); // loading | ready | authfail | error
  const pts = markers && markers.length ? markers : (lat != null && lng != null ? [{ lat, lng }] : []);
  const html = useMemo(
    () => buildHtml({ lat, lng, zoom, markers: pts, interactive }),
    [lat, lng, zoom, JSON.stringify(pts), interactive],
  );

  if (!CLIENT_ID || lat == null || lng == null) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>
          {!CLIENT_ID ? '지도 설정이 필요합니다' : '위치 정보가 없습니다'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: NAVER_WEB_SERVICE_URL }}
        style={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          const msg = e.nativeEvent.data || '';
          if (msg === 'ready') setStatus('ready');
          else if (msg === 'authfail') setStatus('authfail');
          else if (msg.startsWith('marker:') && onMarkerPress) onMarkerPress(parseInt(msg.slice(7), 10));
          else if (msg.startsWith('error:')) setStatus('error');
        }}
      />
      {status === 'loading' && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.primaryGreen} />
        </View>
      )}
      {status === 'authfail' && (
        <View style={styles.overlay}>
          <Text style={styles.fallbackText}>네이버 지도 인증 실패{'\n'}(NCP에 Web 서비스 URL 등록 필요)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#E8F4E8' },
  web: { flex: 1, backgroundColor: 'transparent' },
  fallback: { backgroundColor: '#E8F4E8', alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,244,232,0.85)',
  },
  fallbackText: { fontSize: 12, color: '#5A7A5A', fontWeight: '600', textAlign: 'center', lineHeight: 18 },
});
