import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { colors } from '../theme';
import { EASY_PAY_LABEL } from '../lib/format';

// 토스페이먼츠 결제창(v2 표준 SDK) WebView 모달.
// 결제 결과는 successUrl/failUrl 리다이렉트를 onShouldStartLoadWithRequest 로 가로채 수신한다.
// (모바일 웹뷰에서는 Promise 방식으로 결과를 받을 수 없음 — 토스 공식 웹뷰 가이드)
const SUCCESS_URL = 'https://foodpicker.app/toss/success';
const FAIL_URL = 'https://foodpicker.app/toss/fail';

// 리다이렉트 URL 쿼리 파싱: 성공 {paymentKey, orderId, amount} / 실패 {code, message, orderId}
function parseQuery(url) {
  const params = {};
  const qs = url.split('#')[0].split('?')[1];
  if (!qs) return params;
  qs.split('&').forEach(pair => {
    const i = pair.indexOf('=');
    if (i < 0) return;
    try {
      params[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
    } catch (e) {}
  });
  return params;
}

// 안드로이드 intent:// URL → 앱스킴 URL (intent://path#Intent;scheme=foo;...;end → foo://path)
function intentToScheme(url) {
  const scheme = (url.match(/scheme=([^;]+)/) || [])[1];
  if (!scheme) return null;
  return `${scheme}://${url.replace(/^intent:\/\//, '').split('#Intent')[0]}`;
}

// 인라인 <script> 에 값을 안전하게 주입 — JSON.stringify 만으로는 '</script>' 가
// 이스케이프되지 않아 스크립트 블록 브레이크아웃(주입)이 가능하므로 '<' 를 유니코드로 치환.
function jsStr(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// 토스 v2 결제창 method 화이트리스트.
// 'CARD' 는 "카드/간편결제 통합결제창"이다(공식 문서: method 를 CARD 로 설정하면
// 카드와 간편결제를 한 결제창에서 선택). 이 앱은 카드+간편결제만 취급하므로 CARD 만 허용하고,
// 계좌이체/가상계좌(TRANSFER/VIRTUAL_ACCOUNT)는 입금 지연·웹훅 처리가 없어 넣지 않는다.
// 모르는 값이 들어오면 조용히 CARD 로 되돌린다 — 결제창이 아예 안 열리는 것보다 안전.
const ALLOWED_METHODS = ['CARD'];

// 특정 간편결제사를 바로 열기: card.flowMode='DIRECT' + card.easyPay=<간편결제사 코드>.
// (flowMode DEFAULT = 통합결제창 / DIRECT = 지정한 간편결제 앱의 전용 창)
function normalizeEasyPay(code) {
  return code && Object.prototype.hasOwnProperty.call(EASY_PAY_LABEL, code) ? code : null;
}

function buildHtml({ clientKey, customerKey, amount, orderId, orderName, method, easyPay }) {
  const payMethod = ALLOWED_METHODS.includes(method) ? method : 'CARD';
  const provider = normalizeEasyPay(easyPay);
  // 간편결제사를 지정하지 않으면 DEFAULT(통합결제창) — 사용자가 창에서 카드/간편결제를 고른다.
  const cardOption = {
    useEscrow: false,
    flowMode: provider ? 'DIRECT' : 'DEFAULT',
    useCardPoint: false,
    useAppCardOnly: false,
    ...(provider ? { easyPay: provider } : {}),
  };
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body { background: #fff; }
</style>
</head>
<body>
<script src="https://js.tosspayments.com/v2/standard"></script>
<script>
function post(data) {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(data));
}
function startPayment() {
  if (!window.TossPayments) {
    post({ error: 'SCRIPT_LOAD_FAILED' });
    return;
  }
  try {
    var tossPayments = TossPayments(${jsStr(clientKey)});
    var payment = tossPayments.payment({ customerKey: ${jsStr(customerKey)} });
    payment.requestPayment({
      method: ${jsStr(payMethod)},
      amount: { currency: 'KRW', value: ${jsStr(Number(amount))} },
      orderId: ${jsStr(orderId)},
      orderName: ${jsStr(orderName)},
      successUrl: ${jsStr(SUCCESS_URL)},
      failUrl: ${jsStr(FAIL_URL)},
      card: ${jsStr(cardOption)},
    }).catch(function (e) {
      post({ error: (e && e.code) || 'PAYMENT_ERROR', message: e && e.message });
    });
  } catch (e) {
    post({ error: 'PAYMENT_ERROR', message: e && e.message });
  }
}
window.onload = startPayment;
</script>
</body>
</html>`;
}

// method: 토스 v2 결제창 결제수단(기본 'CARD' = 카드/간편결제 통합결제창)
// easyPay: 간편결제사 코드('TOSSPAY' 등). 지정하면 해당 간편결제 창이 바로 열린다.
export default function TossPaymentModal({
  visible, onClose, clientKey, customerKey, amount, orderId, orderName,
  method = 'CARD', easyPay = null, onSuccess, onFail,
}) {
  const html = useMemo(
    () => buildHtml({ clientKey, customerKey, amount, orderId, orderName, method, easyPay }),
    [clientKey, customerKey, amount, orderId, orderName, method, easyPay],
  );
  // 결과 이중 발화 가드 — 리다이렉트/메시지가 중복 도착해도 콜백은 세션당 1회만.
  const firedRef = React.useRef(false);
  React.useEffect(() => { if (visible) firedRef.current = false; }, [visible, orderId]);
  function fireOnce(fn) {
    if (firedRef.current) return;
    firedRef.current = true;
    fn();
  }

  // SDK 스크립트 로드 실패 / requestPayment 자체 실패(리다이렉트 이전 오류)
  function handleMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) {
        const msg = data.error === 'SCRIPT_LOAD_FAILED'
          ? '결제 모듈을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'
          : (data.message || '결제 요청 중 오류가 발생했습니다.');
        fireOnce(() => onFail && onFail(msg, data.error));
      }
    } catch (e) {}
  }

  function handleShouldStartLoad(request) {
    const url = request.url || '';

    // 결제 성공 리다이렉트: ?paymentKey=...&orderId=...&amount=...
    if (url.startsWith(SUCCESS_URL)) {
      const q = parseQuery(url);
      fireOnce(() => onSuccess && onSuccess({ paymentKey: q.paymentKey, orderId: q.orderId, amount: Number(q.amount) }));
      return false;
    }
    // 결제 실패 리다이렉트: ?code=...&message=...&orderId=...
    if (url.startsWith(FAIL_URL)) {
      const q = parseQuery(url);
      fireOnce(() => onFail && onFail(q.message || '결제에 실패했습니다.', q.code));
      return false;
    }
    // 카드사/은행 앱 등 외부 스킴 → 외부 앱 실행 시도(실패는 무시), 웹뷰 로드는 차단
    if (!/^https?:\/\//.test(url)) {
      const target = url.startsWith('intent:') ? (intentToScheme(url) || url) : url;
      Linking.openURL(target).catch(() => {});
      return false;
    }
    return true;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>결제하기</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color={colors.charcoalBlack} size={22} />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ html, baseUrl: 'https://foodpicker.app' }}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primaryGreen} />
            </View>
          )}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  closeBtn: { padding: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
