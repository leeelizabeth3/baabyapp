# 🐝 아기 성장보고서 — React Native (Expo)

## 앱 기능
- 📸 **카드 만들기** — 9가지 테마로 월별 성장보고서 카드 생성 + 사진첩 저장
- 📖 **앨범** — 0개월~12개월 성장카드 타임라인
- 📈 **성장 추적** — WHO 기준 백분위수 계산 + 성장 그래프

---

## 🚀 시작하기 (5분이면 폰에서 실행 가능!)

### 1. 필요한 것 설치
```bash
# Node.js 설치 (https://nodejs.org)
# 그 다음:
npm install -g expo-cli
```

### 2. 프로젝트 세팅
```bash
# 이 폴더에서:
npm install
```

### 3. 실행
```bash
npx expo start
```

### 4. 폰에서 테스트
1. App Store에서 **"Expo Go"** 앱 설치
2. 터미널에 QR코드 뜨면 폰 카메라로 스캔
3. 바로 앱 실행! ✅

---

## 📱 App Store 배포하기

### 준비물
- Apple Developer 계정 ($99/년) — https://developer.apple.com
- Mac 컴퓨터 (또는 EAS Build 클라우드 빌드 사용)

### EAS로 클라우드 빌드 (Mac 없어도 가능!)
```bash
npm install -g eas-cli
eas login
eas build --platform ios
# → 클라우드에서 빌드 후 .ipa 파일 다운로드
```

### app.json 수정 필요
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourname.babyreport"  ← 본인 거로 변경
    }
  }
}
```

---

## 📁 프로젝트 구조
```
BabyReport/
├── App.js                    # 메인 앱 + 탭 네비게이션
├── app.json                  # Expo 설정
├── package.json
└── src/
    ├── screens/
    │   ├── CardMakerScreen.js  # 카드 만들기
    │   ├── AlbumScreen.js      # 앨범
    │   └── GrowthScreen.js     # 성장 추적
    ├── components/
    │   └── UI.js               # 공유 UI 컴포넌트
    ├── data/
    │   ├── themes.js           # 9가지 테마 데이터
    │   └── whoData.js          # WHO 성장 기준 데이터
    └── utils/
        └── storage.js          # AsyncStorage 저장/불러오기
```

---

## 🛠 주요 라이브러리
| 라이브러리 | 용도 |
|---|---|
| `expo-image-picker` | 사진 선택 |
| `expo-media-library` | 사진첩 저장 |
| `react-native-view-shot` | 카드 → PNG 캡처 |
| `react-native-chart-kit` | 성장 그래프 |
| `@react-native-async-storage/async-storage` | 데이터 저장 |
| `@react-navigation/bottom-tabs` | 하단 탭 네비게이션 |

---

## ❓ 문제 해결

**`npm install` 에러 → 버전 충돌**
```bash
npm install --legacy-peer-deps
```

**Expo Go에서 안 열릴 때**
```bash
npx expo start --clear
```

**iOS 시뮬레이터 실행 (Mac만)**
```bash
npx expo start --ios
```
