# BeetleLog 코드 지도

## 현행 코드 분류 (리팩터링 브랜치)

| 경로 | 담당 |
| --- | --- |
| `index.html` | 앱 부팅, JS 순서 로드, Babel 실행 |
| `data.js` | 종, 사육 재료, Supabase 설정 |
| `styles/base.js` | 글꼴·테마·상단·버튼·카드 기초 |
| `styles/cards.js` | 종·라인·통계 및 상세 카드 |
| `styles/navigation.js` | 알림·탭바·설정·공통 네비게이션 |
| `styles/forms-calendar.js` | 모달·폼·캘린더 |
| `app/core.js` | 날짜·기본 유틸, Supabase 동기화, 구글 로그인, 계산, 백업, 정렬 |
| `app/cards.js` | 유충·부모 카드, 그래프, 통계 |
| `app/ui-common.js` | 공용 UI, 선택기 |
| `app/forms-adult.js` | 성충, 라인, 부모 관련 입력 |
| `app/forms-larva.js` | 유충, 병갈이, 용화, 우화 입력 |
| `app/excel.js` | 엑셀 가져오기·내보내기 |
| `app/calendar.js` | 사육 일정·월별 달력 |
| `app/main/state.js` | 메인 상태·이벤트 핸들러·동기화 (539줄) |
| `app/main/list.js` | 목록 화면·성충 폴더 (243줄) |
| `app/main/line-details.js` | 라인 상세·교체대상 (128줄) |
| `app/main/adult-details.js` | 성충 상세 (125줄) |
| `app/main/larva-details.js` | 유충 상세 (162줄) |
| `app/main/modals-navigation.js` | 모달·설정·하단 탐색 (194줄) |
| `manifest.json`, `icons/` | PWA 아이콘 및 설치 설정 |

## 로딩 설계
빌드 도구가 없는 React+Babel CDN 프로젝트를 유지합니다. 각 파일은 개별 모듈이 아니라 순서대로 로딩해 **한 문자열로 결합한 다음 Babel JSX 변환을 한 번 실행**합니다. 이 방식은 파일 간 최상위 `const`, 함수, 컴포넌트의 원래 스코프를 보존합니다.

로딩 순서: `data.js → styles/* (순서대로 결합) → core → cards → ui-common → forms-adult → forms-larva → excel → calendar → main/state → list → line-details → adult-details → larva-details → modals-navigation`

## 관리 원칙
- 로직 수정 시 가능한 해당 기능 파일 하나만 열어서 확인합니다.
- UI 색상이나 스타일 수정은 `styles/`, 종/브랜드 설정은 `data.js`를 확인합니다.
- 하나의 큰 `app.js`는 운영 `main`에 계속 보존되고, 이 브랜치에서는 분할된 파일이 이를 대체합니다.
- GitHub Pages 실기기 확인 뒤에만 `main`에 병합합니다.
- `app/main/` 파일은 하나의 App 함수와 JSX를 구성하는 소스 조각입니다. **단독 실행할 수 없으며 순서를 변경하면 안 됩니다.** 런타임은 순서대로 합쳐 Babel에서 한 번에 변환합니다.

## CSS 분리 주의
`styles/*.js`는 각각 독립 실행 가능한 JavaScript가 아니라 하나의 `window.APP_CSS` 템플릿 문자열을 이루는 조각입니다. **index.html에 적힌 순서대로 문자열을 결합한 다음 한 번만 실행**해야 합니다. 원본과 결합 결과의 문자 단위 일치를 검증했습니다.
