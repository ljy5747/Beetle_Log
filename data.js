/* ════════ 설정값 — 종 추가/브랜드 등은 여기만 수정하세요 ════════ */

const KEY = "beetle-log-v1";
const SPECIES = ["왕사슴벌레", "넓적사슴벌레", "애사슴벌레", "홍다리사슴벌레", "두점박이사슴벌레", "톱사슴벌레", "사슴벌레(미야마)", "장수풍뎅이"];
const INSTARS = ["1령", "2령", "3령 초기", "3령 중기", "3령 후기"];
const FEED_TYPES = ["균사", "발효톱밥", "기타"];
const BOTTLES = ["500cc", "800cc", "1400cc", "2000cc", "3000cc"];
const STATUS_COLOR = { "유충": "#6B8E4E", "용화": "#A8884F", "우화": "#9A6A3A", "사망": "#9A9088", "분양": "#6E8494" };
const STATUSES = Object.keys(STATUS_COLOR);

/* 다른 파일에서 쓸 수 있게 전역 노출 (수정 불필요) */
window.APP_DATA = { KEY, SPECIES, INSTARS, FEED_TYPES, BOTTLES, STATUS_COLOR, STATUSES };
