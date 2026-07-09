# FoodPicker 고객 앱 (Customer App)

## 개요

FoodPicker 고객용 모바일 앱입니다. 고객이 마감 임박 식품 상품을 탐색하고, 픽업 예약 주문을 진행하며, 주문 내역 확인 및 리뷰 작성 등을 할 수 있는 기능을 제공합니다.

**현재 코드는 프론트엔드 프로토타입입니다.**  
모든 데이터는 `src/data/mockData.js`의 Mock 데이터로 동작하며, 백엔드 연동 시 `// TODO:` 주석이 달린 위치를 실제 API 호출로 교체하면 됩니다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Expo SDK 54 / React Native 0.81 |
| 네비게이션 | React Navigation 7 (Stack + Bottom Tab) |
| 상태 관리 | React Context API (`src/context/AppContext.js`) |
| 아이콘 | lucide-react-native |
| 이미지 선택 | expo-image-picker (리뷰 사진 첨부) |
| 안전 영역 | react-native-safe-area-context |

---

## 화면 구성

### 하단 탭 네비게이션 (Main Tabs)

| 파일 | 탭 이름 | 주요 기능 |
|------|---------|-----------|
| `src/screens/HomeScreen.js` | 홈 | 배너 광고 자동 롤링, 카테고리 필터, 내 주변 매장 목록, 마감임박 상품, 새로 등록된 상품 |
| `src/screens/MapScreen.js` | 지도 | 의사 지도(pseudo-map) 위 매장 핀 표시, 카테고리·할인·마감임박 필터, 매장 클러스터링, 미니 카드 |
| `src/screens/LikedScreen.js` | 찜 | 찜한 상품 목록, 가격 알림 설정 |
| `src/screens/OrderHistoryScreen.js` | 주문내역 | 주문 목록 (예약중/픽업완료/취소 탭), QR 코드 표시, 주문 취소 |
| `src/screens/MyPageScreen.js` | 마이 | 프로필, 환경 기여 통계, 메뉴 목록, 로그아웃/탈퇴 |

### 스택 화면 (Stack Screens)

| 파일 | 화면 이름 | 진입 경로 | 주요 기능 |
|------|----------|-----------|-----------|
| `src/screens/ProductDetailScreen.js` | 상품 상세 | 홈·검색·카테고리 > 상품 카드 | 상품 정보, 수량 선택, 가격 히스토리, 아코디언 상세 정보, 예약 버튼 |
| `src/screens/StoreScreen.js` | 매장 상세 | 홈 > 매장 카드 / 상품 상세 > 가게명 | 매장 정보·판매 상품 탭, 관심 매장 토글, 리뷰 진입 |
| `src/screens/OrderScreen.js` | 주문/결제 | 상품 상세 > 예약하기 | 주문 상품 확인, 픽업 정보, 쿠폰 선택, 결제 수단 선택, 필수 확인 |
| `src/screens/OrderCompleteScreen.js` | 주문 완료 | 주문/결제 > 결제하기 | 주문 성공 메시지, QR 코드 자리, 픽업 안내 |
| `src/screens/ReviewScreen.js` | 리뷰 목록 | 매장 상세 > 리뷰 | 별점 분포, 사장님 공지, 리뷰 목록 (정렬 가능) |
| `src/screens/WriteReviewScreen.js` | 리뷰 작성 | 주문내역 (픽업완료) > 리뷰 작성 | 별점 선택, 사진 첨부(최대 5장), 텍스트 입력 (최소 10자) |
| `src/screens/SearchScreen.js` | 검색 | 홈 > 검색창 | 상품·매장 통합 검색, 필터(거리·가격·할인율·카테고리), 정렬, 최근 검색어 |
| `src/screens/CategoryProductsScreen.js` | 카테고리 상품 | 홈 > 카테고리 칩 | 카테고리별 상품 목록, 정렬 |
| `src/screens/CouponScreen.js` | 쿠폰함 | 마이 > 쿠폰함 | 보유 쿠폰 목록, 쿠폰 코드 등록, 사용 완료 내역 |
| `src/screens/MyOrderListScreen.js` | 전체 주문내역 | 마이 > 주문내역 | 전체 주문 목록 (무한 스크롤, 상대시간 표시) |
| `src/screens/LikedStoresScreen.js` | 관심 매장 | 마이 > 관심 매장 | 관심 등록한 매장 목록 |
| `src/screens/AddressScreen.js` | 주소 설정 | 홈 > 주소 버튼 | 주소 검색·선택, 현재 주소 변경, 주소 추가 |
| `src/screens/AddressEditScreen.js` | 주소 편집 | 주소 설정 > 편집 버튼 | 저장된 주소 목록 관리, 수정·삭제 |
| `src/screens/AddressDetailScreen.js` | 주소 상세 | 주소 편집 > 수정 | 주소 변경 검색, 장소 이름 설정 |
| `src/screens/NotificationScreen.js` | 알림 | 홈 > 벨 아이콘 | 알림 목록 |
| `src/screens/PaymentMethodScreen.js` | 결제수단 관리 | 마이 > 결제수단 관리 | 등록된 결제수단 조회 |
| `src/screens/NotificationSettingsScreen.js` | 알림 설정 | 마이 > 알림 설정 | 알림 종류별 on/off |
| `src/screens/SupportScreen.js` | 고객센터 | 마이 > 고객센터 | 전화·채팅·이메일 문의, 전화번호: 1800-8018 |
| `src/screens/FAQScreen.js` | 자주 묻는 질문 | 마이 > 자주 묻는 질문 | FAQ 아코디언 목록 |
| `src/screens/TermsScreen.js` | 약관 | 마이 > 약관 | 이용약관·개인정보처리방침 |

