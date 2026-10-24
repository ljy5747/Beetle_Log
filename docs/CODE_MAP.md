# BeetleLog 코드 지도

## 현행 코드 분류 (리팩터링 브랜치)

| 경로 | 담당 |
| --- | --- |
| `index.html` | 앱 부팅, JS 순서 로드, Babel 실행 |
| `data.js` | 종, 사육 재료, Supabase 설정 |
| `styles.js` | 앱 전체 CSS 및 테마 |
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

로딩 순서: `data.js → styles.js → core → cards → ui-common → forms-adult → forms-larva → excel → calendar → main/state → list → line-details → adult-details → larva-details → modals-navigation`

## 관리 원칙
- 로직 수정 시 가능한 해당 기능 파일 하나만 열어서 확인합니다.
- UI 색상이나 스타일 수정은 `styles.js`, 종/브랜드 설정은 `data.js`를 확인합니다.
- 하나의 큰 `app.js`는 운영 `main`에 계속 보존되고, 이 브랜치에서는 분할된 파일이 이를 대체합니다.
- GitHub Pages 실기기 확인 뒤에만 `main`에 병합합니다.
- `app/main/` 파일은 하나의 App 함수와 JSX를 구성하는 소스 조각입니다. **단독 실행할 수 없으며 순서를 변경하면 안 됩니다.** 런타임은 순서대로 합쳐 Babel에서 한 번에 변환합니다.

## KML 유충 편집과 안전한 양방향 저장 (2026-10-24)

운영 `app.js`와 `app/core.js`, `app/main/state.js`의 동기화 코드를 함께 갱신했습니다. 서버 스냅샷과 ID별 세 방향 병합을 사용하고, `updated_at` 조건으로 동시 저장을 검증합니다. 같은 항목의 상충 변경은 실패로 알리고 기기 기록을 유지합니다. 서버 스냅샷은 기기에 보관해 오프라인 수정도 비교하며, 편집·설정 화면이나 미저장 변경이 있을 때 자동 내려받기를 보류합니다. KML의 변경은 활성 앱에서 약 8초 주기로 확인합니다.

`node tests/cloud-sync.cjs`는 병합·메타데이터 보존·동시 저장 재시도·충돌·연결되지 않은 기기의 덮어쓰기 방지를 확인합니다. KML 저장소의 `docs/BREEDERS-SYNC.md`에 DB 트리거와 권한, 실제 DB 롤백 검증 절차를 기록했습니다.

