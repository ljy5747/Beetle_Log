/* ═══════════ [14] 기본정보 (키-값 줄) ═══════════ */
.kv-row{display:flex;gap:12px;padding:7px 0;font-size:13.5px;border-bottom:1px solid var(--line2)}
.kv-row:last-child{border-bottom:none}
.kv-k{flex:none;width:52px;color:var(--dim);letter-spacing:.02em}
.kv-v{word-break:break-all;white-space:pre-wrap}

/* ═══════════ [15] 알림 배너 (병갈이 임박 등) ═══════════ */
.alert{display:flex;align-items:center;gap:9px;background:#FBF6EC;border:1px solid #E5D6B4;border-radius:5px;
padding:13px 15px;margin-bottom:14px;font-size:14px;cursor:pointer}
.alert b{font-weight:700;color:#7E632E}
.alert-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);flex:none;animation:pulse 1.8s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.alert-go{margin-left:auto;color:var(--gold-d);font-weight:700;font-size:13px;letter-spacing:.02em}

/* ═══════════ [16] 빈 화면·푸터 ═══════════ */
.empty{text-align:center;padding:54px 20px;color:var(--dim)}
.empty.sm{padding:24px}
.empty-icon{font-size:38px;margin-bottom:14px;opacity:.55;filter:grayscale(.3)}
.empty-t{font-family:var(--serif);font-size:19px;font-weight:700;color:var(--text);margin-bottom:10px}
.empty-d{font-size:13px;line-height:1.8}
.footer{margin-top:34px;text-align:center}
.note{font-size:12px;color:var(--dim);margin-bottom:12px;line-height:1.6}
.frow{display:flex;gap:8px;justify-content:center}

/* ═══════════ [17] FAB(+버튼)·토스트 알림 ═══════════ */
.fab{position:fixed;right:max(18px,calc(50% - 242px));bottom:calc(78px + env(safe-area-inset-bottom));width:56px;height:56px;border-radius:7px;
background:var(--text);color:#fff;border:none;font-size:28px;font-weight:300;cursor:pointer;
box-shadow:0 6px 22px rgba(23,21,19,.35)}
.toast{position:fixed;bottom:calc(132px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:var(--text);border:none;
color:#fff;border-radius:999px;padding:11px 19px;font-size:13.5px;font-weight:600;z-index:99;
box-shadow:0 8px 26px rgba(23,21,19,.3);white-space:nowrap;letter-spacing:.02em}

/* ═══════════ [17.5] 하단 탭바 ═══════════ */
.bnav{position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:100%;max-width:520px;
background:var(--surf);border-top:1px solid var(--line);display:flex;z-index:40;
padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -2px 14px rgba(23,21,19,.06)}
.bnav-b{flex:1;background:none;border:none;padding:8px 0 9px;cursor:pointer;font-family:inherit;
display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--dim)}
.bnav-b.on{color:var(--text)}
.bnav-b.on .bnav-l{font-weight:800}
.bnav-ic{font-size:22px;line-height:1;filter:grayscale(1) opacity(.55)}
.bnav-b.on .bnav-ic{filter:none}
.bnav-ic img{width:30px;height:30px;display:block;object-fit:contain;border-radius:8px}
.bnav-l{font-size:11px;font-weight:700;letter-spacing:.02em}

/* ═══════════ [17.6] 테마 선택 ═══════════ */
.thm-row{display:flex;gap:9px;margin-top:4px}
.thm{flex:1;background:var(--surf);border:1.5px solid var(--line);border-radius:11px;
padding:11px 8px 9px;cursor:pointer;font-family:inherit;color:var(--text);text-align:center}
.thm.on{border-color:var(--gold);box-shadow:0 0 0 2.5px color-mix(in srgb,var(--gold) 18%,transparent)}
.thm-dots{display:flex;justify-content:center;gap:4px;margin-bottom:7px}
.thm-dots i{width:15px;height:15px;border-radius:5px;border:1px solid rgba(0,0,0,.07)}
.thm-n{font-size:12px;font-weight:700}
.thm.on .thm-n{color:var(--gold-d);font-weight:800}

/* ═══════════ [17.7] 종 사진 빈칸 (디폴트 사진 없을 때 종 이름 표시) ═══════════ */
.sp-ph{display:flex;align-items:center;justify-content:center;background:var(--surf2);
border:1.5px dashed var(--line);color:var(--dim);font-size:10.5px;font-weight:700;
text-align:center;padding:4px;overflow:hidden;line-height:1.3;word-break:keep-all}
.bc-photo.sp-ph{min-height:110px;font-size:14px}

/* ═══════════ [17.9] 보기 전환 버튼 (종별 / 혈통별) ═══════════ */
.view-toggle{display:flex;gap:6px;margin-bottom:12px}
.vt-btn{flex:1;background:var(--surf);border:1px solid var(--line);color:var(--dim);border-radius:5px;
padding:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.02em}
.vt-btn.on{background:var(--text);color:#fff;border-color:var(--text)}

/* ═══════════ [17.8] 자동 백업 스냅샷 목록 ═══════════ */
.snap-row{display:flex;align-items:center;justify-content:space-between;gap:10px;
background:var(--surf);border:1px solid var(--line);border-radius:9px;padding:9px 11px;margin-bottom:7px}
.snap-d{font-size:13px;font-weight:700}
.snap-s{font-size:11px;color:var(--dim);margin-top:2px}

