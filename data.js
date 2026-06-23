/* ════════ 설정값 — 종 추가/브랜드 등은 여기만 수정하세요 ════════ */

/* 이 파일은 값만 정의해 window.APP_DATA 에 담습니다.
   (const로 전역 선언하면 app.js와 이름이 충돌하므로 객체 안에만 둡니다) */
window.APP_DATA = {
  KEY: "beetle-log-v1",
  /* ── 클라우드 동기화 (Supabase) ── */
  SUPABASE_URL: "https://qybgsztoegkzqsdipili.supabase.co",
  SUPABASE_KEY: "sb_publishable_IwNmQESmOgj-DHR0sxOIlw_4EKsa4wu",
  SPECIES: ["왕사슴벌레(체장)", "왕사슴벌레(극태)", "왕사슴벌레(와일드)", "넓적사슴벌레(체장)", "넓적사슴벌레(단치)", "애사슴벌레", "홍다리사슴벌레", "두점박이사슴벌레", "톱사슴벌레", "사슴벌레(미야마)", "장수풍뎅이"],
  INSTARS: ["1령", "2령", "3령 초기", "3령 중기", "3령 후기"],
  FEED_TYPES: ["균사", "발효톱밥", "기타"],
  BOTTLES: ["500", "800", "1400", "2000", "3000"],
  FLAGS: ["원더링", "조기용화", "거식", "전용"],
  FEED_PRODUCTS: {
    "균사": [
      { shop: "뿔샵", items: ["오오히라", "칸타케", "투곤"] },
      { shop: "오오히라", items: ["히라타케", "칸타케", "기와"] },
      { shop: "곤충아카데미", items: ["GK"] },
      { shop: "곤충스타", items: ["폭식 오오히라", "폭식 기와"] },
      { shop: "카미나가", items: ["S8", "C3", "루카디아"] },
      { shop: "혜제원", items: ["오오히라", "히라타케"] },
      { shop: "Exceed-craft", items: ["레빈지", "레빈지SP", "GLC"] },
    ],
    "발효톱밥": [
      { shop: "투곤", items: ["투곤A", "투곤B", "투곤C"] },
      { shop: "참좋은굼벵이", items: ["C1", "C3", "CG"] },
      { shop: "뿔샵", items: ["BS"] },
    ],
  },
  STATUS_COLOR: { "유충": "#6B8E4E", "용화": "#A8884F", "우화": "#9A6A3A", "사망": "#9A9088", "분양": "#6E8494" },
  get STATUSES() { return Object.keys(this.STATUS_COLOR); },
};
