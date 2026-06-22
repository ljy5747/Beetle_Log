/* ════════ 디자인(CSS) — 색·여백 등 디자인 바꿀 때만 수정 ════════ */
/* D.D.A ism 무드 : 흑백 미니멀 + 골드 한 포인트 + 큰 명조체 + 영문/한글 2단 라벨 */

const CSS = `
:root{
  --bg:#F7F5F1;        /* 오프화이트 (살짝 더 차분하게) */
  --surf:#FFFFFF;
  --surf2:#F1EEE8;
  --line:#E4DFD6;
  --line2:#EEEBE4;
  --text:#171513;      /* 거의 블랙 — D.D.A의 진한 검정 */
  --dim:#8C857A;
  --gold:#A8884F;      /* 브론즈 골드 포인트 */
  --gold-d:#8C6F3C;
  --green:#6B8E4E;
  --red:#B4503F;
  --serif:"Times New Roman","Nanum Myeongjo","Apple SD Gothic Neo",Georgia,serif;
  color-scheme:light;
}
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
.app{min-height:100vh;background:var(--bg);color:var(--text);max-width:520px;margin:0 auto;
padding:14px 18px 90px;font-family:-apple-system,"Apple SD Gothic Neo","Pretendard","Malgun Gothic",sans-serif;font-size:15px;line-height:1.55}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:-.01em}
.serif{font-family:var(--serif)}
.loading{padding:60px 0;text-align:center;color:var(--dim)}

/* ───── 상단바 : 명조체 브랜드 강조 ───── */
.topbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0 16px;border-bottom:1.5px solid var(--text);margin-bottom:20px}
.brand{font-family:var(--serif);font-size:27px;font-weight:700;letter-spacing:.02em;line-height:1}
.brand-sub{font-size:11px;color:var(--dim);margin-top:6px;letter-spacing:.16em;text-transform:uppercase}
.hbtn{background:none;border:none;color:var(--text);font-size:15px;font-weight:600;padding:8px 4px;cursor:pointer}
.hbtn.primary{color:var(--gold-d);font-weight:800}

/* ───── 필터 칩 ───── */
.filters{display:flex;gap:7px;overflow-x:auto;padding-bottom:18px;scrollbar-width:none}
.filters::-webkit-scrollbar{display:none}
.fchip{flex:none;background:transparent;border:1px solid var(--line);color:var(--dim);border-radius:999px;
padding:6px 15px;font-size:12.5px;font-weight:600;cursor:pointer;letter-spacing:.02em}
.fchip.on{color:var(--bg);border-color:var(--text);background:var(--text)}

/* ───── 카드 : 각진 단정한 느낌 ───── */
.card{background:var(--surf);border:1px solid var(--line);border-radius:4px;padding:16px 17px;margin-bottom:11px;
display:flex;justify-content:space-between;gap:10px;cursor:pointer;box-shadow:none;transition:border-color .15s}
.card:active{border-color:var(--text)}
.card-l{min-width:0;flex:1}
.card-r{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:8px}
.tagrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.tag{display:inline-block;border:none;border-radius:0;padding:0;font-family:var(--serif);font-size:18px;font-weight:700;background:none;letter-spacing:.01em}
.tag.big{font-size:21px}
.chip{font-size:10.5px;font-weight:700;border:1px solid;border-radius:999px;padding:2px 9px;letter-spacing:.03em}
.chip.dd{color:var(--bg);border-color:var(--text);background:var(--text)}
.chip.dd.soon{color:var(--bg);border-color:var(--gold-d);background:var(--gold-d)}
.chip.dd.over{color:#fff;border-color:var(--red);background:var(--red)}
.card-sub{font-size:12.5px;color:var(--dim);margin:7px 0 9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}
.card-val{font-size:22px;font-weight:700;font-family:var(--serif)}
.card-val small{font-size:13px;color:var(--dim);margin-left:2px;font-family:-apple-system,sans-serif}
.card-val em{font-style:normal;font-size:12px;color:var(--dim);font-weight:600;margin-left:7px;font-family:-apple-system,sans-serif}
.card-val em.up{color:var(--green)} .card-val em.down{color:var(--red)} em.up{color:var(--green)} em.down{color:var(--red)}
.lstat{display:flex;gap:12px;font-size:11px;font-weight:700;margin-top:9px;letter-spacing:.02em}
.dim{color:var(--dim)} .warn{color:var(--red);font-size:12px;font-weight:700;margin-left:6px}
.spark-empty{font-size:11px;color:var(--dim);padding:8px 0}
.spark-range{font-size:11px;color:var(--dim);margin-top:4px}

/* ───── 버튼 ───── */
.btn{background:var(--surf);border:1px solid var(--line);color:var(--text);border-radius:4px;
padding:12px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.02em}
.btn.primary{background:var(--gold);border-color:var(--gold);color:#fff}
.btn.ghost{background:transparent}
.btn.sm{padding:8px 13px;font-size:13px}
.btn.tiny{padding:5px 11px;font-size:12px;border-radius:3px;background:var(--surf2)}
.btn.danger{color:var(--red);border-color:#B4503F44;background:transparent}
.mt{margin-top:14px}

/* ───── FAB : 각진 골드 ───── */
.fab{position:fixed;right:max(18px,calc(50% - 242px));bottom:24px;width:56px;height:56px;border-radius:6px;
background:var(--text);color:#fff;border:none;font-size:28px;font-weight:300;cursor:pointer;
box-shadow:0 6px 22px rgba(23,21,19,.35)}

/* ───── 빈 화면 ───── */
.empty{text-align:center;padding:54px 20px;color:var(--dim)}
.empty.sm{padding:24px}
.empty-icon{font-size:38px;margin-bottom:14px;opacity:.55;filter:grayscale(.3)}
.empty-t{font-family:var(--serif);font-size:19px;font-weight:700;color:var(--text);margin-bottom:10px}
.empty-d{font-size:13px;line-height:1.8}
.footer{margin-top:34px;text-align:center}
.note{font-size:12px;color:var(--dim);margin-bottom:12px;line-height:1.6}
.frow{display:flex;gap:8px;justify-content:center}
.d-sub{color:var(--dim);font-size:13px;margin:-8px 0 20px;letter-spacing:.02em}

/* ───── 통계 그리드 ───── */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.stat{background:var(--surf);border:1px solid var(--line);border-radius:4px;padding:13px 13px}
.stat.hl{border-color:var(--gold);background:#FCFAF5}
.s-l{font-size:10px;color:var(--dim);margin-bottom:6px;letter-spacing:.08em;text-transform:uppercase}
.s-v{font-size:18px;font-weight:700;font-family:var(--serif)}
.stat.hl .s-v{color:var(--gold-d)}

/* ───── 패널 ───── */
.panel{background:var(--surf);border:1px solid var(--line);border-radius:4px;padding:16px 17px;margin-bottom:13px}
.p-t{font-family:var(--serif);font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px;letter-spacing:.01em;text-transform:none}
.p-t.lt{margin:24px 2px 13px}
.meas{display:flex;flex-wrap:wrap;gap:7px 18px;font-size:13px;color:var(--dim)}
.meas b{color:var(--text);font-weight:700}
.acts{display:flex;gap:8px;margin-bottom:18px}
.acts .btn{flex:1;padding:13px 6px}

/* ───── 기록 카드 ───── */
.rec{background:var(--surf);border:1px solid var(--line);border-radius:4px;padding:13px 16px;margin-bottom:9px;cursor:pointer}
.r-top{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.r-date{font-size:13px;color:var(--dim)}
.r-ins{font-size:11px;font-weight:700;color:var(--green);letter-spacing:.03em}
.r-w{font-size:18px;font-weight:700;margin-left:auto;font-family:var(--serif)}
.r-w em{font-style:normal;font-size:12px;font-weight:600;margin-left:5px;font-family:-apple-system,sans-serif}
.r-mid{font-size:12.5px;color:var(--dim);margin-top:6px}
.r-next{font-size:12.5px;color:var(--dim);margin-top:9px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.r-next b{color:var(--text)}
.r-memo{font-size:12.5px;color:var(--dim);margin-top:8px;border-top:1px dashed var(--line);padding-top:8px;white-space:pre-wrap}

/* ───── 키-값 행 ───── */
.kv-row{display:flex;gap:12px;padding:7px 0;font-size:13.5px;border-bottom:1px solid var(--line2)}
.kv-row:last-child{border-bottom:none}
.kv-k{flex:none;width:52px;color:var(--dim);letter-spacing:.02em}
.kv-v{word-break:break-all;white-space:pre-wrap}

/* ───── 모달 ───── */
.overlay{position:fixed;inset:0;background:rgba(23,21,19,.4);display:flex;align-items:flex-end;justify-content:center;z-index:50;backdrop-filter:blur(3px)}
.modal{background:var(--bg);border:none;border-radius:14px 14px 0 0;width:100%;max-width:520px;
max-height:92vh;display:flex;flex-direction:column;box-shadow:0 -8px 44px rgba(23,21,19,.22)}
.mhead{display:flex;justify-content:space-between;align-items:center;padding:15px 16px;border-bottom:1px solid var(--line);flex:none}
.mtitle{font-family:var(--serif);font-weight:700;font-size:17px;letter-spacing:.01em}
.mbody{overflow-y:auto;padding:18px 16px 36px}
.sect{font-size:10.5px;font-weight:800;color:var(--gold-d);letter-spacing:.16em;text-transform:uppercase;margin:22px 0 12px}
.sect:first-child{margin-top:0}
.row{display:flex;gap:10px}
.field{margin-bottom:14px;flex:1;min-width:0}
.label{font-size:11px;color:var(--dim);font-weight:700;margin-bottom:7px;letter-spacing:.04em;text-transform:uppercase}
.in{width:100%;background:var(--surf);border:1px solid var(--line);color:var(--text);border-radius:4px;
padding:12px;font-size:16px;font-family:inherit;appearance:none}
.in:focus{outline:none;border-color:var(--gold)}
.in.ta{min-height:64px;resize:vertical}
select.in{background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);
background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;background-size:5px 5px;background-repeat:no-repeat}
.chiprow{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}
.chipbtn{background:var(--surf2);border:1px solid var(--line);color:var(--text);border-radius:999px;
padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer}
.hint{font-size:11.5px;color:var(--dim);margin-top:8px;line-height:1.6}
.hint b{color:var(--text)}
.toggle{background:var(--surf);border:1px solid var(--line);color:var(--dim);border-radius:4px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer}
.toggle.on{color:var(--red);border-color:#B4503F55}

/* ───── 토스트 : 검정 알약 ───── */
.toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:var(--text);border:none;
color:#fff;border-radius:999px;padding:11px 19px;font-size:13.5px;font-weight:600;z-index:99;
box-shadow:0 8px 26px rgba(23,21,19,.3);white-space:nowrap;letter-spacing:.02em}
.del-float{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:60}

/* ───── 탭 ───── */
.tabs{display:flex;border:1px solid var(--line);border-radius:4px;overflow:hidden;margin-bottom:16px;background:var(--surf)}
.tab-b{flex:1;background:none;border:none;padding:9px 4px;color:var(--dim);cursor:pointer;font-family:inherit}
.tab-b.on{background:var(--text);color:#fff}
.tab-en{display:block;font-size:9px;font-weight:700;letter-spacing:.16em;opacity:.5;margin-bottom:3px}
.tab-ko{display:block;font-size:13px;font-weight:700;letter-spacing:.02em}
.tab-b.on .tab-en{opacity:.7}

/* ───── 분양카드(BREEDING CARD) : D.D.A 무드의 핵심 ───── */
.bcard{background:var(--surf);border:1px solid var(--text);border-radius:6px;padding:28px 22px 20px;margin-bottom:16px;
box-shadow:0 2px 14px rgba(23,21,19,.07);text-align:center}
.bc-head{font-size:10px;letter-spacing:.42em;color:var(--gold-d);font-weight:700;font-family:-apple-system,sans-serif}
.bc-species{font-family:var(--serif);font-size:27px;font-weight:700;margin-top:12px;letter-spacing:.01em}
.bc-sub{font-size:12px;color:var(--dim);margin-top:8px;letter-spacing:.04em}
.bc-line{height:1px;background:var(--line);margin:18px 0}
.bc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.bc-grid .s-v{font-size:15px}
.bc-foot{font-size:12.5px;color:var(--dim);margin-top:9px;white-space:pre-wrap}
.bc-qr{font-size:10px;color:#BCB5A9;margin-top:20px;letter-spacing:.1em;text-transform:uppercase}

/* ───── 알림 배너 ───── */
.alert{display:flex;align-items:center;gap:9px;background:#FBF6EC;border:1px solid #E5D6B4;border-radius:4px;
padding:13px 15px;margin-bottom:14px;font-size:14px;cursor:pointer}
.alert b{font-weight:700;color:#7E632E}
.alert-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);flex:none;animation:pulse 1.8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.alert-go{margin-left:auto;color:var(--gold-d);font-weight:700;font-size:13px;letter-spacing:.02em}

/* ───── 캘린더 ───── */
.cal{padding-bottom:10px}
.cal-head{display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:4px}
.cal-title{font-family:var(--serif);font-size:24px;font-weight:700;letter-spacing:.02em}
.cal-nav{background:none;border:none;color:var(--text);font-size:26px;font-weight:300;cursor:pointer;padding:4px 10px;line-height:1}
.cal-today{display:block;margin:0 auto 16px;background:transparent;border:1px solid var(--line);color:var(--gold-d);
border-radius:999px;padding:5px 17px;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.04em}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr)}
.cal-dow{margin-bottom:4px}
.cal-dowc{text-align:center;font-size:10.5px;font-weight:700;color:var(--dim);padding:4px 0;letter-spacing:.04em}
.cal-dowc.sun{color:#C2705F} .cal-dowc.sat{color:#6E8494}
.cal-cell{position:relative;aspect-ratio:1;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;
align-items:center;justify-content:flex-start;padding-top:5px;border-radius:4px;font-family:inherit}
.cal-cell.empty{cursor:default}
.cal-cell.sel{background:var(--text)}
.cal-cell.sel .cal-num{color:#fff}
.cal-cell.today .cal-num{color:var(--gold-d);font-weight:800}
.cal-cell.today.sel .cal-num{color:#fff}
.cal-num{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.cal-num.sun{color:#C2705F} .cal-num.sat{color:#6E8494}
.cal-cell.sel .cal-num.sun,.cal-cell.sel .cal-num.sat{color:#fff}
.cal-dots{display:flex;gap:2px;margin-top:3px}
.cal-dots i{width:5px;height:5px;border-radius:50%}
.cal-sel{margin-top:16px;background:var(--surf);border:1px solid var(--line);border-radius:4px;padding:15px 16px}
.cal-sel-date{font-size:14px;font-weight:700;margin-bottom:11px;display:flex;align-items:center;gap:8px;letter-spacing:.02em}
.cal-badge{background:var(--text);color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:2px 9px;letter-spacing:.04em}
.cal-empty{font-size:13px;color:var(--dim);padding:6px 0}
.cal-item{display:flex;align-items:flex-start;gap:11px;padding:10px 0;border-top:1px solid var(--line2);cursor:pointer}
.cal-item:first-of-type{border-top:none}
.cal-item-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex:none}
.cal-item-l{font-size:14px;font-weight:600}
.cal-item-s{font-size:12px;color:var(--dim);margin-top:2px}
.up-row{display:flex;gap:12px;padding:11px 2px;border-bottom:1px solid var(--line2)}
.up-date{flex:none;width:72px}
.up-date b{display:block;font-size:13px}
.up-dd{font-size:11px;color:var(--dim)} .up-dd.soon{color:var(--gold-d);font-weight:700} .up-dd.over{color:var(--red);font-weight:700}
.up-items{flex:1}
.up-item{font-size:13.5px;padding:2px 0;cursor:pointer;display:flex;align-items:center;gap:7px}
.up-item i{width:6px;height:6px;border-radius:50%;flex:none}
.harvest-tip{margin-top:11px;padding:10px 13px;background:#FBF1EE;border:1px solid #EBD3CC;border-radius:4px;font-size:13px}
.harvest-tip b{color:#9A4A3A}
`;

window.APP_CSS = CSS;
