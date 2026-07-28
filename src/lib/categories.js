// 카테고리 단일 소스.
//
// [배경] 홈(HomeScreen) · 카테고리 상세(CategoryProductsScreen) · 지도(MapScreen)가
//        각자 CATEGORIES/CATEGORY_MAP 을 중복 정의하고 있었고, 그 매핑이 실제
//        products.category 값과 어긋나 '전체' 외 모든 카테고리가 항상 0건이었다.
//        (판매자앱은 '베이커리·디저트' 같은 풀네임을 저장하는데, 사용자앱 맵은
//         '베이커리·디저트' → ['빵','디저트','베이커리'] 로 분해된 짧은 이름만 갖고
//         includes() 비교를 해서 풀네임이 매칭되지 않았다.)
//
// 정본 = 판매자앱 상품등록(ProductForm CATEGORIES)이 실제로 저장하는 7종.
// 관리자웹 '카테고리 관리'(categories 테이블)도 이 7종으로 정렬했고,
// 홈 화면은 categories 테이블을 조회해 렌더한다(실패 시 아래 폴백 사용).

export const ALL_CATEGORY = '전체';

// 관리자 카테고리 조회 실패 시 폴백 + 이모지 기본값.
export const FALLBACK_CATEGORIES = [
  { name: '베이커리·디저트', icon: '🥐' },
  { name: '도시락·간편식',   icon: '🍱' },
  { name: '샐러드·건강식',   icon: '🥗' },
  { name: '반찬·밀키트',     icon: '🥘' },
  { name: '채소·과일',       icon: '🥦' },
  { name: '정육·수산',       icon: '🥩' },
  { name: '음료·기타',       icon: '🧋' },
];

export const CATEGORY_EMOJI = FALLBACK_CATEGORIES.reduce(
  (acc, c) => { acc[c.name] = c.icon; return acc; },
  { [ALL_CATEGORY]: '🛒' },
);

// 풀네임 ← 과거/축약 표기. 구 시드 데이터(빵·도시락·샐러드…)와 매장 업종 표기를 함께 흡수한다.
const ALIASES = {
  '베이커리·디저트': ['빵', '베이커리', '디저트', '카페/베이커리', '카페·베이커리', '제과', 'bakery', 'dessert'],
  '도시락·간편식':   ['도시락', '간편식', '분식', '패스트푸드', 'lunchbox'],
  '샐러드·건강식':   ['샐러드', '건강식', 'salad'],
  '반찬·밀키트':     ['반찬', '밀키트', '한식', 'sidedish'],
  '채소·과일':       ['채소', '과일', '야채', 'vegetable', 'fruit'],
  '정육·수산':       ['정육', '수산', '육류', '해산물', 'meat', 'seafood'],
  '음료·기타':       ['음료', '기타', '커피', '차', 'drinks', 'drink', 'beverage', 'etc'],
};

// 상품/매장의 category 값이 화면에서 선택한 카테고리에 속하는지 판정.
// 풀네임 완전일치를 먼저 보고, 아니면 별칭 목록으로 대조한다.
export function matchesCategory(value, uiCategory) {
  if (!uiCategory || uiCategory === ALL_CATEGORY) return true;
  if (!value) return false;
  if (value === uiCategory) return true;
  const aliases = ALIASES[uiCategory];
  return !!aliases && aliases.includes(value);
}

// 배너 link('/category/drinks', '/category/빵' 등)에서 넘어온 값을 정본 이름으로 정규화.
// 대응되는 카테고리가 없으면 '전체' 로 떨어뜨려 빈 화면을 막는다.
export function normalizeCategoryName(raw) {
  const v = (raw || '').trim();
  if (!v) return ALL_CATEGORY;
  if (v === ALL_CATEGORY) return ALL_CATEGORY;
  if (ALIASES[v]) return v;                               // 이미 정본
  const lower = v.toLowerCase();
  const hit = Object.keys(ALIASES).find(name =>
    ALIASES[name].some(a => a === v || a.toLowerCase() === lower));
  return hit || ALL_CATEGORY;
}

// 화면용 카테고리 목록 만들기 — 맨 앞에 '전체' 를 붙인다.
export function withAllCategory(list) {
  const rows = (list && list.length ? list : FALLBACK_CATEGORIES).map(c => ({
    name: c.name,
    icon: c.icon || CATEGORY_EMOJI[c.name] || '🍽',
    imageUrl: c.imageUrl || null,
  }));
  return [{ name: ALL_CATEGORY, icon: CATEGORY_EMOJI[ALL_CATEGORY], imageUrl: null }, ...rows];
}
