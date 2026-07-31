// 네이버 지도(Web Dynamic Map) — WebView 로 렌더. 시크릿 불필요(도메인 제한 방식).
//
// [주의] CLIENT_ID 는 빌드 타임에 인라인된다. 로컬(expo start)은 .env 를, EAS 빌드는 eas.json 의
//        env 를 읽으므로 두 값이 다르면 "로컬만 지도가 뜨는" 현상이 생긴다.
//        인증에 실패하면 지도 타일도 마커도 하나도 안 나오므로, 아래 authfail 오버레이에
//        실제 사용된 키를 그대로 노출해 설치본 스크린샷만으로 판별할 수 있게 해 둔다.
import React, { useState, useMemo, useRef, useEffect } from 'react';
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

      // 매장 칩 스타일. 색은 theme.js(primaryGreen/warmOrange)와 반드시 일치시킨다.
      // soldout 은 채운 회색 대신 '흰 배경 + 회색 테두리' 아웃라인 칩으로 그려
      // 존재감은 남기되 판매중 칩과 확실히 구분되게 한다.
      var MARKER_BASE = 'padding:4px 9px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer;';
      var STATUS_STYLE = {
        selling: 'background:#22A06B;color:#fff;border:1.5px solid #22A06B;box-shadow:0 2px 6px rgba(0,0,0,0.25);',
        closing: 'background:#FF8A3D;color:#fff;border:1.5px solid #FF8A3D;box-shadow:0 2px 6px rgba(0,0,0,0.25);',
        soldout: 'background:#fff;color:#6B7280;border:1.5px solid #D1D5DB;box-shadow:0 1px 4px rgba(0,0,0,0.15);opacity:0.9;'
      };

      // 내 위치 도트. 매장 칩(사각 라운드 라벨)과 형태 자체가 달라 범례 없이도 구분된다.
      var MY_LOC_DOT = '<div style="width:16px;height:16px;border-radius:50%;background:#2D7FF9;border:3px solid #fff;box-shadow:0 0 0 8px rgba(45,127,249,.16), 0 1px 4px rgba(0,0,0,.35)"></div>';

      // 매장명은 판매자 자유입력이다. 이스케이프하지 않으면 < 나 " 하나로 마커 HTML 이 깨져
      // 그 핀이 통째로 사라진다.
      var ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
      function esc(s){
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ESC_MAP[c]; });
      }

      // 지도 생성 전에 __fpSetMyLoc 이 먼저 불릴 수 있으므로 좌표만 보관해 두고
      // 지도가 준비되면 그때 그린다(injectJavaScript 타이밍 방어).
      var MAP = null;
      var MY_LOC = null;
      var MY_LOC_MARKER = null;

      function renderMyLoc(){
        if (!MAP || !MY_LOC) return;
        var pos = new naver.maps.LatLng(MY_LOC.lat, MY_LOC.lng);
        if (MY_LOC_MARKER) { MY_LOC_MARKER.setPosition(pos); return; }
        MY_LOC_MARKER = new naver.maps.Marker({
          position: pos,
          map: MAP,
          clickable: false,   // 매장 마커 탭을 가로채지 않게
          zIndex: 200,
          icon: { content: MY_LOC_DOT, anchor: new naver.maps.Point(8, 8) }
        });
      }

      // RN 에서 injectJavaScript 로 호출되는 진입점.
      // myLocation 을 HTML 에 박지 않는 이유: html 이 바뀌면 WebView 가 통째로 리로드돼 깜빡인다.
      window.__fpSetMyLoc = function(lat, lng){
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        MY_LOC = { lat: lat, lng: lng };
        try { renderMyLoc(); } catch (e) { post('error:' + (e && e.message)); }
      };
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
          var style = STATUS_STYLE[m.status] || STATUS_STYLE.selling;
          var label = (m.title || '').split(' ')[0] || '';
          new naver.maps.Marker({
            position: new naver.maps.LatLng(m.lat, m.lng),
            map: map,
            // title 은 SDK 가 DOM 속성으로 직접 넣으므로 이스케이프하면 &amp; 가 그대로 보인다. 원문 유지.
            title: m.title,
            icon: {
              content: '<div onclick="event.stopPropagation(); markerJustClicked=true; post(&apos;marker:' + i + '&apos;); setTimeout(function(){markerJustClicked=false;},300);" style="' + MARKER_BASE + style + '">' + esc(label) + '</div>',
              anchor: new naver.maps.Point(0, 20)
            }
          });
        });
        MAP = map;
        renderMyLoc();   // 지도 준비 전에 들어온 내 위치가 있으면 지금 그린다
        post('ready');
      } catch (e) { post('error:' + (e && e.message)); }
    </script>
  </body></html>`;
}

export default function NaverMap({
  lat, lng, zoom = 16, markers, interactive = true, style, onMarkerPress, onMapPress,
  myLocation,
}) {
  const [status, setStatus] = useState('loading');
  // html 이 바뀌면 WebView 가 새로 로드되어 내 위치 마커가 사라진다.
  // ready 가 올 때마다 증가시켜 아래 useEffect 가 다시 주입하게 만드는 카운터.
  const [readySeq, setReadySeq] = useState(0);
  const webRef = useRef(null);

  // markers가 명시적으로 전달되면 그대로 사용, undefined면 중심 좌표에 단일 마커
  const pts = markers !== undefined ? markers : (lat != null && lng != null ? [{ lat, lng }] : []);
  const html = useMemo(
    () => buildHtml({ lat, lng, zoom, markers: pts, interactive }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lng, zoom, JSON.stringify(pts), interactive],
  );

  const myLat = myLocation?.lat;
  const myLng = myLocation?.lng;
  // 내 위치는 html 재생성(=WebView 리로드) 없이 주입으로만 갱신한다.
  useEffect(() => {
    if (!webRef.current || readySeq === 0) return;
    if (myLat == null || myLng == null) return;
    webRef.current.injectJavaScript(
      `window.__fpSetMyLoc(${Number(myLat)}, ${Number(myLng)}); true;`
    );
  }, [myLat, myLng, readySeq]);

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
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: NAVER_WEB_SERVICE_URL }}
        style={styles.web}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          const msg = e.nativeEvent.data || '';
          if (msg === 'ready') { setStatus('ready'); setReadySeq(n => n + 1); }
          else if (msg === 'authfail') {
            // 원격 진단용 — 어느 키로 실패했는지 로그에도 남긴다.
            console.warn('[NaverMap] 인증 실패(authfail) / 키:', CLIENT_ID, '/ baseUrl:', NAVER_WEB_SERVICE_URL);
            setStatus('authfail');
          }
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
              ? `네이버 지도 인증 실패\n키: ${CLIENT_ID}\nNCP Web 서비스 URL·키를 확인해주세요`
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
