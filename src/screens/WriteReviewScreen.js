import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, Camera, X, CheckCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';

const MAX_PHOTOS = 5;
const MIN_TEXT = 10;
const MAX_TEXT = 300;

const LABELS = ['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요!'];

function StarSelector({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={ss.starsRow}>
        {[1,2,3,4,5].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} style={{ padding: 4 }}>
            <Star size={38} color={n <= display ? '#FBBF24' : '#D1D5DB'}
              fill={n <= display ? '#FBBF24' : 'none'} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[ss.ratingLabel, value > 0 && { color: '#FBBF24' }]}>
        {LABELS[display] || '별점을 선택해주세요'}
      </Text>
    </View>
  );
}
const ss = StyleSheet.create({
  starsRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  ratingLabel: { fontSize: 14, fontWeight: '700', color: colors.mediumGray, minHeight: 20 },
});

function SuccessView({ onBack }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <View style={sv.iconWrap}>
        <CheckCircle size={42} color={colors.primaryGreen} />
      </View>
      <Text style={sv.title}>리뷰가 등록되었어요!</Text>
      <Text style={sv.sub}>소중한 리뷰 감사합니다.{'\n'}사장님과 다른 고객들에게 도움이 돼요 🙌</Text>
      <TouchableOpacity onPress={onBack} style={sv.btn}>
        <Text style={sv.btnText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
}
const sv = StyleSheet.create({
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '900', color: colors.charcoalBlack, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.mediumGray, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  btn: { width: '100%', backgroundColor: colors.primaryGreen, borderRadius: 14, padding: 15, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});

export default function WriteReviewScreen({ navigation, route }) {
  const { order } = route.params;
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = rating > 0 && text.trim().length >= MIN_TEXT;

  async function handlePickPhoto() {
    // TODO: 선택된 이미지를 S3(또는 Firebase Storage)에 업로드 후 URL을 저장하세요.
    //   POST /api/uploads  body: FormData(image file) → 응답: { url: '...' }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const remaining = MAX_PHOTOS - photos.length;
      const toAdd = result.assets.slice(0, remaining).map(a => ({ id: `${Date.now()}-${Math.random()}`, uri: a.uri }));
      setPhotos(prev => [...prev, ...toAdd]);
    }
  }

  function removePhoto(id) {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.charcoalBlack} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>리뷰 쓰기</Text>
        </View>
        <SuccessView onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.charcoalBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리뷰 쓰기</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 주문 요약 */}
        <View style={styles.card}>
          <View style={styles.orderSummary}>
            <View style={styles.orderIcon}>
              <Text style={{ fontSize: 22 }}>🛍️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderName} numberOfLines={1}>{order?.productName}</Text>
              <Text style={styles.orderMeta}>{order?.store} · {order?.pickupTime}</Text>
            </View>
          </View>
        </View>

        {/* 별점 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>이번 주문은 어떠셨나요?</Text>
          <StarSelector value={rating} onChange={setRating} />
        </View>

        {/* 사진 */}
        <View style={styles.card}>
          <View style={styles.photoHeader}>
            <Text style={styles.cardTitle2}>사진 첨부</Text>
            <Text style={styles.photoCount}>{photos.length}/{MAX_PHOTOS}</Text>
          </View>
          <View style={styles.photoList}>
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity onPress={handlePickPhoto} style={styles.addPhotoBtn}>
                <Camera size={20} color={colors.mediumGray} />
                <Text style={styles.addPhotoText}>사진 추가</Text>
              </TouchableOpacity>
            )}
            {photos.map(p => (
              <View key={p.id} style={styles.photoThumb}>
                <TouchableOpacity onPress={() => removePhoto(p.id)} style={styles.removePhotoBtn}>
                  <X size={11} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={styles.photoGuide}>최대 {MAX_PHOTOS}장까지 첨부 가능합니다. 음식 사진을 올려주세요 📸</Text>
        </View>

        {/* 리뷰 텍스트 */}
        <View style={styles.card}>
          <View style={styles.textHeader}>
            <Text style={styles.cardTitle2}>리뷰 작성</Text>
            <Text style={[styles.textCount, text.length >= MIN_TEXT && { color: colors.primaryGreen, fontWeight: '700' }]}>
              {text.length}/{MAX_TEXT}
            </Text>
          </View>
          <TextInput
            value={text}
            onChangeText={v => setText(v.slice(0, MAX_TEXT))}
            placeholder={`음식 맛, 포장 상태, 픽업 경험 등을 자유롭게 작성해주세요.\n(최소 ${MIN_TEXT}자)`}
            multiline
            numberOfLines={5}
            style={[
              styles.textarea,
              text.length > 0 && text.length < MIN_TEXT && { borderColor: colors.alertRed },
            ]}
            textAlignVertical="top"
          />
          {text.length > 0 && text.length < MIN_TEXT && (
            <Text style={styles.textError}>
              최소 {MIN_TEXT}자 이상 작성해주세요. ({MIN_TEXT - text.length}자 더 필요)
            </Text>
          )}
        </View>

        {/* 제출 */}
        {/* TODO: 리뷰 등록 → POST /api/reviews
              body: { orderId: order.id, rating, text, photoUrls: photos.map(p => p.url) }
              성공 시 setSubmitted(true) 호출 */}
        <TouchableOpacity
          onPress={() => canSubmit && setSubmitted(true)}
          style={[styles.submitBtn, !canSubmit && styles.submitBtnOff]}
        >
          <Text style={styles.submitBtnText}>리뷰 등록하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.softGray },
  header: {
    backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.softGray,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.charcoalBlack },
  content: { padding: 8, paddingBottom: 40, gap: 8 },
  card: { backgroundColor: colors.white, marginHorizontal: 8, borderRadius: 14, padding: 16 },
  orderSummary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  orderIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: colors.freshMint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  orderName: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack },
  orderMeta: { fontSize: 12, color: colors.mediumGray, marginTop: 3 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack, textAlign: 'center', marginBottom: 16 },
  cardTitle2: { fontSize: 15, fontWeight: '800', color: colors.charcoalBlack },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  photoCount: { fontSize: 12, color: colors.mediumGray },
  photoList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  addPhotoBtn: {
    width: 72, height: 72, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.mediumGray,
    borderRadius: 10, backgroundColor: colors.softGray,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 10, color: colors.mediumGray },
  photoThumb: {
    width: 72, height: 72, backgroundColor: colors.softGray, borderRadius: 10, position: 'relative',
  },
  removePhotoBtn: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.charcoalBlack, alignItems: 'center', justifyContent: 'center',
  },
  photoGuide: { fontSize: 11, color: colors.mediumGray, marginTop: 4 },
  textHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  textCount: { fontSize: 12, color: colors.mediumGray },
  textarea: {
    backgroundColor: colors.softGray, borderWidth: 1.5, borderColor: colors.softGray,
    borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 22, color: colors.charcoalBlack,
    minHeight: 120,
  },
  textError: { fontSize: 12, color: colors.alertRed, marginTop: 6 },
  submitBtn: {
    marginHorizontal: 8, backgroundColor: colors.primaryGreen, borderRadius: 14, padding: 15, alignItems: 'center',
  },
  submitBtnOff: { backgroundColor: '#C8CDD3' },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