---

## 상태 관리 (`src/context/AppContext.js`)

앱의 모든 전역 데이터와 비즈니스 로직이 집중된 파일입니다. 백엔드 연동 시 이 파일을 우선적으로 수정합니다.

### Mock 데이터 → API 교체 대상

| 상태 변수 | 설명 | 교체 API |
|----------|------|---------|
| `productList` | 전체 상품 목록 (좋아요 포함) | `GET /api/products` |
| `orders` | 주문 내역 | `GET /api/orders` |
| `coupons` | 보유 쿠폰 목록 | `GET /api/coupons?available=true` |
| `likedStores` | 관심 매장 ID 목록 | `GET /api/users/me/liked-stores` |
| `addresses` | 저장된 주소 목록 | `GET /api/users/me/addresses` |
| `currentAddressId` | 현재 선택된 주소 | `GET /api/users/me/addresses/current` |

### Context 제공 함수 → API 호출로 교체

| 함수 | 설명 | 교체 API |
|------|------|---------|
| `handleLike(productId)` | 상품 좋아요 토글 | `POST /api/products/:id/like` |
| `handleStoreLike(storeId)` | 관심 매장 토글 | `POST /api/stores/:id/like` |
| `handleSelectAddress(id)` | 현재 주소 변경 | `PATCH /api/users/me/addresses/current` |
| `handleAddAddress(addr)` | 주소 추가 | `POST /api/users/me/addresses` |
| `handleUpdateAddress(addr)` | 주소 수정 | `PUT /api/users/me/addresses/:id` |
| `handleDeleteAddress(id)` | 주소 삭제 | `DELETE /api/users/me/addresses/:id` |
| `handleOrderComplete(order)` | 주문 완료 후 목록 갱신 | `GET /api/orders` 재호출 |
| `handleCancelOrder(orderId)` | 주문 취소 | `POST /api/orders/:id/cancel` |

---

## 네비게이션 구조 (`src/navigation/AppNavigator.js`)

```
RootNavigator (Stack)
├── MainTabs (BottomTab)
│   ├── Home              → src/screens/HomeScreen.js
│   ├── Map               → src/screens/MapScreen.js
│   ├── Liked             → src/screens/LikedScreen.js
│   ├── Orders            → src/screens/OrderHistoryScreen.js
│   └── MyPage            → src/screens/MyPageScreen.js
├── ProductDetail         → src/screens/ProductDetailScreen.js    (params: { productId })
├── Store                 → src/screens/StoreScreen.js            (params: { storeId })
├── Order                 → src/screens/OrderScreen.js            (params: { productId, qty })
├── OrderComplete         → src/screens/OrderCompleteScreen.js    (params: { order })
├── Review                → src/screens/ReviewScreen.js           (params: { store })
├── WriteReview           → src/screens/WriteReviewScreen.js      (params: { order })
├── Notifications         → src/screens/NotificationScreen.js
├── Coupons               → src/screens/CouponScreen.js
├── MyOrders              → src/screens/MyOrderListScreen.js
├── Terms                 → src/screens/TermsScreen.js
├── Search                → src/screens/SearchScreen.js
├── CategoryProducts      → src/screens/CategoryProductsScreen.js (params: { category })
├── LikedStores           → src/screens/LikedStoresScreen.js
├── Address               → src/screens/AddressScreen.js
├── AddressEdit           → src/screens/AddressEditScreen.js
├── AddressDetail         → src/screens/AddressDetailScreen.js    (params: { address })
├── PaymentMethod         → src/screens/PaymentMethodScreen.js
├── NotificationSettings  → src/screens/NotificationSettingsScreen.js
├── Support               → src/screens/SupportScreen.js
└── FAQ                   → src/screens/FAQScreen.js
```

