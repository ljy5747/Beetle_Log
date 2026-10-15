/* ════════════════════════════════════════════════════════════
   BeetleLog 디자인 (CSS)
   ────────────────────────────────────────────────────────────
   · 색을 바꾸려면      → [01] 디자인 토큰의 --변수 값만 고치면 전체 반영
   · 특정 화면 모양 변경 → 아래 번호 섹션에서 해당 부분을 찾으세요
   · ⚠ 맨 위에 const 쓰지 말 것! window.APP_CSS = ` … ` 형태 유지

   [01] 색·폰트 토큰      [02] 상단바·브랜드    [03] 탭
   [04] 버튼              [05] 칩·태그·필터     [06] 카드(공통/라인/성충)
   [07] 종 폴더·그룹      [08] 라인표           [09] 통계·패널·측정
   [10] 분양카드          [11] 사육이력 표       [12] 병갈이 기록·그래프
   [13] 특이 케이스 태그  [14] 기본정보(키-값)   [15] 알림 배너
   [16] 빈 화면·푸터      [17] FAB·토스트        [18] 모달·입력 폼
   [19] 입력 피커         [20] 캘린더
   ════════════════════════════════════════════════════════════ */

window.APP_CSS = `
/* ═══════════ [00] 글씨체 — 제목 손글씨(카페24 써라운드에어) + 본문 프리텐다드 ═══════════ */
@font-face{font-family:'Cafe24SsurroundAir';
src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24SsurroundAir.woff') format('woff');
font-weight:normal;font-style:normal;font-display:swap}

/* ═══════════ [01] 색·폰트 토큰 — 테마 3종 (기본: 브라운) ═══════════ */
/* 테마는 <html data-theme="brown|green|blue"> 로 전환됩니다 */
:root,[data-theme="brown"]{
--bg:#F4F0E8;--surf:#FDFBF7;--surf2:#F1EADF;--line:#E5DBCC;--line2:#EFE8DC;
--text:#382C2A;--dim:#9A8B7A;--gold:#B28C6A;--gold-d:#8A6A48;
--green:#6B8E4E;--red:#B4503F;
--serif:"Cafe24SsurroundAir","Apple SD Gothic Neo",sans-serif;color-scheme:light}
[data-theme="green"]{
--bg:#FBF8F3;--surf:#FFFFFF;--surf2:#F2ECE2;--line:#E4DCCE;--line2:#EDE7DC;
--text:#3E362E;--dim:#94897B;--gold:#7D8B71;--gold-d:#5F6E54}
[data-theme="blue"]{
--bg:#F5F3EE;--surf:#FEFDFA;--surf2:#EFF2F5;--line:#E3DFD6;--line2:#EDEAE2;
--text:#38352F;--dim:#948E82;--gold:#7A96AD;--gold-d:#5D7E97}
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
.app{min-height:100vh;background:var(--bg);color:var(--text);max-width:520px;margin:0 auto;
padding:14px 18px calc(140px + env(safe-area-inset-bottom));font-family:"Pretendard",-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;line-height:1.55}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:-.01em}
.serif{font-family:var(--serif)}
.loading{padding:60px 0;text-align:center;color:var(--dim)}

/* ═══════════ [02] 상단바·브랜드 ═══════════ */
.topbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0 16px;border-bottom:1.5px solid var(--text);margin-bottom:20px}
.brand{font-family:var(--serif);font-size:27px;font-weight:700;letter-spacing:.02em;line-height:1}
.brand-sub{font-size:11px;color:var(--dim);margin-top:6px;letter-spacing:.14em;text-transform:uppercase}
.hbtn{background:none;border:none;color:var(--text);font-size:15px;font-weight:600;padding:8px 4px;cursor:pointer}
.hbtn.primary{color:var(--gold-d);font-weight:800}
.icon-btn{background:none;border:none;font-size:22px;cursor:pointer;padding:6px;line-height:1}

/* ═══════════ [03] 탭 (라인 / 성충 / 캘린더) ═══════════ */
.tabs{display:flex;border:1px solid var(--line);border-radius:5px;overflow:hidden;margin-bottom:16px;background:var(--surf)}
.tab-b{flex:1;background:none;border:none;padding:11px 4px;font-size:13px;font-weight:700;color:var(--dim);cursor:pointer;font-family:inherit;letter-spacing:.02em}
.tab-b.on{background:var(--text);color:#fff}

/* ═══════════ [04] 버튼 ═══════════ */
.btn{background:var(--surf);border:1px solid var(--line);color:var(--text);border-radius:5px;
padding:12px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.02em}
.btn.primary{background:var(--gold);border-color:var(--gold);color:#fff}
.btn.ghost{background:transparent}
.btn.sm{padding:8px 13px;font-size:13px}
.btn.tiny{padding:5px 11px;font-size:12px;border-radius:4px;background:var(--surf2)}
.btn.danger{color:var(--red);border-color:#B4503F44;background:transparent}
.mt{margin-top:14px}

/* ═══════════ [05] 칩·태그·필터 ═══════════ */
.filters{display:flex;gap:7px;overflow-x:auto;padding-bottom:18px;scrollbar-width:none}
.filters::-webkit-scrollbar{display:none}
.fchip{flex:none;background:transparent;border:1px solid var(--line);color:var(--dim);border-radius:999px;
padding:6px 15px;font-size:12.5px;font-weight:600;cursor:pointer;letter-spacing:.02em}
.fchip.on{color:var(--bg);border-color:var(--text);background:var(--text)}
.tag{display:inline-block;border:none;border-radius:0;padding:0;font-family:var(--serif);font-size:18px;font-weight:700;background:none;letter-spacing:.01em}
.tag.big{font-size:21px;padding:0}
.tag.strike{text-decoration:line-through;text-decoration-thickness:1.5px;color:var(--dim)}
.chip{font-size:10.5px;font-weight:700;border:1px solid;border-radius:999px;padding:2px 9px;letter-spacing:.03em}
.chip.dd{color:var(--bg);border-color:var(--text);background:var(--text)}
.chip.dd.soon{color:var(--bg);border-color:var(--gold-d);background:var(--gold-d)}
.chip.dd.over{color:#fff;border-color:var(--red);background:var(--red)}
.chip.dd.dd-red{color:#fff;border-color:var(--red);background:var(--red)}
.chip.dd.dd-yellow{color:var(--bg);border-color:var(--gold-d);background:var(--gold-d)}
.chip.dd.dd-green{color:#fff;border-color:var(--green);background:var(--green)}

/* ═══════════ [06] 카드 (라인·성충 목록 공통) ═══════════ */
.card{background:var(--surf);border:1px solid var(--line);border-radius:5px;padding:16px 17px;margin-bottom:11px;
display:flex;justify-content:space-between;gap:10px;cursor:pointer;box-shadow:none}
.card-l{min-width:0;flex:1}
.card-r{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:8px}
.tagrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
/* 유충 카드 태그줄은 배지가 늘어도 줄바꿈 대신 가로 스크롤 (D-day가 밀려 내려가지 않게) */
.card .tagrow{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.card .tagrow::-webkit-scrollbar{display:none}
.card .tagrow>*{flex:none}
.card-sub{font-size:12.5px;color:var(--dim);margin:7px 0 9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}
.card-feed{font-size:11.5px;color:var(--gold-d);margin:-5px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;letter-spacing:.01em}

/* ═══════════ 라인 카드의 부·모 표기 (수 74.5 관리번호 × 암 …) ═══════════ */
.card-pair{font-size:13px;margin:-4px 0 9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-wrap{display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap}
.pl-one{display:inline-flex;align-items:center;gap:5px;line-height:1.2}
.pl-x{font-style:normal;color:var(--dim);font-size:11px}
.pl-sz{font-weight:700;color:var(--text);font-size:13.5px}
.pl-code{color:var(--dim);font-size:12px}
/* 성별 기호 — 수컷 파랑 / 암컷 핑크. ♂♀는 기준선이 낮아 살짝 올려 정렬 */
.sx-m,.sx-f{display:inline-block;font-size:14px;font-weight:900;line-height:1;
font-variant-emoji:text;font-family:-apple-system,"Apple SD Gothic Neo","Segoe UI Symbol",sans-serif;
vertical-align:middle;position:relative;top:-1.5px;-webkit-text-stroke:.4px currentColor}
.sx-m{color:#3E7BC4}
.sx-f{color:#E0578F}
.card-val{font-size:22px;font-weight:700;font-family:var(--serif)}
.card-val small{font-size:13px;color:var(--dim);margin-left:2px;font-family:-apple-system,sans-serif}
.card-val em{font-style:normal;font-size:12px;color:var(--dim);font-weight:600;margin-left:7px;font-family:-apple-system,sans-serif}
.card-val em.up{color:var(--green)} .card-val em.down{color:var(--red)} em.up{color:var(--green)} em.down{color:var(--red)}
.lstat{display:flex;gap:12px;font-size:11px;font-weight:700;margin-top:9px;letter-spacing:.02em}
.dim{color:var(--dim)} .warn{color:var(--red);font-size:12px;font-weight:700;margin-left:6px}
.card.dead{opacity:.5;background:var(--surf2)}
.card.dead .card-val,.card.dead .card-sub{color:var(--dim)}
/* 방금 저장한 유충 카드를 잠깐 강조 */

/* ═══════════ 연도 이동 (‹ 2026 ›) ═══════════ */
.year-nav{display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:14px}
.year-arrow{background:none;border:none;color:var(--text);font-size:26px;font-weight:400;
cursor:pointer;padding:2px 18px;line-height:1;font-family:inherit;border-radius:6px}
.year-arrow:disabled{color:var(--line);cursor:default}
.year-cur{display:flex;align-items:baseline;gap:7px;min-width:110px;justify-content:center}
.year-n{font-size:20px;font-weight:800;letter-spacing:.02em}
.year-c{font-size:12px;color:var(--dim);font-weight:700}

/* ═══════════ 순서 편집 ═══════════ */
.order-bar{display:flex;justify-content:flex-end;margin-bottom:10px}
.s-row{display:flex;align-items:stretch;gap:8px}
.s-body{flex:1;min-width:0;pointer-events:none;opacity:.85} /* 편집 중엔 카드 탭 막기 */
.s-btns{display:flex;flex-direction:column;justify-content:center;gap:5px;padding-bottom:10px}
.s-mv{width:40px;height:34px;border:1px solid var(--line);background:var(--surf);color:var(--text);
border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit}
.s-mv:disabled{color:var(--line);cursor:default}
.s-mv:active:not(:disabled){background:var(--surf2)}

.card.just-saved{border-color:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 22%,transparent);
transition:box-shadow .3s,border-color .3s}
.card.crown{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.crown-ic{font-size:15px;line-height:1}
.avg-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;font-size:13px;font-weight:700}
.avg-m{color:#3E7BC4}
.avg-f{color:#E0578F}
.avg-u{color:var(--dim)}
.card-thumb{width:60px;height:60px;object-fit:cover;border-radius:5px;border:1px solid var(--line);flex:none;align-self:center}

