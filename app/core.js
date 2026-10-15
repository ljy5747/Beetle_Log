/* ════════ 앱 본체 — 기능 추가/수정은 여기서 ════════ */
const { useState, useEffect, useRef } = React;
/* 설정값과 CSS는 data.js / styles.js 에서 불러옵니다 */
const { KEY, SUPABASE_URL, SUPABASE_KEY, SPECIES, SPECIES_TREE, INSTARS, FEED_TYPES, BOTTLES, FLAGS, GENS, FEED_PRODUCTS, STATUS_COLOR, STATUSES } = window.APP_DATA;
const CSS = window.APP_CSS;


/* ════════════════════ 유틸 ════════════════════ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, "0");
const fmtD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmtD(new Date());
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return fmtD(d); };
const dday = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
const num = (v) => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : null; };
const n1 = (v) => (v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString());
const n2 = (v) => (v == null ? "—" : (Math.round(v * 100) / 100).toLocaleString());
const shortDate = (iso) => (iso ? iso.slice(2).replace(/-/g, ".") : "");
/* ♂︎♀︎ 는 폰트에 따라 이모지로 바뀌며 기준선이 내려가므로, 텍스트 표현(U+FE0E)을 강제 */
const symTxt = (s) => String(s || "").replace(/([\u2642\u2640])/g, "$1︎");
/* 병 용량: 저장은 숫자만, 표시할 때 cc 붙임. 기존에 'cc'가 들어간 값도 안전 처리 */
const ccLabel = (v) => { const s = String(v || "").trim(); if (!s) return ""; return /^\d+(\.\d+)?$/.test(s) ? s + "cc" : s; };
/* 푸딩컵 기록은 병 번호에서 제외 (푸딩 다음에 넣은 병이 1병) */
const isPudding = (r) => !!(r && (r.pudding || /푸딩/.test(String(r.bottleSize || ""))));
/* 병갈이 D-day 색상 등급: 7일 이내 빨강 / 8~30일 노랑 / 그 이상 초록 */
const ddClass = (dd) => (dd <= 7 ? " dd-red" : dd <= 30 ? " dd-yellow" : " dd-green");
/* 데이터 '분량' 점수 — 자동 동기화에서 데이터가 확 줄어드는 사고를 감지하는 용도 */
function dataWeight(d) {
  if (!d) return 0;
  const ind = (d.individuals || []).length;
  const recs = (d.individuals || []).reduce((a, i) => a + ((i.bottleRecords || []).length), 0);
  return (d.parents || []).length + (d.lines || []).length + ind + recs;
}

/* 사진을 가로 최대 800px로 줄이고 JPEG로 압축해 base64로 반환 (용량 절약) */
function resizeImage(file, maxW = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ════════════════════ 클라우드 동기화 (Supabase) ════════════════════ */
const SB_HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};
/* 구글 로그인 계정(user:이메일)은 서버가 본인 확인을 할 수 있도록 로그인 토큰을 함께 보냄.
   동기화 키 방식(로그인 없음)은 기존처럼 공개키로 요청. */
