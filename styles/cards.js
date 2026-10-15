/* ═══════════ [07] 종 폴더·그룹 헤더 (성충 탭) ═══════════ */
.sp-grid{display:flex;flex-direction:column;gap:10px}
.sp-card{background:var(--surf);border:1px solid var(--line);border-radius:5px;padding:16px 17px;cursor:pointer;box-shadow:none;
display:flex;align-items:center;justify-content:space-between;gap:12px}
.sp-card-l{min-width:0;flex:1}
.sp-name{font-family:var(--serif);font-size:19px;font-weight:700;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-meta{font-size:12px;color:var(--dim);margin-top:6px;letter-spacing:.02em}
.sp-go{font-size:11px;color:var(--gold-d);font-weight:700;letter-spacing:.06em;text-transform:uppercase;flex:none;margin-left:12px}
.sp-back{color:var(--gold-d);font-size:14px;font-weight:600;cursor:pointer;padding:4px 0 12px}
.grp-head{display:flex;align-items:baseline;gap:8px;padding:2px 2px 10px;border-bottom:1.5px solid var(--text);margin-bottom:12px}
.grp-name{font-family:var(--serif);font-size:21px;font-weight:700;letter-spacing:.01em}
.grp-cnt{font-size:12px;color:var(--dim);font-weight:600;margin-left:auto}

/* ═══════════ [08] 라인표 (부♂ × 모♀) ═══════════ */

/* ═══════════ [09] 통계·패널·측정값 (유충/라인 상세) ═══════════ */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.stat{background:var(--surf);border:1px solid var(--line);border-radius:5px;padding:13px 13px}
.stat.hl{border-color:var(--gold);background:#FCFAF5}
.s-l{font-size:10px;color:var(--dim);margin-bottom:6px;letter-spacing:.08em;text-transform:uppercase}
.s-v{font-size:18px;font-weight:700;font-family:var(--serif)}
.stat.hl .s-v{color:var(--gold-d)}
.panel{background:var(--surf);border:1px solid var(--line);border-radius:5px;padding:16px 17px;margin-bottom:13px}
.p-t{font-family:var(--serif);font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px;letter-spacing:.01em;text-transform:none}
.p-t.lt{margin:24px 2px 13px}
.meas{display:flex;flex-wrap:wrap;gap:7px 18px;font-size:13px;color:var(--dim)}
.meas b{color:var(--text);font-weight:700}
.d-sub{color:var(--dim);font-size:13px;margin:-8px 0 20px;letter-spacing:.02em}
.acts{display:flex;gap:8px;margin-bottom:18px}
.acts .btn{flex:1;padding:13px 6px}

/* ═══════════ [10] 분양카드 (성충 상세 — BREEDING CARD) ═══════════ */
.bcard{background:var(--surf);border:1px solid var(--text);border-radius:7px;padding:28px 22px 20px;margin-bottom:16px;
box-shadow:0 2px 14px rgba(23,21,19,.07);text-align:center}
.bc-head{font-size:10px;letter-spacing:.42em;color:var(--gold-d);font-weight:700;font-family:-apple-system,sans-serif}
.bc-species{font-family:var(--serif);font-size:27px;font-weight:700;margin-top:12px;letter-spacing:.01em}
.bc-sub{font-size:12px;color:var(--dim);margin-top:8px;letter-spacing:.04em}
.bc-line{height:1px;background:var(--line);margin:18px 0}
/* 항목 수가 적으면 가운데로 모이도록 (4칸 고정이 아니라 유연 배치) */
.bc-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 6px}
.bc-grid > div{flex:1 1 22%;min-width:64px;max-width:25%;text-align:center}
.bc-grid .s-v{font-size:15px}
.bc-foot{font-size:12.5px;color:var(--dim);margin-top:9px;white-space:pre-wrap}
.bc-qr{font-size:10px;color:#BCB5A9;margin-top:20px;letter-spacing:.1em;text-transform:uppercase}
.bc-dead{display:inline-block;margin-top:10px;background:var(--text);color:#fff;font-size:10.5px;font-weight:700;
border-radius:999px;padding:3px 12px;letter-spacing:.06em}
.bc-lineage{margin-top:10px;font-size:12px;color:var(--gold-d);font-weight:600}
.bc-lineage b{font-weight:800}
.bc-photo{width:100%;max-height:280px;object-fit:cover;border-radius:6px;margin-bottom:16px;border:1px solid var(--line)}

/* ═══════════ [11] 사육이력 표 (성충 상세) ═══════════ */
.dtable{background:var(--surf);border:1px solid var(--line);border-radius:6px;overflow:hidden}
.dt-head{display:flex;padding:10px 14px;background:var(--surf2);border-bottom:1px solid var(--line);
font-size:10px;font-weight:700;color:var(--dim);letter-spacing:.08em;text-transform:uppercase}
.dt-row{display:flex;padding:11px 14px;border-bottom:1px solid var(--line2);cursor:pointer;align-items:baseline}
.dt-row:last-child{border-bottom:none}
.dt-date{flex:none;width:88px;font-size:13px}
.dt-ins{font-style:normal;font-size:10.5px;color:var(--green);font-weight:700;margin-left:5px}
.dt-feed{flex:1;min-width:0;font-size:12.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px}
.dt-w{flex:none;font-size:15px;font-weight:700;text-align:right;font-family:var(--serif)}

/* ═══════════ [12] 병갈이 기록·성장 그래프 (유충 상세) ═══════════ */
.rec{background:var(--surf);border:1px solid var(--line);border-radius:5px;padding:13px 16px;margin-bottom:9px;cursor:pointer}
.r-top{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.r-date{font-size:13px;color:var(--dim)}
.r-ins{font-size:11px;font-weight:700;color:var(--green);letter-spacing:.03em}
.r-w{font-size:18px;font-weight:700;margin-left:auto;font-family:var(--serif)}
.r-w em{font-style:normal;font-size:12px;font-weight:600;margin-left:5px;font-family:-apple-system,sans-serif}
.r-mid{font-size:12.5px;color:var(--dim);margin-top:6px}
.r-next{font-size:12.5px;color:var(--dim);margin-top:9px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.r-next b{color:var(--text)}
.r-memo{font-size:12.5px;color:var(--dim);margin-top:8px;border-top:1px dashed var(--line);padding-top:8px;white-space:pre-wrap}
.r-gap{font-size:11.5px;color:var(--dim);font-weight:600;background:var(--surf2);border-radius:4px;padding:1px 7px;margin-left:2px}
/* 현재 먹고 있는 병 — 날마다 카운팅 */
.r-gap.on{color:var(--gold-d);background:color-mix(in srgb,var(--gold) 14%,transparent);font-weight:700}
.spark-empty{font-size:11px;color:var(--dim);padding:8px 0}
.spark-range{font-size:11px;color:var(--dim);margin-top:4px}
/* 스파크라인 양 끝 무게 (선만으론 변화를 알 수 없어서) */
.spark-ends{display:flex;align-items:center;justify-content:center;gap:4px;
font-size:10.5px;color:var(--dim);margin-top:1px;letter-spacing:-.01em}
.spark-ends i{font-style:normal;font-size:9px;opacity:.6}
.spark-ends .e{color:var(--gold-d);font-weight:700}

/* ═══════════ [13] 특이 케이스 태그 (원더링·거식 등) ═══════════ */
.flag-show{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.flag-tag{background:#FBF1EE;color:#9A4A3A;border:1px solid #EBD3CC;border-radius:4px;
padding:2px 9px;font-size:11px;font-weight:700}
.chip.flag-mini{color:#9A4A3A;border-color:#EBD3CC;background:#FBF1EE}
.chip.gen{color:var(--gold-d);border-color:var(--gold);background:var(--surf2);letter-spacing:.02em}

/* ═══════════ [17.10] 라인 부·모 정보 카드 ═══════════ */
.pcard{display:flex;gap:12px;background:var(--surf);border:1px solid var(--line);border-left:3px solid var(--line);
border-radius:9px;padding:11px 12px;margin-bottom:8px;cursor:pointer;align-items:flex-start}
.pcard.male{border-left-color:#3E7BC4}
.pcard.female{border-left-color:#E0578F}
.pcard.empty{cursor:default;background:transparent;border-style:dashed}
.pcard-ph{width:74px;height:74px;object-fit:cover;border-radius:6px;border:1px solid var(--line);flex:none}
.pcard-r{min-width:0;flex:1}
.pcard-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pcard-role{font-size:12px;font-weight:800;color:var(--dim);letter-spacing:.02em}
.pcard.male .pcard-role{color:#3E7BC4}
.pcard.female .pcard-role{color:#E0578F}
.pcard-sub{font-size:12px;color:var(--dim);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pcard-meas{display:flex;flex-wrap:wrap;gap:3px 12px;margin-top:6px;font-size:12.5px}
.pcard-meas i{font-style:normal;color:var(--dim);font-size:11px}
.pcard-meas b{font-weight:700}

/* ♂♀ 기호가 이모지로 치환되며 기준선이 내려가는 것 방지 */
.app,.pcard-role,.chip,.tag,.card-sub,.d-sub,.meas{font-variant-emoji:text}