---

## 공통 컴포넌트

### `src/components/ListProductCard.js`

찜 화면, 검색 결과, 카테고리 상품 목록, 매장 상세에서 공통으로 사용하는 상품 카드 컴포넌트입니다.

| Props | 설명 |
|-------|------|
| `product` | 상품 객체 |
| `onPress(product)` | 카드 클릭 핸들러 |
| `onLike(productId)` | 좋아요 버튼 핸들러 |
| `onStorePress(storeId)` | 가게명 클릭 핸들러 |
| `alertPrice` | 현재 설정된 가격 알림 목표가 (찜 화면) |
| `onAlertPress()` | 가격 알림 버튼 핸들러 (찜 화면) |

- `onAlertPress`가 전달되면 하트+벨 버튼 표시 (찜 화면)
- `onAlertPress`가 없으면 하트만 표시 (검색/카테고리)

---

## Mock 데이터 구조 (`src/data/mockData.js`)

### products

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | number | 상품 ID |
| `name` | string | 상품명 |
| `store` | string | 매장명 |
| `storeId` | number | 매장 ID |
| `distance` | number | 현재 위치로부터 거리 (미터) |
| `image` | string | 상품 이미지 URL |
| `category` | string | 카테고리 (빵, 샐러드, 도시락 등) |
| `originalPrice` | number | 원가 |
| `salePrice` | number | 판매가 |
| `discountRate` | number | 할인율 (%) |
| `stock` | number | 남은 재고 |
| `pickupStart` | ISO string | 픽업 시작 시각 |
| `pickupEnd` | ISO string | 픽업 종료 시각 |
| `expiryDate` | ISO string | 소비기한 |
| `status` | string | 'selling' \| 'soldout' |
| `badges` | string[] | 뱃지 목록 (예: ['마감임박', '60% 할인']) |
| `liked` | boolean | 좋아요 여부 |
| `lat`, `lng` | number | 매장 위경도 |
| `pickupAddress` | string | 픽업 주소 |

### stores

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | number | 매장 ID |
| `name` | string | 매장명 |
| `image` | string | 매장 대표 이미지 URL |
| `category` | string | 대분류 카테고리 |
| `distance` | number | 거리 (미터) |
| `status` | string | 'selling' \| 'closing' \| 'soldout' |
| `rating` | number | 평균 별점 |
| `reviewCount` | number | 리뷰 수 |
| `pickupTime` | string | 픽업 가능 시간 표시 문자열 |
| `businessHours` | string | 영업시간 |
| `phone` | string | 전화번호 |
| `address` | string | 매장 주소 |
| `lat`, `lng` | number | 위경도 |

### mockCoupons

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 쿠폰 ID |
| `name` | string | 쿠폰명 |
| `discountType` | string | '정액' \| '정률' |
| `discountValue` | number | 할인 금액(원) 또는 할인율(%) |
| `minOrderAmount` | number | 최소 주문 금액 |
| `endDate` | string | 유효기간 (YYYY.MM.DD) |

### mockOrders

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 주문 ID (예: ORD-20250601-001) |
| `productName` | string | 상품명 |
| `store` | string | 매장명 |
| `storeId` | number | 매장 ID |
| `storeAddress` | string | 픽업 주소 |
| `pickupTime` | string | 픽업 시간 표시 문자열 |
| `quantity` | number | 주문 수량 |
| `totalPrice` | number | 할인 전 금액 |
| `discountedPrice` | number | 최종 결제 금액 |
| `couponName` | string \| null | 사용한 쿠폰명 |
| `status` | string | 'pickupReady' \| 'completed' \| 'cancelled' |
| `orderedAt` | ISO string | 주문 일시 |

---

## 백엔드 연동 시 API 엔드포인트 목록

