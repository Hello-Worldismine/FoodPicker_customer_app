// 네이버 지도(Web Dynamic Map) — WebView 로 렌더. 시크릿 불필요(도메인 제한 방식).
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

const CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;
export const NAVER_WEB_SERVICE_URL = 'https://foodpicker.app';

function buildHtml({ lat, lng, zoom, markers, interactive }) {
  const markersJson = JSON.stringify((markers || []).map(m => ({
    lat: m.lat,
    lng: m.lng,
    title: m.title || '',
    status: m.status || 'selling',
  })));

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
    <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>
  </head><body>
    <div id="map"></div>
    <script>
      function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m); }
      window.navermap_authFailure = function(){ post('authfail'); };
      var MARKERS = ${markersJson};
      var STATUS_COLOR = { selling: '#22A06B', closing: '#F97316', soldout: '#9CA3AF' };
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
        var markerJustClicked = false;
        naver.maps.Event.addListener(map, 'click', function(){ if (!markerJustClicked) post('tap'); });
        MARKERS.forEach(function(m, i) {
          var color = STATUS_COLOR[m.status] || '#22A06B';
          var label = (m.title || '').split(' ')[0] || '';
          new naver.maps.Marker({
            position: new naver.maps.LatLng(m.lat, m.lng),
            map: map,
            title: m.title,
            icon: {
              content: '<div onclick="markerJustClicked=true; post(\'marker:' + i + '\'); setTimeout(function(){markerJustClicked=false;},300);" style="background:' + color + ';color:#fff;padding:4px 9px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer">' + label + '</div>',
              anchor: new naver.maps.Point(0, 20)
            }
          });
        });
        post('ready');
      } catch (e) { post('error:' + (e && e.message)); }
    </script>
  </body></html>`;
}

export default function NaverMap({
  lat, lng, zoom = 16, markers, interactive = true, style, onMarkerPress, onMapPress,
}) {
  const [status, setStatus] = useState('loading');
  // markers가 명시적으로 전달되면 그대로 사용, undefined면 중심 좌표에 단일 마커
  const pts = markers !== undefined ? markers : (lat != null && lng != null ? [{ lat, lng }] : []);
  const html = useMemo(
    () => buildHtml({ lat, lng, zoom, markers: pts, interactive }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lng, zoom, JSON.stringify(pts), interactive],
  );

  if (!CLIENT_ID || lat == null || lng == null) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>
          {!CLIENT_ID
            ? '지도 설정이 필요합니다\n(.env EXPO_PUBLIC_NAVER_MAP_CLIENT_ID)'
            : '위치 정보가 없습니다'}
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
        nestedScrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          const msg = e.nativeEvent.data || '';
          if (msg === 'ready') setStatus('ready');
          else if (msg === 'authfail') setStatus('authfail');
          else if (msg === 'tap' && onMapPress) onMapPress();
          else if (msg.startsWith('marker:') && onMarkerPress) onMarkerPress(parseInt(msg.slice(7), 10));
          else if (msg.startsWith('error:')) { console.warn('[NaverMap]', msg); setStatus('error'); }
        }}
      />
      {status === 'loading' && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
      {(status === 'authfail' || status === 'error') && (
        <View style={styles.overlay}>
          <Text style={styles.fallbackText}>
            {status === 'authfail'
              ? '네이버 지도 인증 실패\n(NCP에 Web 서비스 URL 등록 필요)'
              : '지도를 불러오지 못했습니다'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#E8F4E8' },
  web: { ...StyleSheet.absoluteFillObject },
  fallback: { backgroundColor: '#E8F4E8', alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,244,232,0.85)',
  },
  fallbackText: { fontSize: 12, color: '#5A7A5A', fontWeight: '600', textAlign: 'center', lineHeight: 18 },
});
