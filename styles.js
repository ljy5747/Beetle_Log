/* ════════ 디자인(CSS) — 색·여백 등 디자인 바꿀 때만 수정 ════════ */

window.APP_CSS = `
:root{--bg:#FAF9F7;--surf:#FFFFFF;--surf2:#F4F2EE;--line:#E7E3DC;--line2:#EFEDE8;
--text:#1C1A17;--dim:#8A8378;--gold:#A8884F;--gold-d:#937640;--green:#6B8E4E;--red:#B4503F;color-scheme:light}
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
.app{min-height:100vh;background:var(--bg);color:var(--text);max-width:520px;margin:0 auto;
padding:14px 16px 90px;font-family:-apple-system,"Apple SD Gothic Neo","Pretendard","Malgun Gothic",sans-serif;font-size:15px;line-height:1.55}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:-.01em}
.serif{font-family:"Times New Roman","Nanum Myeongjo",Georgia,serif}
.loading{padding:60px 0;text-align:center;color:var(--dim)}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0 14px;border-bottom:1px solid var(--line);margin-bottom:16px}
.brand{font-family:"Times New Roman","Nanum Myeongjo",Georgia,serif;font-size:25px;font-weight:700;letter-spacing:.01em}
.brand-sub{font-size:12px;color:var(--dim);margin-top:2px;letter-spacing:.02em}
.hbtn{background:none;border:none;color:var(--gold-d);font-size:15px;font-weight:600;padding:8px 4px;cursor:pointer}
.hbtn.primary{color:var(--gold-d);font-weight:800}
.filters{display:flex;gap:7px;overflow-x:auto;padding-bottom:16px;scrollbar-width:none}
.filters::-webkit-scrollbar{display:none}
.fchip{flex:none;background:var(--surf);border:1px solid var(--line);color:var(--dim);border-radius:999px;
padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer}
.fchip.on{color:var(--text);border-color:var(--text);background:var(--surf)}
.card{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:14px 15px;margin-bottom:10px;
display:flex;justify-content:space-between;gap:10px;cursor:pointer;box-shadow:0 1px 2px rgba(28,26,23,.03)}
.card-l{min-width:0;flex:1}
.card-r{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:8px}
.tagrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.tag{display:inline-block;border:1px solid #D8D2C8;border-radius:5px;padding:1px 7px;font-size:13px;font-weight:700;background:var(--surf2)}
.tag.big{font-size:15px;padding:2px 9px}
.chip{font-size:11px;font-weight:700;border:1px solid;border-radius:999px;padding:1px 8px}
.chip.dd{color:var(--dim);border-color:var(--line)}
.chip.dd.soon{color:var(--gold-d);border-color:#A8884F66}
.chip.dd.over{color:var(--red);border-color:#B4503F55}
.card-sub{font-size:12.5px;color:var(--dim);margin:6px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-val{font-size:21px;font-weight:700}
.card-val small{font-size:13px;color:var(--dim);margin-left:1px}
.card-val em{font-style:normal;font-size:12px;color:var(--dim);font-weight:600;margin-left:6px}
.card-val em.up{color:var(--green)} .card-val em.down{color:var(--red)} em.up{color:var(--green)} em.down{color:var(--red)}
.lstat{display:flex;gap:10px;font-size:11.5px;font-weight:700;margin-top:7px}
.dim{color:var(--dim)} .warn{color:var(--red);font-size:12px;font-weight:700;margin-left:6px}
.spark-empty{font-size:11px;color:var(--dim);padding:8px 0}
.spark-range{font-size:11px;color:var(--dim);margin-top:4px}
.btn{background:var(--surf);border:1px solid var(--line);color:var(--text);border-radius:11px;
padding:11px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.btn.primary{background:var(--gold);border-color:var(--gold);color:#fff}
.btn.ghost{background:transparent}
.btn.sm{padding:8px 12px;font-size:13px}
.btn.tiny{padding:4px 10px;font-size:12px;border-radius:8px;background:var(--surf2)}
.btn.danger{color:var(--red);border-color:#B4503F44;background:transparent}
.mt{margin-top:14px}
.fab{position:fixed;right:max(18px,calc(50% - 242px));bottom:24px;width:56px;height:56px;border-radius:18px;
background:var(--gold);color:#fff;border:none;font-size:28px;font-weight:600;cursor:pointer;
box-shadow:0 6px 20px rgba(168,136,79,.4)}
.empty{text-align:center;padding:46px 20px;color:var(--dim)}
.empty.sm{padding:20px}
.empty-icon{font-size:40px;margin-bottom:12px;opacity:.85}
.empty-t{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
.empty-d{font-size:13px;line-height:1.7}
.footer{margin-top:28px;text-align:center}
.note{font-size:12px;color:var(--dim);margin-bottom:10px;line-height:1.6}
.frow{display:flex;gap:8px;justify-content:center}
.d-sub{color:var(--dim);font-size:13px;margin:-6px 0 16px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.stat{background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:11px 12px}
.stat.hl{border-color:#A8884F66;background:#FCFAF5}
.s-l{font-size:11px;color:var(--dim);margin-bottom:4px}
.s-v{font-size:16px;font-weight:700}
.stat.hl .s-v{color:var(--gold-d)}
.panel{background:var(--surf);border:1px solid var(--line);border-radius:13px;padding:14px 15px;margin-bottom:12px}
.p-t{font-size:12px;font-weight:800;color:var(--dim);margin-bottom:10px;letter-spacing:.06em;text-transform:uppercase}
.p-t.lt{margin:20px 2px 11px}
.meas{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--dim)}
.meas b{color:var(--text);font-weight:700}
.acts{display:flex;gap:8px;margin-bottom:16px}
.acts .btn{flex:1;padding:12px 6px}
.rec{background:var(--surf);border:1px solid var(--line);border-radius:13px;padding:12px 15px;margin-bottom:9px;cursor:pointer}
.r-top{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
.r-date{font-size:13px;color:var(--dim)}
.r-ins{font-size:12px;font-weight:700;color:var(--green)}
.r-w{font-size:17px;font-weight:700;margin-left:auto}
.r-w em{font-style:normal;font-size:12px;font-weight:600;margin-left:4px}
.r-mid{font-size:12.5px;color:var(--dim);margin-top:5px}
.r-next{font-size:12.5px;color:var(--dim);margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.r-next b{color:var(--text)}
.r-memo{font-size:12.5px;color:var(--dim);margin-top:7px;border-top:1px dashed var(--line);padding-top:7px;white-space:pre-wrap}
.kv-row{display:flex;gap:12px;padding:6px 0;font-size:13.5px;border-bottom:1px solid var(--line2)}
.kv-row:last-child{border-bottom:none}
.kv-k{flex:none;width:52px;color:var(--dim)}
.kv-v{word-break:break-all;white-space:pre-wrap}
.overlay{position:fixed;inset:0;background:rgba(28,26,23,.32);display:flex;align-items:flex-end;justify-content:center;z-index:50;backdrop-filter:blur(2px)}
.modal{background:var(--bg);border:1px solid var(--line);border-radius:20px 20px 0 0;width:100%;max-width:520px;
max-height:92vh;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(28,26,23,.18)}
.mhead{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-bottom:1px solid var(--line);flex:none}
.mtitle{font-weight:800;font-size:16px}
.mbody{overflow-y:auto;padding:16px 16px 36px}
.sect{font-size:11px;font-weight:800;color:var(--gold-d);letter-spacing:.08em;text-transform:uppercase;margin:18px 0 11px}
.sect:first-child{margin-top:0}
.row{display:flex;gap:10px}
.field{margin-bottom:13px;flex:1;min-width:0}
.label{font-size:12px;color:var(--dim);font-weight:700;margin-bottom:6px}
.in{width:100%;background:var(--surf);border:1px solid var(--line);color:var(--text);border-radius:11px;
padding:12px;font-size:16px;font-family:inherit;appearance:none}
.in:focus{outline:none;border-color:var(--gold)}
.in.ta{min-height:64px;resize:vertical}
select.in{background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);
background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;background-size:5px 5px;background-repeat:no-repeat}
.chiprow{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}
.chipbtn{background:var(--surf2);border:1px solid var(--line);color:var(--text);border-radius:999px;
padding:6px 13px;font-size:13px;font-weight:600;cursor:pointer}
.hint{font-size:11.5px;color:var(--dim);margin-top:7px;line-height:1.6}
.hint b{color:var(--text)}
.toggle{background:var(--surf);border:1px solid var(--line);color:var(--dim);border-radius:11px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer}
.toggle.on{color:var(--red);border-color:#B4503F55}
.toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:var(--text);border:none;
color:#fff;border-radius:999px;padding:10px 18px;font-size:13.5px;font-weight:600;z-index:99;
box-shadow:0 8px 24px rgba(28,26,23,.25);white-space:nowrap}
.del-float{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:60}
.tabs{display:flex;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:14px;background:var(--surf)}
.tab-b{flex:1;background:none;border:none;padding:10px 4px;font-size:13.5px;font-weight:700;color:var(--dim);cursor:pointer;font-family:inherit}
.tab-b.on{background:var(--text);color:#fff}
.bcard{background:var(--surf);border:1px solid #D8D2C8;border-radius:16px;padding:24px 20px 18px;margin-bottom:14px;
box-shadow:0 2px 12px rgba(28,26,23,.06);text-align:center}
.bc-head{font-size:11px;letter-spacing:.34em;color:var(--gold-d);font-weight:700}
.bc-species{font-size:24px;font-weight:700;margin-top:10px;letter-spacing:.01em}
.bc-sub{font-size:12.5px;color:var(--dim);margin-top:6px}
.bc-line{height:1px;background:var(--line);margin:16px 0}
.bc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.bc-grid .s-v{font-size:14.5px}
.bc-foot{font-size:12.5px;color:var(--dim);margin-top:8px;white-space:pre-wrap}
.bc-qr{font-size:10.5px;color:#BCB5A9;margin-top:18px;letter-spacing:.05em}
.alert{display:flex;align-items:center;gap:8px;background:#FCF7EC;border:1px solid #E8D9B8;border-radius:12px;
padding:12px 14px;margin-bottom:12px;font-size:14px;cursor:pointer}
.alert b{font-weight:700;color:#8A6D34}
.alert-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);flex:none;animation:pulse 1.8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.alert-go{margin-left:auto;color:var(--gold-d);font-weight:700;font-size:13px}
.cal{padding-bottom:10px}
.cal-head{display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:4px}
.cal-title{font-size:22px;font-weight:700}
.cal-nav{background:none;border:none;color:var(--text);font-size:26px;font-weight:400;cursor:pointer;padding:4px 10px;line-height:1}
.cal-today{display:block;margin:0 auto 14px;background:var(--surf);border:1px solid var(--line);color:var(--gold-d);
border-radius:999px;padding:5px 16px;font-size:12.5px;font-weight:700;cursor:pointer}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr)}
.cal-dow{margin-bottom:4px}
.cal-dowc{text-align:center;font-size:11px;font-weight:700;color:var(--dim);padding:4px 0}
.cal-dowc.sun{color:#C2705F} .cal-dowc.sat{color:#6E8494}
.cal-cell{position:relative;aspect-ratio:1;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;
align-items:center;justify-content:flex-start;padding-top:5px;border-radius:10px;font-family:inherit}
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
.cal-sel{margin-top:14px;background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:14px 15px}
.cal-sel-date{font-size:14px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.cal-badge{background:var(--gold);color:#fff;font-size:10.5px;font-weight:700;border-radius:999px;padding:1px 8px}
.cal-empty{font-size:13px;color:var(--dim);padding:6px 0}
.cal-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-top:1px solid var(--line2);cursor:pointer}
.cal-item:first-of-type{border-top:none}
.cal-item-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex:none}
.cal-item-l{font-size:14px;font-weight:600}
.cal-item-s{font-size:12px;color:var(--dim);margin-top:1px}
.up-row{display:flex;gap:12px;padding:10px 2px;border-bottom:1px solid var(--line2)}
.up-date{flex:none;width:70px}
.up-date b{display:block;font-size:13px}
.up-dd{font-size:11px;color:var(--dim)} .up-dd.soon{color:var(--gold-d);font-weight:700} .up-dd.over{color:var(--red);font-weight:700}
.up-items{flex:1}
.up-item{font-size:13.5px;padding:2px 0;cursor:pointer;display:flex;align-items:center;gap:7px}
.up-item i{width:6px;height:6px;border-radius:50%;flex:none}
.harvest-tip{margin-top:10px;padding:9px 12px;background:#FBF1EE;border:1px solid #EBD3CC;border-radius:10px;font-size:13px}
.harvest-tip b{color:#9A4A3A}
.cal-del{margin-left:auto;background:none;border:none;color:var(--red);font-size:12px;font-weight:700;cursor:pointer;padding:4px 6px;flex:none}
.cal-add-btn{width:100%;margin-top:10px;background:var(--surf2);border:1px dashed var(--line);color:var(--gold-d);
border-radius:11px;padding:11px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
.cal-add{margin-top:12px;padding-top:12px;border-top:1px solid var(--line2)}
.cal-add-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
.cal-add-btns .btn{flex:none;padding:8px 18px}
.grp-head{display:flex;align-items:baseline;gap:8px;padding:2px 2px 10px;border-bottom:1px solid var(--line);margin-bottom:10px}
.grp-name{font-size:18px;font-weight:700;letter-spacing:.01em}
.grp-cnt{font-size:12px;color:var(--dim);font-weight:600;margin-left:auto}
.pick-grid{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:4px}
.pick-chip{background:var(--surf2);border:1px solid var(--line);color:var(--dim);border-radius:9px;
padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;font-family:ui-monospace,"SF Mono",Menlo,monospace}
.pick-chip.on{background:#FCFAF5;border-color:var(--gold);color:var(--gold-d)}
.cc-wrap{position:relative}
.cc-wrap .in{padding-right:38px}
.cc-suffix{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--dim);font-size:14px;font-weight:700;pointer-events:none}
.card.dead{opacity:.5;background:var(--surf2)}
.card.dead .card-val,.card.dead .card-sub{color:var(--dim)}
.tag.strike{text-decoration:line-through;text-decoration-thickness:1.5px;color:var(--dim)}
.sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sp-card{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:16px 15px;cursor:pointer;
box-shadow:0 1px 2px rgba(28,26,23,.03)}
.sp-name{font-size:17px;font-weight:700;letter-spacing:.01em}
.sp-meta{font-size:12px;color:var(--dim);margin-top:6px}
.sp-go{font-size:12px;color:var(--gold-d);font-weight:700;margin-top:12px}
.sp-back{color:var(--gold-d);font-size:14px;font-weight:600;cursor:pointer;padding:4px 0 12px}
.bc-dead{display:inline-block;margin-top:10px;background:#F1EEEA;color:#7E705F;font-size:11px;font-weight:700;
border-radius:999px;padding:3px 12px;letter-spacing:.04em}
.bc-lineage{margin-top:10px;font-size:12px;color:var(--gold-d);font-weight:600}
.bc-lineage b{font-weight:800}
.photo-pick{display:block;cursor:pointer}
.photo-prev{width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}
.photo-empty{display:flex;align-items:center;justify-content:center;height:120px;background:var(--surf2);
border:1px dashed var(--line);border-radius:12px;color:var(--dim);font-size:14px;font-weight:600}
.bc-photo{width:100%;max-height:280px;object-fit:cover;border-radius:12px;margin-bottom:16px;border:1px solid var(--line)}
.card-thumb{width:60px;height:60px;object-fit:cover;border-radius:10px;border:1px solid var(--line);flex:none;align-self:center}
.remind-box{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
.remind-toggle{width:100%;background:var(--surf2);border:1px solid var(--line);color:var(--gold-d);
border-radius:11px;padding:10px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
.remind-toggle.on{background:#FBF1EE;border-color:#EBD3CC;color:#9A4A3A}
.view-toggle{display:flex;gap:6px;margin-bottom:12px}
.vt-btn{flex:1;background:var(--surf);border:1px solid var(--line);color:var(--dim);border-radius:9px;
padding:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.vt-btn.on{background:var(--text);color:#fff;border-color:var(--text)}
.ltable{display:flex;flex-direction:column;gap:10px}
.lt-row{background:var(--surf);border:1px solid var(--line);border-radius:14px;overflow:hidden;cursor:pointer;
box-shadow:0 1px 2px rgba(28,26,23,.03)}
.lt-head{display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border-bottom:1px solid var(--line)}
.lt-sp{font-size:13px;font-weight:600;color:var(--text)}
.lt-cnt{margin-left:auto;font-size:12px;color:var(--dim);font-weight:600}
.lt-pair{display:flex;align-items:stretch}
.lt-parent{flex:1;padding:11px 13px;min-width:0}
.lt-parent.male{background:#EAF1F7}
.lt-parent.female{background:#F9EEF2}
.lt-pl{font-size:11px;font-weight:700;color:var(--dim);margin-bottom:6px}
.lt-photo{width:100%;height:74px;object-fit:cover;border-radius:8px;margin-bottom:6px;border:1px solid rgba(0,0,0,.06)}
.lt-pcode{font-size:14px;font-weight:700}
.lt-pspec{font-size:12px;color:var(--dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-none{font-size:13px;color:#BCB5A9;padding:8px 0}
.lt-x{display:flex;align-items:center;color:var(--dim);font-size:14px;font-weight:700;padding:0 2px}
.dtable{background:var(--surf);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.dt-head{display:flex;padding:9px 14px;background:var(--surf2);border-bottom:1px solid var(--line);
font-size:11px;font-weight:700;color:var(--dim)}
.dt-row{display:flex;padding:11px 14px;border-bottom:1px solid var(--line2);cursor:pointer;align-items:baseline}
.dt-row:last-child{border-bottom:none}
.dt-date{flex:none;width:88px;font-size:13px}
.dt-ins{font-style:normal;font-size:10.5px;color:var(--green);font-weight:700;margin-left:5px}
.dt-feed{flex:1;min-width:0;font-size:12.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px}
.dt-w{flex:none;font-size:14px;font-weight:700;text-align:right}
.flagrow{display:flex;flex-wrap:wrap;gap:7px}
.flag-chip{background:var(--surf2);border:1px solid var(--line);color:var(--dim);border-radius:9px;
padding:8px 13px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.flag-chip.on{background:#FBF1EE;border-color:#D98C6A;color:#9A4A3A}
.flag-show{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.flag-tag{background:#FBF1EE;color:#9A4A3A;border:1px solid #EBD3CC;border-radius:7px;
padding:2px 9px;font-size:11px;font-weight:700}
`;

