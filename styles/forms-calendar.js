/* ═══════════ [18] 모달·입력 폼 ═══════════ */
.overlay{position:fixed;inset:0;background:rgba(23,21,19,.4);display:flex;align-items:flex-end;justify-content:center;z-index:50;backdrop-filter:blur(3px)}
/* 설정 창은 하단 탭바(z-index 40)보다 아래에 두어 탭바가 계속 보이게 */
.overlay.ov-set{z-index:30}
.overlay.ov-set .mbody{padding-bottom:calc(96px + env(safe-area-inset-bottom))}
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
.in{width:100%;background:var(--surf);border:1px solid var(--line);color:var(--text);border-radius:5px;
padding:12px;font-size:16px;font-family:inherit;appearance:none}
.in:focus{outline:none;border-color:var(--gold)}
.in.ta{min-height:64px;resize:vertical}
select.in{background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);
background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;background-size:5px 5px;background-repeat:no-repeat}
.chiprow{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}
.chipbtn{background:var(--surf2);border:1px solid var(--line);color:var(--text);border-radius:999px;
padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer}
.chipbtn.on{background:var(--gold);border-color:var(--gold);color:#fff;font-weight:700}
.hint{font-size:11.5px;color:var(--dim);margin-top:8px;line-height:1.6}
.hint b{color:var(--text)}
.toggle{background:var(--surf);border:1px solid var(--line);color:var(--dim);border-radius:5px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer}
.toggle.on{color:var(--red);border-color:#B4503F55}
.cc-wrap{position:relative}
.cc-wrap .in{padding-right:38px}
.cc-suffix{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--dim);font-size:14px;font-weight:700;pointer-events:none}
.pick-grid{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:4px}
.pick-chip{background:var(--surf2);border:1px solid var(--line);color:var(--dim);border-radius:4px;
padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;font-family:ui-monospace,"SF Mono",Menlo,monospace}
.pick-chip.on{background:#FCFAF5;border-color:var(--gold);color:var(--gold-d)}
.photo-pick{display:block;cursor:pointer}
.r-photo{width:100%;max-height:150px;object-fit:cover;border-radius:6px;margin-top:8px;
border:1px solid var(--line);cursor:pointer}
.photo-full{max-width:94vw;max-height:88vh;border-radius:8px;object-fit:contain}
.photo-prev.sm{max-height:150px}
.photo-empty.sm{padding:22px 0;font-size:13px}
.photo-prev{width:100%;max-height:240px;object-fit:cover;border-radius:6px;border:1px solid var(--line)}
.photo-empty{display:flex;align-items:center;justify-content:center;height:120px;background:var(--surf2);
border:1px dashed var(--line);border-radius:6px;color:var(--dim);font-size:14px;font-weight:600}
.remind-box{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
.remind-toggle{width:100%;background:var(--surf2);border:1px solid var(--line);color:var(--gold-d);
border-radius:5px;padding:10px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
.remind-toggle.on{background:#FBF1EE;border-color:#EBD3CC;color:#9A4A3A}
.set-desc{font-size:12.5px;color:var(--dim);line-height:1.6;margin-top:2px}
.auth-box{background:var(--surf);border:1px solid var(--line);border-radius:5px;padding:14px 15px;margin-top:4px}
.auth-me{display:flex;align-items:center;gap:11px}
.auth-dot{width:9px;height:9px;border-radius:50%;background:var(--green);flex:none}
.auth-email{font-size:14px;font-weight:700}
.auth-stat{font-size:11.5px;color:var(--dim);margin-top:3px}

/* ═══════════ [19] 입력 피커 (균사/톱밥 브랜드 선택) ═══════════ */
.picker-btn{width:100%;display:flex;align-items:center;justify-content:space-between;background:var(--surf);
border:1px solid var(--line);border-radius:5px;padding:12px;font-size:16px;cursor:pointer;font-family:inherit;color:var(--text)}
.picker-arrow{color:var(--dim);font-size:13px}
.picker-panel{margin-top:8px;border:1px solid var(--line);border-radius:5px;background:var(--surf);overflow:hidden}
.picker-group{border-bottom:1px solid var(--line2);padding:10px 12px}
.picker-group:last-of-type{border-bottom:none}
.picker-shop{font-size:10.5px;font-weight:800;color:var(--gold-d);margin-bottom:7px;letter-spacing:.08em;text-transform:uppercase}
.picker-items{display:flex;flex-wrap:wrap;gap:6px}
.picker-item{background:var(--surf2);border:1px solid var(--line);color:var(--text);border-radius:4px;
padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.picker-item.has-sub{display:flex;justify-content:space-between;align-items:center}
.picker-more{color:var(--dim);font-size:15px}
.picker-item.back{color:var(--gold-d);font-weight:800;border-bottom:1px solid var(--line);border-radius:0;margin-bottom:4px}
.picker-n{float:right;color:var(--dim);font-size:11px;font-weight:600}
.picker-item.on{background:#FCFAF5;border-color:var(--gold);color:var(--gold-d);font-weight:800}
.picker-manual{width:100%;background:var(--surf2);border:none;border-top:1px solid var(--line);
padding:11px;font-size:13px;font-weight:700;color:var(--gold-d);cursor:pointer;font-family:inherit}
.picker-empty{padding:12px;font-size:13px;color:var(--dim);text-align:center}

/* ═══════════ [20] 캘린더 ═══════════ */
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
align-items:center;justify-content:flex-start;padding-top:5px;border-radius:5px;font-family:inherit}
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
.cal-sel{margin-top:16px;background:var(--surf);border:1px solid var(--line);border-radius:5px;padding:15px 16px}
.cal-sel-date{font-size:14px;font-weight:700;margin-bottom:11px;display:flex;align-items:center;gap:8px;letter-spacing:.02em}
.cal-badge{background:var(--text);color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:2px 9px;letter-spacing:.04em}
.cal-empty{font-size:13px;color:var(--dim);padding:6px 0}
.cal-item{display:flex;align-items:flex-start;gap:11px;padding:10px 0;border-top:1px solid var(--line2);cursor:pointer}
.cal-item:first-of-type{border-top:none}
.cal-item-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex:none}
.cal-item-l{font-size:14px;font-weight:600}
.cal-item-s{font-size:12px;color:var(--dim);margin-top:2px}
.cal-del{margin-left:auto;background:none;border:none;color:var(--red);font-size:12px;font-weight:700;cursor:pointer;padding:4px 6px;flex:none}
.cal-add-btn{width:100%;margin-top:10px;background:var(--surf2);border:1px dashed var(--line);color:var(--gold-d);
border-radius:5px;padding:11px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
.cal-add{margin-top:12px;padding-top:12px;border-top:1px solid var(--line2)}
.cal-add-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
.cal-add-btns .btn{flex:none;padding:8px 18px}
.up-row{display:flex;gap:12px;padding:11px 2px;border-bottom:1px solid var(--line2)}
.up-date{flex:none;width:72px}
.up-date b{display:block;font-size:13px}
.up-dd{font-size:11px;color:var(--dim)} .up-dd.soon{color:var(--gold-d);font-weight:700} .up-dd.over{color:var(--red);font-weight:700}
.up-items{flex:1}
.up-item{font-size:13.5px;padding:2px 0;cursor:pointer;display:flex;align-items:center;gap:7px}
.up-item i{width:6px;height:6px;border-radius:50%;flex:none}
`;