| 화면 / 기능 | 메서드 | 엔드포인트 | 설명 |
|------------|--------|-----------|------|
| 상품 목록 | GET | `/api/products` | ?category, ?storeId, ?nearby, ?lat, ?lng |
| 상품 상세 | GET | `/api/products/:id` | 재고·상태 실시간 반영 필요 |
| 매장 목록 | GET | `/api/stores` | ?lat, ?lng, ?radius, ?category |
| 매장 상세 | GET | `/api/stores/:id` | |
| 매장 상품 | GET | `/api/products?storeId=:id` | |
| 상품 검색 | GET | `/api/search` | ?q, ?sort, ?filters |
| 검색 자동완성 | GET | `/api/search/suggestions` | ?q |
| 배너 광고 | GET | `/api/banners` | |
| 주문 목록 | GET | `/api/orders` | ?status, ?page, ?limit |
| 주문 생성 | POST | `/api/orders` | body: { productId, qty, paymentMethod, couponId, addressId } |
| 주문 취소 | POST | `/api/orders/:id/cancel` | |
| 쿠폰 목록 | GET | `/api/coupons` | ?available, ?status |
| 쿠폰 등록 | POST | `/api/coupons/register` | body: { code } |
| 쿠폰 사용 처리 | PATCH | `/api/coupons/:id/use` | |
| 상품 좋아요 | POST | `/api/products/:id/like` | 토글 방식 |
| 관심 매장 | POST | `/api/stores/:id/like` | 토글 방식 |
| 관심 매장 목록 | GET | `/api/users/me/liked-stores` | |
| 가격 알림 설정 | POST | `/api/price-alerts` | body: { productId, targetPrice } |
| 가격 알림 해제 | DELETE | `/api/price-alerts/:productId` | |
| 리뷰 목록 | GET | `/api/stores/:id/reviews` | ?sort, ?page |
| 리뷰 등록 | POST | `/api/reviews` | body: { orderId, rating, text, photoUrls } |
| 이미지 업로드 | POST | `/api/uploads` | multipart/form-data |
| 주소 목록 | GET | `/api/users/me/addresses` | |
| 주소 추가 | POST | `/api/users/me/addresses` | |
| 주소 수정 | PUT | `/api/users/me/addresses/:id` | |
| 주소 삭제 | DELETE | `/api/users/me/addresses/:id` | |
| 현재 주소 변경 | PATCH | `/api/users/me/addresses/current` | body: { addressId } |
| 주소 검색 | GET | `/api/addresses/search` | ?q (카카오 주소 API 연동 권장) |
| 결제수단 목록 | GET | `/api/payment-methods` | |
| 사용자 프로필 | GET | `/api/users/me` | |
| 프로필 수정 | PUT | `/api/users/me` | |
| 환경 통계 | GET | `/api/users/me/stats` | |
| 로그아웃 | POST | `/api/auth/logout` | FCM 토큰 삭제 포함 |
| 회원탈퇴 | DELETE | `/api/users/me` | |

---

## 백엔드 연동 시 추가 고려사항

| 항목 | 내용 |
|------|------|
| 인증 | 모든 `/api/*` 엔드포인트에 고객 JWT 토큰 인증 필요 (현재 미구현). 로그인/회원가입 화면 별도 구현 필요 |
| 실시간 재고 | 상품 상세 진입 시 재고·상태를 실시간으로 불러와야 품절 처리가 정확함 |
| 지도 | 현재 의사 지도(pseudo-map)로 구현됨. 실서비스는 카카오맵 SDK 또는 Google Maps 연동 필요 |
| 현재 위치 | `expo-location` 권한 요청 후 실제 위경도 기반 매장 조회로 교체 |
| 결제 | 토스페이먼츠, 카카오페이, 네이버페이 SDK 연동 필요. 서버 측 결제 승인 필수 |
| 푸시 알림 | Firebase Cloud Messaging(FCM) 연동 필요. 주문 상태 변경, 픽업 30분 전 알림, 가격 알림 |
| 이미지 업로드 | 리뷰 사진은 S3 또는 Firebase Storage 업로드 후 URL을 서버에 전달 |
| 검색 | 서버 측 Elasticsearch 또는 Algolia 연동으로 정확도 높은 검색 구현 권장 |
| 오프라인 대응 | AsyncStorage 또는 MMKV로 주요 데이터 캐싱 고려 |
| 에러 처리 | 현재 에러 처리 미구현. API 호출 실패 시 Alert 또는 Toast 표시 필요 |
