# BeetleLog 코드 구조 (2026-10-15)

## 운영 앱 — main 브랜치
- `index.html`: 부트스트랩, React/Babel 로드, IndexedDB 헬퍼
- `app.js`: 사육일지 화면/기능, Supabase 데이터 동기화
- `data.js`: 환경값/종/사육 관련 설정
- `styles.js`: UI 스타일
- `manifest.json`: PWA 설치 메타데이터
- `icons/`: 아이콘 자산
- `.github/workflows/static.yml`: 정적 사이트 배포
- `battle.html`, `battle-admin.html`: 체장왕전 레거시 URL (KML 이관 검증 후 정리)
- `battle-*.jpg`: KML가 임시로 참조하는 이미지. 삭제 금지
- `ibb.html`, `ibb-admin.html`: 별도 인천브리더배틀, 이번 이관 대상 아님

## 개발 브랜치 — feature/web-push-foundation
- `push-sw.js`: Web Push 수신 및 클릭 처리 (아직 서비스 등록 안 됨)
- `push-client.js`: 기기 구독 API (아직 화면에 미연결)
- `docs/push-notifications.md`: 향후 서버/DB 구현 설계
- `docs/STRUCTURE.md`: 이 문서

## 정리 원칙
1. 우선 디렉터리 역할과 의존성을 명세하고 리팩터링은 단계별로 진행
2. `index.html`의 `data.js → styles.js → app.js` 로드 순서를 유지
3. Supabase 데이터/권한 변경은 별도 마이그레이션 검토
4. KML 링크/이미지/데이터 테스트 전 원본 배틀 파일 삭제하지 않음
5. 새 기능은 운영 main 대신 별도 브랜치에서 개발
