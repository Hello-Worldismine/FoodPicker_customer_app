import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { colors } from '../theme';

const HTML = `<!DOCTYPE html>
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
<script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
<script>
function initPostcode() {
  if (!window.daum || !daum.Postcode) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'script_load_failed' }));
    return;
  }
  new daum.Postcode({
    oncomplete: function(data) {
      var address = data.roadAddress || data.address;
      window.ReactNativeWebView.postMessage(JSON.stringify({ address: address }));
    },
    width: '100%',
    height: '100%',
  }).embed(document.body);
}
window.onload = initPostcode;
</script>
</body>
</html>`;

export default function DaumPostcodeModal({ visible, onClose, onSelect }) {
  function handleMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.address) {
        onSelect(data.address);
        onClose();
      }
    } catch (e) {}
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>주소 검색</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color={colors.charcoalBlack} size={22} />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ html: HTML, baseUrl: 'https://postcode.map.daum.net' }}
          onMessage={handleMessage}
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