const isAccountKey = (k) => typeof k === "string" && k.startsWith("user:");
async function cloudAuthHeaders(syncKey, forceRefresh) {
  if (!isAccountKey(syncKey)) return SB_HEADERS;
  let s = await authLoadSession();
  if (!s || !s.access) throw new Error("로그인이 필요해요");
  /* 액세스 토큰은 1시간이면 만료 → 50분 지났거나 401을 받았으면 갱신 */
  if (s.refresh && (forceRefresh || !s.at || Date.now() - s.at > 50 * 60 * 1000)) {
    const fresh = await authRefresh(s.refresh);
    if (fresh) s = fresh;
    else if (forceRefresh) throw new Error("로그인이 만료됐어요. 다시 로그인해 주세요");
  }
  return { ...SB_HEADERS, "Authorization": `Bearer ${s.access}` };
}
async function cloudFetch(syncKey, url, opts) {
  let res = await fetch(url, { ...opts, headers: { ...(await cloudAuthHeaders(syncKey, false)), ...(opts.extra || {}) } });
  if (res.status === 401 && isAccountKey(syncKey)) {
    res = await fetch(url, { ...opts, headers: { ...(await cloudAuthHeaders(syncKey, true)), ...(opts.extra || {}) } });
  }
  return res;
}
/* 동기화 키로 서버에 데이터 올리기 (있으면 갱신, 없으면 생성) */
async function cloudUpload(syncKey, data) {
  const body = JSON.stringify([{ user_key: syncKey, data, updated_at: new Date().toISOString() }]);
  const res = await cloudFetch(syncKey, `${SUPABASE_URL}/rest/v1/beetlelog_data?on_conflict=user_key`, {
    method: "POST",
    extra: { "Prefer": "resolution=merge-duplicates" },
    body,
  });
  if (!res.ok) throw new Error(`업로드 실패 (${res.status})`);
  return true;
}
/* 동기화 키로 서버에서 데이터 받기 (없으면 null) */
async function cloudDownload(syncKey) {
  const res = await cloudFetch(syncKey, `${SUPABASE_URL}/rest/v1/beetlelog_data?user_key=eq.${encodeURIComponent(syncKey)}&select=data,updated_at`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
  const rows = await res.json();
  return rows.length ? rows[0] : null;
}

/* ════════════════════ 구글 로그인 (Supabase Auth) ════════════════════ */
/* 로그인 시작: 구글 동의 화면으로 이동 → 끝나면 우리 앱으로 복귀 */
function authStartGoogle() {
  const redirect = window.location.origin + window.location.pathname;
  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
  window.location.href = url;
}
/* 복귀 시 주소(#access_token=...)에서 토큰을 꺼내 저장하고 주소를 깨끗이 정리 */
async function authHandleRedirect() {
  const hash = window.location.hash || "";
  if (!hash.includes("access_token")) return null;
  const p = new URLSearchParams(hash.slice(1));
  const access = p.get("access_token"), refresh = p.get("refresh_token");
  if (!access) return null;
  /* 주소창의 토큰 부분 제거 (새로고침해도 안 남게) */
  history.replaceState(null, "", window.location.origin + window.location.pathname);
  const session = { access, refresh, at: Date.now() };
  try { await idbSet("beetle-auth", JSON.stringify(session)); } catch (e) {}
  return session;
}
/* 저장된 로그인 세션 불러오기 */
async function authLoadSession() {
  try { const s = await idbGet("beetle-auth"); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
/* 갱신 토큰으로 새 액세스 토큰 발급 (액세스 토큰은 1시간이면 만료되므로) */
async function authRefresh(refreshToken) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j.access_token) return null;
    const session = { access: j.access_token, refresh: j.refresh_token || refreshToken, at: Date.now() };
    try { await idbSet("beetle-auth", JSON.stringify(session)); } catch (e) {}
    return session;
  } catch (e) { return null; }
}
/* 액세스 토큰으로 내 정보(이메일 등) 조회 */
async function authGetUser(access) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${access}` },
  });
  if (!res.ok) return null;
  return res.json();
}
/* 로그아웃: 저장된 세션 삭제 */
async function authSignOut() {
  try { await idbSet("beetle-auth", ""); } catch (e) {}
}

async function deliverFile(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  /* 방법1. iOS 공유 시트 — 앱 내 미리보기에서 가장 잘 동작 */
  try {
    const file = new File([blob], filename, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return "share";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "share"; /* 사용자가 공유창을 닫음 */
  }
  const url = URL.createObjectURL(blob);
  /* 방법2. ics는 새 창으로 열기 — Safari가 캘린더 등록 화면을 바로 띄움 */
  try {
    if (mime === "text/calendar") {
      const w = window.open(url, "_blank");
      if (w) { setTimeout(() => URL.revokeObjectURL(url), 60000); return "open"; }
    }
  } catch (e) { /* 차단 시 다음 방법으로 */ }
  /* 방법3. 일반 다운로드 */
  try {
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "download";
  } catch (e) { return "fail"; }
}

async function openCalendar(filename, ics) {
  /* iOS: .ics를 새 창에서 직접 열면 '캘린더에 추가' 화면이 바로 뜸 */
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  /* 방법1. 공유 시트 (파일로 저장 → 탭하면 캘린더) — iOS에서 가장 확실 */
  try {
    const file = new File([blob], filename, { type: "text/calendar" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "교체 일정" });
      return "share";
    }
  } catch (e) { if (e && e.name === "AbortError") return "share"; }
  /* 방법2. 새 창으로 열기 */
  try {
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) { setTimeout(() => URL.revokeObjectURL(url), 60000); return "open"; }
    /* 방법3. 같은 창에서 data URI로 이동 (팝업 차단 시) */
    if (isIOS) { window.location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics); return "open"; }
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); return "download";
  } catch (e) { return "fail"; }
}

function makeICS(summary, dateISO, desc) {
  const d = dateISO.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BeetleLog//KO", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${uid()}@beetlelog`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${summary}`, `DESCRIPTION:${desc}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${summary}`, "TRIGGER:PT9H", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

/* ════════════════════ 계산 ════════════════════ */
const sortedRecs = (ind) => [...(ind.bottleRecords || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
const latestRec = (ind) => { const s = sortedRecs(ind); return s.length ? s[s.length - 1] : null; };
const maxWeight = (ind) => { const ws = (ind.bottleRecords || []).map((r) => num(r.weight)).filter(Boolean); return ws.length ? Math.max(...ws) : null; };
const reduction = (ind) => { const L = num(ind.eclosion?.totalLength), W = num(ind.pupation?.pupaWeight); return L && W ? L / W : null; };
const lossRate = (ind) => { const mw = maxWeight(ind), pw = num(ind.pupation?.pupaWeight); return mw && pw ? (1 - pw / mw) * 100 : null; };
/* 가장 최근 병갈이의 두폭 (없으면 그 이전 기록에서) */
const lastHeadWidth = (ind) => { const s = sortedRecs(ind).map((r) => num(r.headWidth)).filter(Boolean); return s.length ? s[s.length - 1] : null; };
/* 병갈이 기록 중 한 번이라도 해당 플래그가 있었는지 */
/* 사망·분양 개체는 통계·그래프에서 제외 */
const isActive = (ind) => ind.status !== "사망" && ind.status !== "분양";
const hasFlag = (ind, flag) => (ind.flags || []).includes(flag) || (ind.bottleRecords || []).some((r) => (r.flags || []).includes(flag));
/* 개체에 표시된 특이사항 전체 (개체 표식 + 병갈이 기록) */
const allFlags = (ind) => {
  const set = [...(ind.flags || [])];
  (ind.bottleRecords || []).forEach((r) => (r.flags || []).forEach((f) => { if (!set.includes(f)) set.push(f); }));
  return set;
};
/* 유충 기간 = 첫 병 투입일 ~ 전용(또는 용화)일 */
const larvaDays = (ind) => {
  const recs = sortedRecs(ind);
  const s = recs.length ? recs[0].date : null;
  if (!s) return null;
  const e = ind.pupation?.prepupaDate || ind.pupation?.pupaDate;
  /* 아직 용화 전이면 오늘까지 경과 일수 (사육 중인 기간) */
  return e ? daysBetween(s, e) : daysBetween(s, today());
};
/* 용화가 끝나 확정된 기간인지 (아직 진행 중이면 false) */
const larvaDaysDone = (ind) => !!(ind.pupation?.prepupaDate || ind.pupation?.pupaDate);
const lastDelta = (ind) => {
  const s = sortedRecs(ind).map((r) => num(r.weight)).filter(Boolean);
  return s.length >= 2 ? s[s.length - 1] - s[s.length - 2] : null;
};

/* ════════════════════ 스파크라인 ════════════════════ */
function Spark({ ind, w = 96, h = 30, big }) {
  const recs = sortedRecs(ind).filter((r) => num(r.weight));
  const vs = recs.map((r) => num(r.weight));
  if (vs.length < 2) return <div className="spark-empty" />;
  const min = Math.min(...vs), max = Math.max(...vs), range = max - min || 1, p = 4;
  const pts = vs.map((v, i) => [p + (i * (w - 2 * p)) / (vs.length - 1), h - p - ((v - min) * (h - 2 * p)) / range]);
  const first = vs[0], last = vs[vs.length - 1];
  return (
    <div className="spark">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke="#6B8E4E" strokeWidth="1.5" strokeLinejoin="round" />
        {pts.map((q, i) => (
          <circle key={i} cx={q[0]} cy={q[1]} r={i === pts.length - 1 ? 3 : 1.7} fill={i === pts.length - 1 ? "#A8884F" : "#6B8E4E"} />
        ))}
      </svg>
      {/* 선만 있으면 변화를 알 수 없어 양 끝 무게를 함께 표시 */}
      <div className="spark-ends mono"><span>{n1(first)}</span><i>→</i><span className="e">{n1(last)}g</span></div>
      {big && <div className="spark-range mono">최대 {n1(max)}g</div>}
    </div>
  );
}

/* ════════════════════ 직접 정렬 (길게 눌러 위아래로 이동) ════════════════════
   ord 값이 있으면 그 순서, 없으면 뒤쪽에 번호순으로 */
const byOrder = (arr) => [...arr].sort((a, b) => {
  const ao = a.ord, bo = b.ord;
  if (ao != null && bo != null) return ao - bo;
  if (ao != null) return -1;
  if (bo != null) return 1;
  return String(a.code || "").localeCompare(String(b.code || ""), "ko", { numeric: true });
});

/* 순서 편집 목록 — '순서 편집' 버튼을 눌렀을 때만 동작 (오작동 방지) */
function Sortable({ items, editing, onReorder, children }) {
  const move = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= items.length) return;
    const ids = items.map((x) => x.id);
    ids.splice(to, 0, ids.splice(idx, 1)[0]);
    onReorder(ids);
  };
  if (!editing) return <>{items.map((it) => <div key={it.id}>{children(it)}</div>)}</>;
  return (
    <>
      {items.map((it, i) => (
        <div key={it.id} className="s-row">
          <div className="s-body">{children(it)}</div>
          <div className="s-btns">
            <button className="s-mv" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
            <button className="s-mv" disabled={i === items.length - 1} onClick={() => move(i, 1)}>▼</button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ════════════════════ 연도 구분 ════════════════════
   앱을 2026년에 만들었으므로, 연도 값이 없는 기존 데이터는 모두 2026으로 봄
   (기존 데이터를 수정하지 않고 읽을 때만 적용) */
const BASE_YEAR = 2026;
const PAST_YEAR = "~2025"; /* 2026 이전 기록을 모아두는 칸 */
const itemYear = (x) => String((x && x.year) || BASE_YEAR);
/* 이동 가능한 연도 목록: ~2025, 2026, …, 올해+1 (해가 바뀌면 자동으로 늘어남) */
const yearSeq = () => {
  const now = new Date().getFullYear();
  const max = Math.max(BASE_YEAR + 1, now + 1);
  const out = [PAST_YEAR];
  for (let y = BASE_YEAR; y <= max; y++) out.push(String(y));
  return out;
};
/* 탭 진입 시 기본으로 보여줄 연도 (당해 연도, 범위를 벗어나면 보정) */
const defaultYear = () => {
  const seq = yearSeq();
  const now = String(new Date().getFullYear());
  return seq.includes(now) ? now : seq[seq.length - 1];
};

/* 폼에서 고를 수 있는 연도 목록 */
const yearOptions = () => [...yearSeq()].reverse();

/* ‹ 2026 (12) › — 연도 이동 */
function YearNav({ value, onChange, count }) {
  const seq = yearSeq();
  const i = Math.max(0, seq.indexOf(value));
  return (
    <div className="year-nav">
      <button className="year-arrow" disabled={i <= 0} onClick={() => i > 0 && onChange(seq[i - 1])}>‹</button>
      <div className="year-cur">
        <span className="year-n mono">{seq[i]}</span>
        <span className="year-c">{count}</span>
      </div>
      <button className="year-arrow" disabled={i >= seq.length - 1} onClick={() => i < seq.length - 1 && onChange(seq[i + 1])}>›</button>
    </div>
  );
}


/* Account-specific notification preferences. Existing Supabase Auth JWT + RLS. */
const defaultNotificationPreferences = {
  push_enabled: false, breeding_enabled: true, reminder_enabled: true,
  record_change_enabled: false, advance_days: 1
};
async function notificationPreferencesRequest(method, userId, values) {
  const session = await authLoadSession();
  if (!session?.access) throw new Error("구글 로그인이 필요해요.");
  let authHeaders = await cloudAuthHeaders("user:authenticated", false);
  const url = SUPABASE_URL + "/rest/v1/notification_preferences" +
    (method === "GET" ? "?select=push_enabled,breeding_enabled,reminder_enabled,record_change_enabled,advance_days&limit=1" : "?on_conflict=user_id");
  const headers = { ...authHeaders, "Content-Type": "application/json" };
  if (method === "POST") headers.Prefer = "resolution=merge-duplicates,return=minimal";
  const result = await fetch(url, { method, headers,
    ...(method === "POST" ? {body: JSON.stringify({user_id:userId,...values,updated_at:new Date().toISOString()})} : {}) });
  if (!result.ok) throw new Error("알림 설정 서버 오류 (" + result.status + ")");
  return method === "GET" ? (await result.json())[0] || null : true;
}

