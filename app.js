/* ════════ 앱 본체 — 기능 추가/수정은 여기서 ════════ */
const { useState, useEffect, useRef } = React;
/* 설정값과 CSS는 data.js / styles.js 에서 불러옵니다 */
const { KEY, SUPABASE_URL, SUPABASE_KEY, SPECIES, INSTARS, FEED_TYPES, BOTTLES, FLAGS, FEED_PRODUCTS, STATUS_COLOR, STATUSES } = window.APP_DATA;
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
/* 병 용량: 저장은 숫자만, 표시할 때 cc 붙임. 기존에 'cc'가 들어간 값도 안전 처리 */
const ccLabel = (v) => { const s = String(v || "").trim(); return s ? (/cc$/i.test(s) ? s : s + "cc") : ""; };
/* 병갈이 D-day 색상 등급: 7일 이내 빨강 / 8~30일 노랑 / 그 이상 초록 */
const ddClass = (dd) => (dd <= 7 ? " dd-red" : dd <= 30 ? " dd-yellow" : " dd-green");

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
/* 동기화 키로 서버에 데이터 올리기 (있으면 갱신, 없으면 생성) */
async function cloudUpload(syncKey, data) {
  const body = JSON.stringify([{ user_key: syncKey, data, updated_at: new Date().toISOString() }]);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/beetlelog_data?on_conflict=user_key`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Prefer": "resolution=merge-duplicates" },
    body,
  });
  if (!res.ok) throw new Error(`업로드 실패 (${res.status})`);
  return true;
}
/* 동기화 키로 서버에서 데이터 받기 (없으면 null) */
async function cloudDownload(syncKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/beetlelog_data?user_key=eq.${encodeURIComponent(syncKey)}&select=data,updated_at`, {
    headers: SB_HEADERS,
  });
  if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
  const rows = await res.json();
  return rows.length ? rows[0] : null;
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
      await navigator.share({ files: [file], title: "병갈이 일정" });
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
const larvaDays = (ind, line) => {
  const s = line?.hatchDate || line?.breakdownDate;
  const e = ind.pupation?.prepupaDate || ind.pupation?.pupaDate;
  return s && e ? daysBetween(s, e) : null;
};
const lastDelta = (ind) => {
  const s = sortedRecs(ind).map((r) => num(r.weight)).filter(Boolean);
  return s.length >= 2 ? s[s.length - 1] - s[s.length - 2] : null;
};

/* ════════════════════ 스파크라인 ════════════════════ */
function Spark({ ind, w = 96, h = 30, big }) {
  const recs = sortedRecs(ind).filter((r) => num(r.weight));
  const vs = recs.map((r) => num(r.weight));
  if (vs.length < 2) return <div className="spark-empty">{vs.length ? "기록 1건" : "무게 기록 없음"}</div>;
  const min = Math.min(...vs), max = Math.max(...vs), range = max - min || 1, p = 4;
  const pts = vs.map((v, i) => [p + (i * (w - 2 * p)) / (vs.length - 1), h - p - ((v - min) * (h - 2 * p)) / range]);
  return (
    <div className="spark">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke="#6B8E4E" strokeWidth="1.5" strokeLinejoin="round" />
        {pts.map((q, i) => (
          <circle key={i} cx={q[0]} cy={q[1]} r={i === pts.length - 1 ? 3 : 1.7} fill={i === pts.length - 1 ? "#A8884F" : "#6B8E4E"} />
        ))}
      </svg>
      {big && <div className="spark-range mono">{n1(min)}g → 최대 {n1(max)}g</div>}
    </div>
  );
}

/* ════════════════════ 공용 UI ════════════════════ */
const F = ({ label, children, half }) => (
  <div className={"field" + (half ? " half" : "")}>
    <div className="label">{label}</div>
    {children}
  </div>
);

/* 균사/톱밥 브랜드 선택: 탭하면 샵별 제품 목록이 펼쳐지고, 맨 아래 직접 입력 */
function FeedPicker({ feedType, value, brands, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const groups = (FEED_PRODUCTS && FEED_PRODUCTS[feedType]) || [];
  const pick = (shop, item) => { onChange(`${shop} ${item}`); setOpen(false); setManual(false); };
  /* 직접 입력 모드거나, 목록에 없는 값이 이미 들어있으면 입력창 표시 */
  if (manual) {
    return (
      <div>
        <input className="in" list="dl-brands" value={value} autoFocus
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "직접 입력"} />
        <button className="btn tiny mt" onClick={() => { setManual(false); setOpen(true); }}>← 목록에서 선택</button>
        <datalist id="dl-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
      </div>
    );
  }
  return (
    <div>
      <button className="picker-btn" onClick={() => setOpen(!open)}>
        <span className={value ? "" : "dim"}>{value || placeholder || "탭하여 선택"}</span>
        <span className="picker-arrow">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="picker-panel">
          {groups.length === 0 && <div className="picker-empty">등록된 제품이 없어요. 직접 입력해주세요.</div>}
          {groups.map((g) => (
            <div key={g.shop} className="picker-group">
              <div className="picker-shop">{g.shop}</div>
              <div className="picker-items">
                {g.items.map((item) => {
                  const full = `${g.shop} ${item}`;
                  return (
                    <button key={item} className={"picker-item" + (value === full ? " on" : "")} onClick={() => pick(g.shop, item)}>{item}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <button className="picker-manual" onClick={() => { setManual(true); setOpen(false); }}>✏️ 직접 입력</button>
        </div>
      )}
    </div>
  );
}

function ConfirmBtn({ label, onConfirm, className }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (armed) { const t = setTimeout(() => setArmed(false), 2600); return () => clearTimeout(t); } }, [armed]);
  return (
    <button className={className} onClick={() => { if (armed) { onConfirm(); setArmed(false); } else setArmed(true); }}>
      {armed ? "한 번 더 누르면 실행됩니다" : label}
    </button>
  );
}

function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="mhead">
          <button className="hbtn" onClick={onClose}>취소</button>
          <div className="mtitle">{title}</div>
          <button className="hbtn primary" onClick={onSave}>저장</button>
        </div>
        <div className="mbody">{children}</div>
      </div>
    </div>
  );
}

/* 단순 목록 펼침 선택 (종 등): 탭하면 목록 펼침, 맨 아래 직접 입력 */
function SimplePicker({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  if (manual) {
    return (
      <div>
        <input className="in" value={value} autoFocus onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "직접 입력"} />
        <button className="btn tiny mt" onClick={() => { setManual(false); setOpen(true); }}>← 목록에서 선택</button>
      </div>
    );
  }
  return (
    <div>
      <button className="picker-btn" onClick={() => setOpen(!open)}>
        <span className={value ? "" : "dim"}>{value || placeholder || "탭하여 선택"}</span>
        <span className="picker-arrow">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="picker-panel">
          <div className="picker-items" style={{ padding: "11px 12px" }}>
            {options.map((opt) => (
              <button key={opt} className={"picker-item" + (value === opt ? " on" : "")} onClick={() => { onChange(opt); setOpen(false); }}>{opt}</button>
            ))}
          </div>
          <button className="picker-manual" onClick={() => { setManual(true); setOpen(false); }}>✏️ 직접 입력</button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════ 성충 등록/수정 폼 ════════════════════ */
function ParentForm({ initial, existingCodes, allParents, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    code: "", sex: "수컷 ♂", species: "", line: "", origin: "",
    totalLength: "", jawLength: "", jawWidth: "", jawThick: "", thoraxWidth: "", eclosionDate: "", source: "", memo: "", photo: "",
    sireId: "", damId: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const [photoBusy, setPhotoBusy] = useState(false);
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoBusy(true);
    try { const dataUrl = await resizeImage(file); set("photo", dataUrl); }
    catch { alert("사진을 불러오지 못했어요"); }
    setPhotoBusy(false);
    e.target.value = "";
  };
  const isEdit = !!initial;
  const isGeuktae = (f.species || "").includes("극태");
  const isDanchi = (f.species || "").includes("단치");
  const [showJaw, setShowJaw] = useState(!!(initial && (initial.jawWidth || initial.jawThick)));
  const save = () => {
    if (!f.code.trim()) return alert("관리번호는 필수입니다");
    if (!isEdit && existingCodes.includes(f.code.trim())) return alert("이미 사용 중인 관리번호입니다");
    onSave({ ...f, code: f.code.trim() });
  };
  return (
    <Modal title={isEdit ? "성충 정보 수정" : "성충 등록"} onClose={onClose} onSave={save}>
      <F label="사진">
        <label className="photo-pick">
          {f.photo ? (
            <img src={f.photo} alt="" className="photo-prev" />
          ) : (
            <div className="photo-empty">{photoBusy ? "처리 중…" : "📷 사진 추가 (탭하여 선택)"}</div>
          )}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={pickPhoto} />
        </label>
        {f.photo && (
          <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => set("photo", "")}>사진 제거</button>
        )}
      </F>
      <div className="row">
        <F label="관리번호 *" half><input className="in mono" value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="P-01" /></F>
        <F label="성별" half>
          <select className="in" value={f.sex} onChange={(e) => set("sex", e.target.value)}>
            <option>수컷 ♂</option><option>암컷 ♀</option>
          </select>
        </F>
      </div>
      <F label="종"><SimplePicker options={SPECIES} value={f.species} onChange={(v) => set("species", v)} placeholder="탭하여 선택" /></F>
      <div className="row">
        <F label="혈통 / 계보" half><input className="in" value={f.line} onChange={(e) => set("line", e.target.value)} /></F>
        <F label="산지" half><input className="in" value={f.origin} onChange={(e) => set("origin", e.target.value)} /></F>
      </div>
      <div className="sect">측정값</div>
      <div className="row">
        <F label="총장(체장) mm" half><input className="in mono" inputMode="decimal" value={f.totalLength} onChange={(e) => set("totalLength", e.target.value)} /></F>
        <F label="턱 길이 mm" half><input className="in mono" inputMode="decimal" value={f.jawLength} onChange={(e) => set("jawLength", e.target.value)} /></F>
      </div>
      {num(f.totalLength) && num(f.jawLength) && (
        <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>
          턱 비율 <b>{n1(num(f.jawLength) / num(f.totalLength) * 100)}%</b> (턱÷체장){isDanchi ? " · 단치 평가" : ""}
        </div>
      )}
      {(isGeuktae || showJaw) ? (
        <>
          {isGeuktae && <div className="hint" style={{ marginTop: -4, marginBottom: 8, color: "#937640" }}>극태 종 — 악폭·악후를 기록하세요</div>}
          <div className="row">
            <F label="악폭 mm" half><input className="in mono" inputMode="decimal" value={f.jawWidth} onChange={(e) => set("jawWidth", e.target.value)} /></F>
            <F label="악후 mm" half><input className="in mono" inputMode="decimal" value={f.jawThick} onChange={(e) => set("jawThick", e.target.value)} /></F>
          </div>
        </>
      ) : (
        <button className="btn tiny" style={{ marginBottom: 13 }} onClick={() => setShowJaw(true)}>+ 악폭·악후 입력</button>
      )}
      <F label="흉폭 mm"><input className="in mono" inputMode="decimal" value={f.thoraxWidth} onChange={(e) => set("thoraxWidth", e.target.value)} /></F>
      <div className="sect">부모 (혈통 연결)</div>
      {(!allParents || allParents.length === 0) && <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>다른 성충을 등록하면 이 성충의 부모로 연결할 수 있어요</div>}
      <div className="row">
        <F label="부 성충 ♂" half>
          <select className="in" value={f.sireId || ""} onChange={(e) => set("sireId", e.target.value)}>
            <option value="">미지정</option>
            {(allParents || []).filter((p) => p.sex.includes("수") && p.id !== (initial && initial.id)).map((p) => (
              <option key={p.id} value={p.id}>{[p.code, p.species, num(p.totalLength) ? `${n1(num(p.totalLength))}mm` : null].filter(Boolean).join(" · ")}</option>
            ))}
          </select>
        </F>
        <F label="모 성충 ♀" half>
          <select className="in" value={f.damId || ""} onChange={(e) => set("damId", e.target.value)}>
            <option value="">미지정</option>
            {(allParents || []).filter((p) => p.sex.includes("암") && p.id !== (initial && initial.id)).map((p) => (
              <option key={p.id} value={p.id}>{[p.code, p.species, num(p.totalLength) ? `${n1(num(p.totalLength))}mm` : null].filter(Boolean).join(" · ")}</option>
            ))}
          </select>
        </F>
      </div>

      <div className="sect">기타</div>
      <div className="row">
        <F label="우화일" half><input type="date" className="in" value={f.eclosionDate} onChange={(e) => set("eclosionDate", e.target.value)} /></F>
        <F label="입수처" half><input className="in" value={f.source} onChange={(e) => set("source", e.target.value)} placeholder="자가 / 샵명" /></F>
      </div>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
    </Modal>
  );
}

/* ════════════════════ 성충 사육이력 행 입력 폼 ════════════════════ */
function GrowthRowForm({ initial, brands, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    date: today(), instar: "", feedType: "균사", feedBrand: "", bottleSize: "", weight: "", memo: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => { if (!f.date) return alert("날짜는 필수입니다"); onSave(f); };
  return (
    <Modal title={initial ? "사육 이력 수정" : "사육 이력 추가"} onClose={onClose} onSave={save}>
      <div className="row">
        <F label="날짜 *" half><input type="date" className="in" value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
        <F label="령" half>
          <select className="in" value={f.instar} onChange={(e) => set("instar", e.target.value)}>
            <option value="">선택</option>{INSTARS.map((i) => <option key={i}>{i}</option>)}
          </select>
        </F>
      </div>
      <div className="row">
        <F label="무게 g" half><input className="in mono" inputMode="decimal" value={f.weight} onChange={(e) => set("weight", e.target.value)} placeholder="16.0" /></F>
        <F label="병 용량" half>
          <div className="cc-wrap">
            <input className="in mono" inputMode="numeric" value={f.bottleSize}
              onChange={(e) => set("bottleSize", e.target.value.replace(/[^0-9]/g, ""))} placeholder="800" />
            <span className="cc-suffix">cc</span>
          </div>
        </F>
      </div>
      <div className="row">
        <F label="먹이 종류" half>
          <select className="in" value={f.feedType} onChange={(e) => set("feedType", e.target.value)}>
            {FEED_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </F>
        <F label="브랜드" half><FeedPicker feedType={f.feedType} value={f.feedBrand} brands={brands} onChange={(v) => set("feedBrand", v)} placeholder="탭하여 선택" /></F>
      </div>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
      <datalist id="dl-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
    </Modal>
  );
}

/* ════════════════════ 라인 등록/수정 폼 ════════════════════ */
function LineForm({ initial, parents, existingCodes, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    code: "", fatherId: "", motherId: "", species: "", origin: "",
    setDate: "", breakdownDate: "", hatchDate: "", temp: "", place: "", memo: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isEdit = !!initial;
  const pick = (role, pid) => {
    const p = parents.find((x) => x.id === pid);
    setF((prev) => ({
      ...prev, [role]: pid,
      species: prev.species || p?.species || "",
      origin: prev.origin || p?.origin || "",
    }));
  };
  const save = () => {
    if (!f.code.trim()) return alert("라인명은 필수입니다");
    if (!isEdit && existingCodes.includes(f.code.trim())) return alert("이미 사용 중인 라인명입니다");
    onSave({ ...f, code: f.code.trim() });
  };
  return (
    <Modal title={isEdit ? "라인 정보 수정" : "새 라인 만들기"} onClose={onClose} onSave={save}>
      <F label="라인명 *"><input className="in mono" value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="26-A" /></F>
      <div className="sect">성충 조합</div>
      {parents.length === 0 && <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>성충 탭에서 부모를 먼저 등록하면 여기서 선택할 수 있어요</div>}
      <div className="row">
        <F label="부♂" half>
          <select className="in" value={f.fatherId || ""} onChange={(e) => pick("fatherId", e.target.value)}>
            <option value="">미지정</option>
            {parents.filter((p) => p.sex.includes("수")).map((p) => <option key={p.id} value={p.id}>{[p.code, p.species, num(p.totalLength) ? `${n1(num(p.totalLength))}mm` : null, p.line].filter(Boolean).join(" · ")}</option>)}
          </select>
        </F>
        <F label="모♀" half>
          <select className="in" value={f.motherId || ""} onChange={(e) => pick("motherId", e.target.value)}>
            <option value="">미지정</option>
            {parents.filter((p) => p.sex.includes("암")).map((p) => <option key={p.id} value={p.id}>{[p.code, p.species, num(p.totalLength) ? `${n1(num(p.totalLength))}mm` : null, p.line].filter(Boolean).join(" · ")}</option>)}
          </select>
        </F>
      </div>
      <div className="row">
        <F label="종" half><SimplePicker options={SPECIES} value={f.species} onChange={(v) => set("species", v)} placeholder="탭하여 선택" /></F>
        <F label="산지" half><input className="in" value={f.origin} onChange={(e) => set("origin", e.target.value)} /></F>
      </div>
      <div className="sect">날짜</div>
      <F label="산란 셋팅일"><input type="date" className="in" value={f.setDate} onChange={(e) => set("setDate", e.target.value)} /></F>
      {f.setDate && (
        <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>
          해체 권장: <b className="mono">{addDays(f.setDate, 21)}</b> ~ <b className="mono">{addDays(f.setDate, 60)}</b> (3주~2달). 캘린더에 자동 표시돼요
        </div>
      )}
      <div className="row">
        <F label="산란 해체일" half><input type="date" className="in" value={f.breakdownDate} onChange={(e) => set("breakdownDate", e.target.value)} /></F>
        <F label="부화일" half><input type="date" className="in" value={f.hatchDate} onChange={(e) => set("hatchDate", e.target.value)} /></F>
      </div>
      <div className="sect">사육 환경</div>
      <div className="row">
        <F label="사육 온도 ℃" half><input className="in mono" value={f.temp} onChange={(e) => set("temp", e.target.value)} placeholder="23~25" /></F>
        <F label="사육 장소" half><input className="in" value={f.place} onChange={(e) => set("place", e.target.value)} placeholder="온장고" /></F>
      </div>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
    </Modal>
  );
}

/* ════════════════════ 유충 일괄 추가 폼 ════════════════════ */
function LarvaAddForm({ line, existingCodes, onSave, onClose }) {
  const nextStart = (() => {
    const nums = existingCodes.map((c) => parseInt((c.match(/(\d+)\s*$/) || [])[1])).filter((n) => isFinite(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
  })();
  const [f, setF] = useState({ prefix: "", start: String(nextStart), count: "1", sex: "미구분", memo: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const start = parseInt(f.start), count = parseInt(f.count);
  const valid = isFinite(start) && start >= 0 && isFinite(count) && count >= 1 && count <= 100;
  const codes = valid ? Array.from({ length: count }, (_, i) => `${f.prefix}${pad(start + i)}`) : [];
  const dup = codes.find((c) => existingCodes.includes(c));
  const save = () => {
    if (!valid) return alert("시작 번호와 마릿수를 확인해주세요 (1~100마리)");
    if (dup) return alert(`'${dup}' 번호가 이미 이 라인에 있어요. 시작 번호를 바꿔주세요`);
    onSave(codes.map((code) => ({ code, sex: f.sex, memo: f.memo })));
  };
  return (
    <Modal title={`${line.code} 라인에 유충 추가`} onClose={onClose} onSave={save}>
      <div className="row">
        <F label="번호 접두어" half><input className="in mono" value={f.prefix} onChange={(e) => set("prefix", e.target.value)} placeholder="(선택) A-" /></F>
        <F label="시작 번호" half><input className="in mono" inputMode="numeric" value={f.start} onChange={(e) => set("start", e.target.value)} /></F>
      </div>
      <F label="마릿수">
        <input className="in mono" inputMode="numeric" value={f.count} onChange={(e) => set("count", e.target.value)} />
        <div className="chiprow">
          {[1, 5, 10, 20].map((n) => <button key={n} className="chipbtn" onClick={() => set("count", String(n))}>{n}마리</button>)}
        </div>
      </F>
      <F label="성별 (일괄 적용)">
        <select className="in" value={f.sex} onChange={(e) => set("sex", e.target.value)}>
          <option>미구분</option><option>수컷 ♂</option><option>암컷 ♀</option>
        </select>
      </F>
      <F label="공통 메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
      {valid && (
        <div className="hint" style={{ fontSize: 13 }}>
          생성될 번호: <b className="mono">{codes[0]}</b>{count > 1 && <> ~ <b className="mono">{codes[codes.length - 1]}</b></>} ({count}마리)
          {dup && <span style={{ color: "#B4503F" }}> · ⚠️ 중복 번호 있음</span>}
        </div>
      )}
    </Modal>
  );
}

/* ════════════════════ 유충 정보 수정 폼 ════════════════════ */
function LarvaEditForm({ initial, lines, onSave, onClose }) {
  const [f, setF] = useState({ code: initial.code, sex: initial.sex || "미구분", status: initial.status, lineId: initial.lineId, memo: initial.memo || "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.code.trim()) return alert("관리번호는 필수입니다");
    onSave({ ...f, code: f.code.trim() });
  };
  return (
    <Modal title="유충 정보 수정" onClose={onClose} onSave={save}>
      <div className="row">
        <F label="관리번호 *" half><input className="in mono" value={f.code} onChange={(e) => set("code", e.target.value)} /></F>
        <F label="성별" half>
          <select className="in" value={f.sex} onChange={(e) => set("sex", e.target.value)}>
            <option>미구분</option><option>수컷 ♂</option><option>암컷 ♀</option>
          </select>
        </F>
      </div>
      <F label="상태">
        <select className="in" value={f.status} onChange={(e) => set("status", e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </F>
      <F label="소속 라인">
        <select className="in" value={f.lineId} onChange={(e) => set("lineId", e.target.value)}>
          {lines.map((l) => <option key={l.id} value={l.id}>{l.code}{l.species ? ` · ${l.species}` : ""}</option>)}
        </select>
      </F>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
    </Modal>
  );
}

/* ════════════════════ 병갈이 폼 ════════════════════ */
function BottleForm({ initial, brands, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    date: today(), instar: "", weight: "", headWidth: "",
    feedType: "균사", feedBrand: "", bottleSize: "", nextDate: "", memo: "", flags: [],
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleFlag = (flag) => setF((p) => {
    const cur = p.flags || [];
    return { ...p, flags: cur.includes(flag) ? cur.filter((x) => x !== flag) : [...cur, flag] };
  });
  const save = () => { if (!f.date) return alert("날짜는 필수입니다"); onSave(f); };
  return (
    <Modal title={initial ? "병갈이 기록 수정" : "병갈이 기록"} onClose={onClose} onSave={save}>
      <div className="row">
        <F label="병갈이 날짜 *" half><input type="date" className="in" value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
        <F label="령" half>
          <select className="in" value={f.instar} onChange={(e) => set("instar", e.target.value)}>
            <option value="">선택</option>{INSTARS.map((i) => <option key={i}>{i}</option>)}
          </select>
        </F>
      </div>
      <div className="row">
        <F label="유충 무게 g" half><input className="in mono" inputMode="decimal" value={f.weight} onChange={(e) => set("weight", e.target.value)} placeholder="34.2" /></F>
        <F label="두폭 mm" half><input className="in mono" inputMode="decimal" value={f.headWidth} onChange={(e) => set("headWidth", e.target.value)} /></F>
      </div>
      <div className="row">
        <F label="먹이 종류" half>
          <select className="in" value={f.feedType} onChange={(e) => set("feedType", e.target.value)}>
            {FEED_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </F>
        <F label="병 용량" half>
          <div className="cc-wrap">
            <input className="in mono" inputMode="numeric" value={f.bottleSize}
              onChange={(e) => set("bottleSize", e.target.value.replace(/[^0-9]/g, ""))} placeholder="1400" />
            <span className="cc-suffix">cc</span>
          </div>
          <div className="chiprow">
            {BOTTLES.map((b) => <button key={b} className="chipbtn" onClick={() => set("bottleSize", b)}>{b}</button>)}
          </div>
        </F>
      </div>
      <F label="브랜드 · 제품명"><FeedPicker feedType={f.feedType} value={f.feedBrand} brands={brands} onChange={(v) => set("feedBrand", v)} placeholder="탭하여 선택" /></F>
      <F label="다음 병갈이 예정일">
        <input type="date" className="in" value={f.nextDate} onChange={(e) => set("nextDate", e.target.value)} />
        <div className="chiprow">
          {[40, 90, 100, 120].map((d) => (
            <button key={d} className="chipbtn" onClick={() => set("nextDate", addDays(f.date || today(), d))}>+{d}일</button>
          ))}
        </div>
        <div className="hint">예정일을 정하면 캘린더 탭에 자동으로 표시돼요</div>
      </F>
      <F label="특이 케이스 (해당 시 선택)">
        <div className="flagrow">
          {FLAGS.map((flag) => (
            <button key={flag} className={"flag-chip" + ((f.flags || []).includes(flag) ? " on" : "")} onClick={() => toggleFlag(flag)}>
              {(f.flags || []).includes(flag) ? "✓ " : ""}{flag}
            </button>
          ))}
        </div>
      </F>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} placeholder="식흔 상태 등" /></F>
      <datalist id="dl-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
    </Modal>
  );
}

/* ════════════════════ 일괄 병갈이 폼 ════════════════════ */
function BulkBottleForm({ larvae, brands, onSave, onClose }) {
  /* 유충 상태인 개체만 대상, 기본은 전체 선택 */
  const targets = larvae.filter((i) => i.status === "유충");
  const [picked, setPicked] = useState(() => new Set(targets.map((i) => i.id)));
  const [f, setF] = useState({
    date: today(), instar: "", feedType: "균사", feedBrand: "", bottleSize: "", nextDate: "", memo: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (id) => setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = picked.size === targets.length;
  const save = () => {
    if (!f.date) return alert("날짜는 필수입니다");
    if (picked.size === 0) return alert("적용할 유충을 1마리 이상 선택해주세요");
    onSave([...picked], f);
  };
  return (
    <Modal title="일괄 병갈이" onClose={onClose} onSave={save}>
      {targets.length === 0 ? (
        <div className="hint">병갈이할 수 있는 유충(상태=유충)이 없어요.</div>
      ) : (
        <>
          <div className="sect">공통 입력값 (선택한 유충에 동일 적용)</div>
          <div className="row">
            <F label="병갈이 날짜 *" half><input type="date" className="in" value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
            <F label="령" half>
              <select className="in" value={f.instar} onChange={(e) => set("instar", e.target.value)}>
                <option value="">선택</option>{INSTARS.map((i) => <option key={i}>{i}</option>)}
              </select>
            </F>
          </div>
          <div className="row">
            <F label="먹이 종류" half>
              <select className="in" value={f.feedType} onChange={(e) => set("feedType", e.target.value)}>
                {FEED_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </F>
            <F label="병 용량" half>
          <div className="cc-wrap">
            <input className="in mono" inputMode="numeric" value={f.bottleSize}
              onChange={(e) => set("bottleSize", e.target.value.replace(/[^0-9]/g, ""))} placeholder="1400" />
            <span className="cc-suffix">cc</span>
          </div>
          <div className="chiprow">
            {BOTTLES.map((b) => <button key={b} className="chipbtn" onClick={() => set("bottleSize", b)}>{b}</button>)}
          </div>
        </F>
          </div>
          <F label="브랜드 · 제품명"><FeedPicker feedType={f.feedType} value={f.feedBrand} brands={brands} onChange={(v) => set("feedBrand", v)} placeholder="탭하여 선택" /></F>
          <F label="다음 병갈이 예정일">
            <input type="date" className="in" value={f.nextDate} onChange={(e) => set("nextDate", e.target.value)} />
            <div className="chiprow">
              {[40, 90, 100, 120].map((d) => (
                <button key={d} className="chipbtn" onClick={() => set("nextDate", addDays(f.date || today(), d))}>+{d}일</button>
              ))}
            </div>
          </F>
          <F label="공통 메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} placeholder="유충별 무게는 저장 후 각각 입력하세요" /></F>

          <div className="sect" style={{ display: "flex", alignItems: "center" }}>
            적용 대상 {picked.size}/{targets.length}
            <button className="btn tiny" style={{ marginLeft: "auto" }} onClick={() => setPicked(allOn ? new Set() : new Set(targets.map((i) => i.id)))}>
              {allOn ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div className="pick-grid">
            {targets.map((i) => (
              <button key={i.id} className={"pick-chip" + (picked.has(i.id) ? " on" : "")} onClick={() => toggle(i.id)}>
                {picked.has(i.id) ? "✓ " : ""}{i.code}
              </button>
            ))}
          </div>
          <div className="hint">무게·두폭은 개체마다 다르니, 일괄 저장 후 각 유충에서 따로 입력하면 돼요.</div>
        </>
      )}
    </Modal>
  );
}

/* ════════════════════ 용화 폼 ════════════════════ */
function PupationForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { prepupaDate: "", pupaDate: "", pupaWeight: "", memo: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="용화 기록" onClose={onClose} onSave={() => onSave(f)}>
      <div className="row">
        <F label="전용일" half><input type="date" className="in" value={f.prepupaDate} onChange={(e) => set("prepupaDate", e.target.value)} /></F>
        <F label="용화일" half><input type="date" className="in" value={f.pupaDate} onChange={(e) => set("pupaDate", e.target.value)} /></F>
      </div>
      <F label="번데기 무게 g — 환원율 기준값"><input className="in mono" inputMode="decimal" value={f.pupaWeight} onChange={(e) => set("pupaWeight", e.target.value)} /></F>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} placeholder="원더링 여부 등" /></F>
    </Modal>
  );
}

/* ════════════════════ 우화 폼 ════════════════════ */
function EclosionForm({ initial, species, onSave, onClose }) {
  const [f, setF] = useState(initial || { date: today(), totalLength: "", jawLength: "", jawWidth: "", jawThick: "", headWidth: "", thoraxWidth: "", abdomenLength: "", defect: false, memo: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const sp = species || "";
  const isGeuktae = sp.includes("극태");
  const isDanchi = sp.includes("단치");
  /* 극태면 악폭·악후 자동 표시. 아니어도 사용자가 펼칠 수 있게 */
  const [showJaw, setShowJaw] = useState(isGeuktae || !!(initial && (initial.jawWidth || initial.jawThick)));
  return (
    <Modal title="우화 기록" onClose={onClose} onSave={() => onSave(f)}>
      <F label="우화일"><input type="date" className="in" value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
      <div className="row">
        <F label="총장(체장) mm" half><input className="in mono" inputMode="decimal" value={f.totalLength} onChange={(e) => set("totalLength", e.target.value)} /></F>
        <F label="턱 길이 mm" half><input className="in mono" inputMode="decimal" value={f.jawLength} onChange={(e) => set("jawLength", e.target.value)} /></F>
      </div>
      {num(f.totalLength) && num(f.jawLength) && (
        <div className="hint" style={{ marginTop: -4 }}>
          턱 비율 <b>{n1(num(f.jawLength) / num(f.totalLength) * 100)}%</b> (턱÷체장){isDanchi ? " · 단치 평가" : ""}
        </div>
      )}
      {showJaw ? (
        <>
          {isGeuktae && <div className="hint" style={{ marginTop: 2, marginBottom: 8, color: "#937640" }}>극태 종 — 악폭·악후를 기록하세요</div>}
          <div className="row">
            <F label="악폭 mm" half><input className="in mono" inputMode="decimal" value={f.jawWidth} onChange={(e) => set("jawWidth", e.target.value)} /></F>
            <F label="악후 mm" half><input className="in mono" inputMode="decimal" value={f.jawThick} onChange={(e) => set("jawThick", e.target.value)} /></F>
          </div>
        </>
      ) : (
        <button className="btn tiny" style={{ marginBottom: 13 }} onClick={() => setShowJaw(true)}>+ 악폭·악후 입력</button>
      )}
      <div className="row">
        <F label="두폭 mm" half><input className="in mono" inputMode="decimal" value={f.headWidth} onChange={(e) => set("headWidth", e.target.value)} /></F>
        <F label="흉폭 mm" half><input className="in mono" inputMode="decimal" value={f.thoraxWidth} onChange={(e) => set("thoraxWidth", e.target.value)} /></F>
      </div>
      <F label="배 길이 mm"><input className="in mono" inputMode="decimal" value={f.abdomenLength} onChange={(e) => set("abdomenLength", e.target.value)} /></F>
      <F label="우화부전">
        <button className={"toggle" + (f.defect ? " on" : "")} onClick={() => set("defect", !f.defect)}>
          {f.defect ? "있음" : "없음"}
        </button>
      </F>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
    </Modal>
  );
}

/* ════════════════════ 엑셀 내보내기 ════════════════════ */
function exportXLSX(data) {
  const lineById = Object.fromEntries(data.lines.map((l) => [l.id, l]));
  const parentById = Object.fromEntries(data.parents.map((p) => [p.id, p]));
  const sheet1 = data.individuals.map((ind) => {
    const L = lineById[ind.lineId] || {};
    const fa = parentById[L.fatherId] || {}, mo = parentById[L.motherId] || {};
    return {
      "라인": L.code || "", "관리번호": ind.code, "종": L.species || "", "산지": L.origin || "",
      "성별": ind.sex, "상태": ind.status,
      "산란셋팅일": L.setDate || "", "산란해체일": L.breakdownDate || "", "부화일": L.hatchDate || "",
      "부 관리번호": fa.code || "", "부 총장(mm)": fa.totalLength || "", "부 턱길이(mm)": fa.jawLength || "", "부 흉폭(mm)": fa.thoraxWidth || "",
      "모 관리번호": mo.code || "", "모 총장(mm)": mo.totalLength || "",
      "사육온도": L.temp || "", "사육장소": L.place || "",
      "최대 유충무게(g)": maxWeight(ind) ?? "", "병갈이 횟수": (ind.bottleRecords || []).length,
      "전용일": ind.pupation?.prepupaDate || "", "용화일": ind.pupation?.pupaDate || "", "번데기 무게(g)": ind.pupation?.pupaWeight || "",
      "우화일": ind.eclosion?.date || "", "총장(mm)": ind.eclosion?.totalLength || "", "턱 길이(mm)": ind.eclosion?.jawLength || "",
      "악폭(mm)": ind.eclosion?.jawWidth || "", "악후(mm)": ind.eclosion?.jawThick || "",
      "두폭(mm)": ind.eclosion?.headWidth || "", "흉폭(mm)": ind.eclosion?.thoraxWidth || "", "배 길이(mm)": ind.eclosion?.abdomenLength || "",
      "우화부전": ind.eclosion ? (ind.eclosion.defect ? "O" : "X") : "",
      "환원율(mm/g)": reduction(ind) != null ? Math.round(reduction(ind) * 100) / 100 : "",
      "로스율(%)": lossRate(ind) != null ? Math.round(lossRate(ind) * 10) / 10 : "",
      "유충기간(일)": larvaDays(ind, L) ?? "", "메모": ind.memo || "",
    };
  });
  const sheet2 = [];
  data.individuals.forEach((ind) => {
    const L = lineById[ind.lineId] || {};
    sortedRecs(ind).forEach((r) => sheet2.push({
      "라인": L.code || "", "관리번호": ind.code, "종": L.species || "", "날짜": r.date, "령": r.instar,
      "유충무게(g)": r.weight, "두폭(mm)": r.headWidth, "먹이종류": r.feedType, "브랜드": r.feedBrand,
      "병용량": ccLabel(r.bottleSize), "다음 예정일": r.nextDate, "메모": r.memo,
    }));
  });
  const sheetP = data.parents.map((p) => ({
    "관리번호": p.code, "성별": p.sex, "종": p.species, "혈통": p.line, "산지": p.origin,
    "총장(mm)": p.totalLength, "턱 길이(mm)": p.jawLength, "악폭(mm)": p.jawWidth || "", "악후(mm)": p.jawThick || "", "흉폭(mm)": p.thoraxWidth,
    "우화일": p.eclosionDate, "입수처": p.source, "메모": p.memo,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), "개체정보");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), "병갈이기록");
  if (sheetP.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetP), "성충");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const xmime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return deliverFile(`사육기록_${today()}.xlsx`, new Blob([out], { type: xmime }), xmime);
}

/* ════════════════════ 엑셀 가져오기 양식 다운로드 ════════════════════ */
async function downloadTemplate() {
  /* 드롭다운 목록 준비 */
  const speciesOpts = SPECIES;
  const sexParent = ["수컷", "암컷"];
  const sexLarva = ["수컷", "암컷", "미구분"];
  const statusOpts = ["유충", "용화", "우화", "사망", "분양"];
  const instarOpts = INSTARS;
  const feedTypeOpts = FEED_TYPES;
  const bottleOpts = BOTTLES;
  /* 균사+톱밥 브랜드를 "샵 제품" 형태로 합치기 */
  const brandOpts = [];
  Object.keys(FEED_PRODUCTS || {}).forEach((cat) => {
    (FEED_PRODUCTS[cat] || []).forEach((g) => {
      (g.items || []).forEach((it) => brandOpts.push(`${g.shop} ${it}`));
    });
  });
  /* 엑셀 드롭다운은 목록 문자열이 255자를 넘으면 깨지므로, 숨김 시트에 목록을 넣고 범위로 참조 */
  const wb = new ExcelJS.Workbook();

  /* 숨김 시트: 드롭다운 원본 목록 */
  const listSheet = wb.addWorksheet("목록");
  const lists = {
    종: speciesOpts, 성별P: sexParent, 성별L: sexLarva, 상태: statusOpts,
    령: instarOpts, 먹이종류: feedTypeOpts, 병용량: bottleOpts, 브랜드: brandOpts,
  };
  const colNames = Object.keys(lists);
  colNames.forEach((name, ci) => {
    const colLetter = String.fromCharCode(65 + ci); /* A, B, C... */
    listSheet.getCell(`${colLetter}1`).value = name;
    lists[name].forEach((v, ri) => { listSheet.getCell(`${colLetter}${ri + 2}`).value = v; });
  });
  const rangeOf = (name) => {
    const ci = colNames.indexOf(name);
    const colLetter = String.fromCharCode(65 + ci);
    return `목록!$${colLetter}$2:$${colLetter}$${lists[name].length + 1}`;
  };
  listSheet.state = "veryHidden"; /* 사용자에게 안 보이게 */

  /* 드롭다운을 특정 열에 N행까지 적용하는 헬퍼 */
  const ROWS = 200;
  const applyDV = (ws, colLetter, listName) => {
    for (let r = 2; r <= ROWS; r++) {
      ws.getCell(`${colLetter}${r}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [rangeOf(listName)],
      };
    }
  };

  /* 헤더만 채우고 시트 만들기 */
  const makeSheet = (name, headers) => {
    const ws = wb.addWorksheet(name);
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };
    headers.forEach((h, i) => { ws.getColumn(i + 1).width = Math.max(12, Math.min(22, h.length + 4)); });
    return ws;
  };
  const colL = (i) => String.fromCharCode(65 + i); /* 0→A */

  /* 사용법 */
  const guide = wb.addWorksheet("사용법");
  [
    ["이 파일의 각 시트(성충/라인/유충/병갈이기록)를 채운 뒤, 앱 ⚙️설정 → '엑셀 불러오기'로 올리세요."],
    ["색 있는 칸(종·성별·상태·령·먹이종류·브랜드·병용량)은 셀을 누르면 ▼ 목록에서 고를 수 있어요. (PC 엑셀 권장)"],
    ["라인의 '부/모 관리번호'는 성충 시트의 관리번호와 같아야 연결됩니다."],
    ["유충의 '소속 라인명'은 라인 시트의 라인명과 같아야 연결됩니다."],
    ["병갈이기록: 한 유충이 여러 번 병갈이했으면 줄을 여러 개 적으세요(관리번호+소속라인으로 찾음)."],
    ["같은 항목은 최신 정보로 갱신됩니다. 병갈이는 같은 날짜면 건너뜁니다."],
    ["날짜는 2026-03-15 형식으로 적어주세요."],
  ].forEach((r) => guide.addRow(r));
  guide.getColumn(1).width = 80;

  /* 성충 */
  const pHeaders = ["관리번호", "성별(수컷/암컷)", "종", "혈통", "산지", "총장(mm)", "턱길이(mm)", "악폭(mm)", "악후(mm)", "흉폭(mm)", "우화일(YYYY-MM-DD)", "입수처", "메모"];
  const pWs = makeSheet("성충", pHeaders);
  pWs.addRow(["P-01", "수컷", "왕사슴벌레(극태)", "", "", 85.5, "", "", "", "", "", "샵명", ""]);
  pWs.addRow(["P-02", "암컷", "왕사슴벌레(극태)", "", "", 52.0, "", "", "", "", "", "", ""]);
  applyDV(pWs, colL(pHeaders.indexOf("성별(수컷/암컷)")), "성별P");
  applyDV(pWs, colL(pHeaders.indexOf("종")), "종");

  /* 라인 */
  const lHeaders = ["라인명", "부 관리번호", "모 관리번호", "종", "산지", "산란셋팅일(YYYY-MM-DD)", "산란해체일(YYYY-MM-DD)", "부화일(YYYY-MM-DD)", "온도", "장소", "메모"];
  const lWs = makeSheet("라인", lHeaders);
  lWs.addRow(["26-A", "P-01", "P-02", "왕사슴벌레(극태)", "", "", "", "", "23~25", "", ""]);
  applyDV(lWs, colL(lHeaders.indexOf("종")), "종");

  /* 유충 */
  const gHeaders = ["관리번호", "소속 라인명", "성별(수컷/암컷/미구분)", "상태(유충/용화/우화/사망/분양)", "메모",
    "전용일(YYYY-MM-DD)", "용화일(YYYY-MM-DD)", "번데기무게(g)",
    "우화일(YYYY-MM-DD)", "성충총장(mm)", "턱길이(mm)", "악폭(mm)", "악후(mm)", "두폭(mm)", "흉폭(mm)", "배길이(mm)", "우화부전(O/X)"];
  const gWs = makeSheet("유충", gHeaders);
  gWs.addRow(["A-01", "26-A", "미구분", "유충", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  gWs.addRow(["A-02", "26-A", "미구분", "유충", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  applyDV(gWs, colL(gHeaders.indexOf("성별(수컷/암컷/미구분)")), "성별L");
  applyDV(gWs, colL(gHeaders.indexOf("상태(유충/용화/우화/사망/분양)")), "상태");

  /* 병갈이기록 */
  const bHeaders = ["관리번호", "소속 라인명", "병갈이날짜(YYYY-MM-DD)", "령", "유충무게(g)", "두폭(mm)", "먹이종류(균사/발효톱밥)", "브랜드", "병용량(cc)", "다음예정일(YYYY-MM-DD)", "메모"];
  const bWs = makeSheet("병갈이기록", bHeaders);
  bWs.addRow(["A-01", "26-A", "2026-03-15", "3령 초기", 18.5, "", "균사", "뿔샵 오오히라", "1400", "", ""]);
  bWs.addRow(["A-01", "26-A", "2026-05-20", "3령 중기", 28.0, "", "균사", "뿔샵 오오히라", "2000", "", ""]);
  applyDV(bWs, colL(bHeaders.indexOf("령")), "령");
  applyDV(bWs, colL(bHeaders.indexOf("먹이종류(균사/발효톱밥)")), "먹이종류");
  applyDV(bWs, colL(bHeaders.indexOf("브랜드")), "브랜드");
  applyDV(bWs, colL(bHeaders.indexOf("병용량(cc)")), "병용량");

  const buf = await wb.xlsx.writeBuffer();
  const xmime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return deliverFile(`사육기록_양식.xlsx`, new Blob([buf], { type: xmime }), xmime);
}

/* 엑셀 파일 → 데이터 객체로 파싱 (성충/라인/유충 추가) */
function parseImportXLSX(arrayBuffer, data) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = (name) => { const ws = wb.Sheets[name]; return ws ? XLSX.utils.sheet_to_json(ws, { defval: "" }) : []; };
  const str = (v) => String(v == null ? "" : v).trim();
  const sexNorm = (v) => { const s = str(v); if (s.includes("수")) return "수컷 ♂"; if (s.includes("암")) return "암컷 ♀"; return "미구분"; };
  /* 엑셀 칸이 비어있으면 기존 값 유지, 값이 있으면 새 값으로 (빈칸이 기존 데이터를 지우지 않게) */
  const keep = (newV, oldV) => { const s = str(newV); return s !== "" ? s : (oldV || ""); };

  let parents = [...data.parents];
  let lines = [...data.lines];
  let individuals = [...data.individuals];
  const report = { parentsNew: 0, parentsUpd: 0, linesNew: 0, linesUpd: 0, larvaeNew: 0, larvaeUpd: 0, skipped: 0 };

  /* 1) 성충 — 종+관리번호가 같으면 덮어쓰기, 없으면 추가 */
  const findParent = (code, species) => parents.find((p) => p.code === code && (p.species || "") === species);
  sheet("성충").forEach((row) => {
    const code = str(row["관리번호"]);
    if (!code) return;
    const species = str(row["종"]);
    const existing = findParent(code, species);
    if (existing) {
      Object.assign(existing, {
        sex: keep(row["성별(수컷/암컷)"], existing.sex) || sexNorm(row["성별(수컷/암컷)"]),
        line: keep(row["혈통"], existing.line), origin: keep(row["산지"], existing.origin),
        totalLength: keep(row["총장(mm)"], existing.totalLength), jawLength: keep(row["턱길이(mm)"], existing.jawLength),
        thoraxWidth: keep(row["흉폭(mm)"], existing.thoraxWidth), eclosionDate: keep(row["우화일(YYYY-MM-DD)"], existing.eclosionDate),
        source: keep(row["입수처"], existing.source), memo: keep(row["메모"], existing.memo),
      });
      if (str(row["성별(수컷/암컷)"])) existing.sex = sexNorm(row["성별(수컷/암컷)"]);
      report.parentsUpd++;
    } else {
      parents.push({
        id: uid(), code, sex: sexNorm(row["성별(수컷/암컷)"]), species,
        line: str(row["혈통"]), origin: str(row["산지"]),
        totalLength: str(row["총장(mm)"]), jawLength: str(row["턱길이(mm)"]), thoraxWidth: str(row["흉폭(mm)"]),
        eclosionDate: str(row["우화일(YYYY-MM-DD)"]), source: str(row["입수처"]), memo: str(row["메모"]),
        status: "생존", photo: "", growthRecords: [],
      });
      report.parentsNew++;
    }
  });
  /* 부/모 연결용: 관리번호 → id (덮어쓰기 후 최신 상태로) */
  const codeToParentId = {};
  parents.forEach((p) => { codeToParentId[p.code] = p.id; });

  /* 2) 라인 — 라인명+종이 같으면 덮어쓰기, 없으면 추가 */
  const findLine = (code, species) => lines.find((l) => l.code === code && (l.species || "") === species);
  sheet("라인").forEach((row) => {
    const code = str(row["라인명"]);
    if (!code) return;
    const species = str(row["종"]);
    const fid = codeToParentId[str(row["부 관리번호"])] || "";
    const mid = codeToParentId[str(row["모 관리번호"])] || "";
    const existing = findLine(code, species);
    if (existing) {
      Object.assign(existing, {
        fatherId: fid || existing.fatherId, motherId: mid || existing.motherId,
        origin: keep(row["산지"], existing.origin),
        setDate: keep(row["산란셋팅일(YYYY-MM-DD)"], existing.setDate), breakdownDate: keep(row["산란해체일(YYYY-MM-DD)"], existing.breakdownDate),
        hatchDate: keep(row["부화일(YYYY-MM-DD)"], existing.hatchDate), temp: keep(row["온도"], existing.temp),
        place: keep(row["장소"], existing.place), memo: keep(row["메모"], existing.memo),
      });
      report.linesUpd++;
    } else {
      lines.push({
        id: uid(), code, fatherId: fid, motherId: mid, species, origin: str(row["산지"]),
        setDate: str(row["산란셋팅일(YYYY-MM-DD)"]), breakdownDate: str(row["산란해체일(YYYY-MM-DD)"]),
        hatchDate: str(row["부화일(YYYY-MM-DD)"]), temp: str(row["온도"]), place: str(row["장소"]), memo: str(row["메모"]),
      });
      report.linesNew++;
    }
  });
  const codeToLineId = {};
  lines.forEach((l) => { codeToLineId[l.code] = l.id; });

  /* 3) 유충 — 관리번호+소속라인이 같으면 덮어쓰기(병갈이 기록은 보존), 없으면 추가 */
  const VALID_STATUS = ["유충", "용화", "우화", "사망", "분양"];
  /* 용화/우화 정보를 행에서 뽑아오기 (값 있는 것만) */
  const readPupation = (row, old) => {
    const pre = str(row["전용일(YYYY-MM-DD)"]), pup = str(row["용화일(YYYY-MM-DD)"]), pw = str(row["번데기무게(g)"]);
    if (!pre && !pup && !pw) return old || null;
    return { prepupaDate: pre || (old && old.prepupaDate) || "", pupaDate: pup || (old && old.pupaDate) || "", pupaWeight: pw || (old && old.pupaWeight) || "", memo: (old && old.memo) || "" };
  };
  const readEclosion = (row, old) => {
    const d = str(row["우화일(YYYY-MM-DD)"]), tl = str(row["성충총장(mm)"]);
    const jl = str(row["턱길이(mm)"]), jw = str(row["악폭(mm)"]), jt = str(row["악후(mm)"]);
    const hw = str(row["두폭(mm)"]), tw = str(row["흉폭(mm)"]), ab = str(row["배길이(mm)"]), df = str(row["우화부전(O/X)"]);
    if (!d && !tl && !jl && !jw && !jt && !hw && !tw && !ab) return old || null;
    return {
      date: d || (old && old.date) || "", totalLength: tl || (old && old.totalLength) || "",
      jawLength: jl || (old && old.jawLength) || "", jawWidth: jw || (old && old.jawWidth) || "", jawThick: jt || (old && old.jawThick) || "",
      headWidth: hw || (old && old.headWidth) || "", thoraxWidth: tw || (old && old.thoraxWidth) || "", abdomenLength: ab || (old && old.abdomenLength) || "",
      defect: df ? /O/i.test(df) : (old ? old.defect : false), memo: (old && old.memo) || "",
    };
  };
  sheet("유충").forEach((row) => {
    const code = str(row["관리번호"]);
    const lineCode = str(row["소속 라인명"]);
    if (!code) return;
    const lineId = codeToLineId[lineCode];
    if (!lineId) { report.skipped++; return; } /* 라인 못 찾으면 건너뜀 */
    const st = str(row["상태(유충/용화/우화/사망/분양)"]);
    const existing = individuals.find((i) => i.lineId === lineId && i.code === code);
    if (existing) {
      if (str(row["성별(수컷/암컷/미구분)"])) existing.sex = sexNorm(row["성별(수컷/암컷/미구분)"]);
      existing.memo = keep(row["메모"], existing.memo);
      if (VALID_STATUS.includes(st)) existing.status = st;
      existing.pupation = readPupation(row, existing.pupation);
      existing.eclosion = readEclosion(row, existing.eclosion);
      /* bottleRecords 는 병갈이기록 시트에서 따로 처리 */
      report.larvaeUpd++;
    } else {
      individuals.push({
        id: uid(), code, lineId, sex: sexNorm(row["성별(수컷/암컷/미구분)"]),
        status: VALID_STATUS.includes(st) ? st : "유충", memo: str(row["메모"]),
        bottleRecords: [], pupation: readPupation(row, null), eclosion: readEclosion(row, null),
      });
      report.larvaeNew++;
    }
  });

  /* 4) 병갈이기록 — 관리번호+소속라인으로 유충 찾아서, 없는 날짜만 추가 */
  report.bottleNew = 0;
  sheet("병갈이기록").forEach((row) => {
    const code = str(row["관리번호"]);
    const lineCode = str(row["소속 라인명"]);
    const date = str(row["병갈이날짜(YYYY-MM-DD)"]);
    if (!code || !date) return;
    const lineId = codeToLineId[lineCode];
    if (!lineId) { report.skipped++; return; }
    const ind = individuals.find((i) => i.lineId === lineId && i.code === code);
    if (!ind) { report.skipped++; return; }
    if (!Array.isArray(ind.bottleRecords)) ind.bottleRecords = [];
    if (ind.bottleRecords.some((r) => r.date === date)) return; /* 같은 날짜 이미 있으면 건너뜀 */
    ind.bottleRecords.push({
      id: uid(), date, instar: str(row["령"]), weight: str(row["유충무게(g)"]), headWidth: str(row["두폭(mm)"]),
      feedType: str(row["먹이종류(균사/발효톱밥)"]) || "균사", feedBrand: str(row["브랜드"]),
      bottleSize: str(row["병용량(cc)"]), nextDate: str(row["다음예정일(YYYY-MM-DD)"]), memo: str(row["메모"]), flags: [],
    });
    report.bottleNew++;
  });

  return { next: { ...data, parents, lines, individuals }, report };
}

/* ════════════════════ 일정 수집 ════════════════════ */
function collectEvents(data) {
  const ev = {}; /* iso -> [{type, label, sub, lineId, indId}] */
  const push = (iso, e) => { if (!iso) return; (ev[iso] = ev[iso] || []).push(e); };
  const lineById = Object.fromEntries(data.lines.map((l) => [l.id, l]));
  data.individuals.forEach((ind) => {
    if (ind.status !== "유충") return;
    const recs = [...(ind.bottleRecords || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = recs[recs.length - 1];
    if (last && last.nextDate) {
      const L = lineById[ind.lineId] || {};
      push(last.nextDate, { type: "bottle", label: `${ind.code} 병갈이`, sub: [L.code, L.species].filter(Boolean).join(" · "), lineId: ind.lineId, indId: ind.id });
    }
  });
  data.lines.forEach((L) => {
    if (L.hatchDate) push(L.hatchDate, { type: "hatch", label: `${L.code} 부화`, sub: L.species || "", lineId: L.id });
    if (L.breakdownDate) push(L.breakdownDate, { type: "breakdown", label: `${L.code} 산란 해체`, sub: L.species || "", lineId: L.id });
    /* 산란 셋팅일이 있고 아직 해체 안 했으면 → 해체 권장 구간 표시 */
    if (L.setDate && !L.breakdownDate) {
      push(addDays(L.setDate, 21), { type: "harvest", label: `${L.code} 해체 가능`, sub: `셋팅 3주차 · ${L.species || ""}`.trim(), lineId: L.id });
      push(addDays(L.setDate, 60), { type: "harvestEnd", label: `${L.code} 해체 권장 마감`, sub: `셋팅 2달차 · ${L.species || ""}`.trim(), lineId: L.id });
    }
  });
  /* 사용자가 직접 추가한 일정 */
  (data.customEvents || []).forEach((c) => {
    push(c.date, { type: "custom", label: c.title, sub: c.memo || "", customId: c.id });
    /* 알림일이 따로 있으면 그 날짜에도 표시 */
    if (c.remindDate && c.remindDate !== c.date) {
      push(c.remindDate, { type: "remind", label: c.remindTitle || `${c.title} 알림`, sub: c.remindMemo || "", customId: c.id });
    }
  });
  return ev;
}
const EV_COLOR = { bottle: "#A8884F", hatch: "#6B8E4E", breakdown: "#6E8494", harvest: "#C2705F", harvestEnd: "#9A4A3A", custom: "#5A7A9A", remind: "#C2705F" };

/* ════════════════════ 월별 달력 ════════════════════ */
function CalendarView({ data, onOpenLine, onOpenLarva, onAddEvent, onDeleteEvent, onEditEvent }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(today());
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({ title: "", memo: "", date: today(), useRemind: false, remindDate: "", remindTitle: "", remindMemo: "" });
  const events = collectEvents(data);

  const first = new Date(ym.y, ym.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const iso = (d) => `${ym.y}-${pad(ym.m + 1)}-${pad(d)}`;
  const move = (delta) => {
    let y = ym.y, m = ym.m + delta;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setYm({ y, m });
  };
  const selEvents = events[sel] || [];

  /* 다가오는 일정 (오늘 이후 14일) */
  const upcoming = Object.keys(events).filter((k) => k >= today()).sort()
    .slice(0, 30).map((k) => ({ date: k, items: events[k] }))
    .filter((g) => dday(g.date) <= 30);

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => move(-1)}>‹</button>
        <div className="cal-title serif">{ym.y}. {pad(ym.m + 1)}</div>
        <button className="cal-nav" onClick={() => move(1)}>›</button>
      </div>
      <button className="cal-today" onClick={() => { setYm({ y: now.getFullYear(), m: now.getMonth() }); setSel(today()); }}>오늘</button>

      <div className="cal-grid cal-dow">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <div key={d} className={"cal-dowc" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />;
          const k = iso(d);
          const evs = events[k] || [];
          const isToday = k === today();
          const isSel = k === sel;
          return (
            <button key={i} className={"cal-cell" + (isSel ? " sel" : "") + (isToday ? " today" : "")} onClick={() => { setSel(k); setAdding(false); }}>
              <span className={"cal-num" + (i % 7 === 0 ? " sun" : i % 7 === 6 ? " sat" : "")}>{d}</span>
              {evs.length > 0 && (
                <span className="cal-dots">
                  {evs.slice(0, 3).map((e, j) => <i key={j} style={{ background: EV_COLOR[e.type] }} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="cal-sel">
        <div className="cal-sel-date">{shortDate(sel)} {["일", "월", "화", "수", "목", "금", "토"][new Date(sel + "T00:00:00").getDay()]}요일
          {sel === today() && <span className="cal-badge">오늘</span>}
        </div>
        {selEvents.length === 0 && !adding && <div className="cal-empty">예정된 일정이 없어요</div>}
        {selEvents.map((e, i) => (
          <div key={i} className="cal-item">
            <i className="cal-item-dot" style={{ background: EV_COLOR[e.type] }} />
            <div style={{ flex: 1, minWidth: 0 }} onClick={() => e.customId ? null : e.indId ? onOpenLarva(e.indId) : onOpenLine(e.lineId)}>
              <div className="cal-item-l">{e.label}</div>
              {e.sub && <div className="cal-item-s">{e.sub}</div>}
            </div>
            {e.customId && (
              <div style={{ display: "flex", gap: 4, flex: "none" }}>
                <button className="cal-del" style={{ color: "var(--gold-d)" }} onClick={() => {
                  const c = (data.customEvents || []).find((x) => x.id === e.customId);
                  if (!c) return;
                  setEditId(c.id);
                  setDraft({
                    title: c.title || "", memo: c.memo || "", date: c.date || sel,
                    useRemind: !!c.remindDate, remindDate: c.remindDate || "",
                    remindTitle: c.remindTitle || "", remindMemo: c.remindMemo || "",
                  });
                  setAdding(true);
                }}>수정</button>
                <button className="cal-del" onClick={() => onDeleteEvent(e.customId)}>삭제</button>
              </div>
            )}
          </div>
        ))}

        {adding ? (
          <div className="cal-add">
            {editId && <div className="hint" style={{ marginTop: 0, marginBottom: 10, color: "var(--gold-d)", fontWeight: 700 }}>일정 수정 중</div>}
            <input className="in" placeholder="일정 제목 (예: 온도 점검)" value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
            <div className="label" style={{ marginTop: 10, marginBottom: 6 }}>날짜</div>
            <input type="date" className="in" value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            <div className="chiprow">
              <button className="chipbtn" onClick={() => setDraft({ ...draft, date: today() })}>오늘</button>
              {[7, 14, 30].map((d) => (
                <button key={d} className="chipbtn" onClick={() => setDraft({ ...draft, date: addDays(draft.date || today(), d) })}>+{d}일</button>
              ))}
            </div>
            {draft.date && (
              <div className="hint">
                {dday(draft.date) === 0 ? "오늘" : dday(draft.date) > 0 ? `D-${dday(draft.date)} (${shortDate(draft.date)})` : `${-dday(draft.date)}일 지남`}
                · 다가오면 라인 화면 상단에 알림으로 떠요
              </div>
            )}
            <input className="in" style={{ marginTop: 10 }} placeholder="메모 (선택)" value={draft.memo}
              onChange={(e) => setDraft({ ...draft, memo: e.target.value })} />

            <div className="remind-box">
              <button className={"remind-toggle" + (draft.useRemind ? " on" : "")}
                onClick={() => setDraft({ ...draft, useRemind: !draft.useRemind, remindDate: draft.remindDate || addDays(draft.date || today(), 21) })}>
                {draft.useRemind ? "✓ " : "＋ "}D-day 알림 추가
              </button>
              {draft.useRemind && (
                <div style={{ marginTop: 10 }}>
                  <div className="label" style={{ marginBottom: 6 }}>알림 날짜</div>
                  <input type="date" className="in" value={draft.remindDate}
                    onChange={(e) => setDraft({ ...draft, remindDate: e.target.value })} />
                  <div className="chiprow">
                    {[7, 21, 30, 60].map((d) => (
                      <button key={d} className="chipbtn" onClick={() => setDraft({ ...draft, remindDate: addDays(draft.date || today(), d) })}>+{d}일</button>
                    ))}
                  </div>
                  {draft.remindDate && (
                    <div className="hint">
                      {dday(draft.remindDate) === 0 ? "오늘" : dday(draft.remindDate) > 0 ? `D-${dday(draft.remindDate)} (${shortDate(draft.remindDate)})` : `${-dday(draft.remindDate)}일 지남`}
                      {draft.date && draft.remindDate >= draft.date && ` · 기록일로부터 ${daysBetween(draft.date, draft.remindDate)}일 뒤`}
                    </div>
                  )}
                  <input className="in" style={{ marginTop: 10 }} placeholder="알림 제목 (예: 해체할 것!)" value={draft.remindTitle}
                    onChange={(e) => setDraft({ ...draft, remindTitle: e.target.value })} />
                  <input className="in" style={{ marginTop: 8 }} placeholder="알림 메모 (선택)" value={draft.remindMemo}
                    onChange={(e) => setDraft({ ...draft, remindMemo: e.target.value })} />
                </div>
              )}
            </div>

            <div className="cal-add-btns">
              <button className="btn ghost sm" onClick={() => { setAdding(false); setEditId(null); setDraft({ title: "", memo: "", date: today(), useRemind: false, remindDate: "", remindTitle: "", remindMemo: "" }); }}>취소</button>
              <button className="btn primary sm" onClick={() => {
                if (!draft.title.trim()) return;
                if (!draft.date) return;
                const ev = { date: draft.date, title: draft.title.trim(), memo: draft.memo.trim() };
                if (draft.useRemind && draft.remindDate) {
                  ev.remindDate = draft.remindDate;
                  ev.remindTitle = draft.remindTitle.trim();
                  ev.remindMemo = draft.remindMemo.trim();
                }
                if (editId) onEditEvent(editId, ev);
                else onAddEvent(ev);
                setDraft({ title: "", memo: "", date: today(), useRemind: false, remindDate: "", remindTitle: "", remindMemo: "" }); setAdding(false); setEditId(null);
              }}>{editId ? "수정 완료" : "추가"}</button>
            </div>
          </div>
        ) : (
          <button className="cal-add-btn" onClick={() => { setDraft({ title: "", memo: "", date: sel, useRemind: false, remindDate: "", remindTitle: "", remindMemo: "" }); setAdding(true); }}>＋ 일정 추가</button>
        )}
      </div>

      {upcoming.length > 0 && (
        <>
          <div className="p-t lt">다가오는 일정</div>
          {upcoming.map((g) => (
            <div key={g.date} className="up-row">
              <div className="up-date mono">
                <b>{shortDate(g.date)}</b>
                <span className={"up-dd" + (dday(g.date) <= 0 ? " over" : dday(g.date) <= 3 ? " soon" : "")}>
                  {dday(g.date) === 0 ? "오늘" : dday(g.date) < 0 ? `${-dday(g.date)}일 지남` : `D-${dday(g.date)}`}
                </span>
              </div>
              <div className="up-items">
                {g.items.map((e, i) => (
                  <div key={i} className="up-item" onClick={() => e.indId ? onOpenLarva(e.indId) : onOpenLine(e.lineId)}>
                    <i style={{ background: EV_COLOR[e.type] }} /> {e.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

/* ════════════════════ 메인 앱 ════════════════════ */
function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState({ name: "list" });
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [tab, setTab] = useState("lines");
  const [speciesFolder, setSpeciesFolder] = useState(null);
  const [folderBy, setFolderBy] = useState("species");
  const [lineView, setLineView] = useState("card");
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncKey, setSyncKey] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);
  const toastT = useRef(null);

  useEffect(() => {
    (async () => {
      let d = null;
      try { const r = await idbGet(KEY); if (r) d = JSON.parse(r); } catch (e) { /* 첫 실행 */ }
      const base = d && Array.isArray(d.individuals) ? d : { individuals: [], feedBrands: [] };
      if (!Array.isArray(base.parents)) base.parents = [];
      if (!Array.isArray(base.lines)) base.lines = [];
      if (!Array.isArray(base.customEvents)) base.customEvents = [];
      /* 기존 데이터 마이그레이션: 라인 없는 유충은 '미분류' 라인으로 */
      const legacy = base.individuals.filter((i) => !i.lineId);
      if (legacy.length) {
        let misc = base.lines.find((l) => l.code === "미분류");
        if (!misc) {
          misc = { id: uid(), code: "미분류", fatherId: "", motherId: "", species: legacy[0].species || "", origin: legacy[0].origin || "", breakdownDate: "", hatchDate: legacy[0].hatchDate || "", temp: legacy[0].temp || "", place: legacy[0].place || "", memo: "기존 기록 자동 이동" };
          base.lines.push(misc);
        }
        base.individuals = base.individuals.map((i) => (i.lineId ? i : { ...i, lineId: misc.id }));
      }
      setData(base);
      try { const sk = await idbGet("beetle-sync-key"); if (sk) setSyncKey(sk); } catch (e) { /* 없으면 무시 */ }
    })();
  }, []);

  const say = (msg) => { setToast(msg); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2400); };

  const persist = async (next) => {
    setData(next);
    try { await idbSet(KEY, JSON.stringify(next)); }
    catch (e) { say("⚠️ 저장 실패 — 네트워크를 확인해주세요"); }
  };

  const updateInd = (id, patch) =>
    persist({ ...data, individuals: data.individuals.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const rememberBrand = (d, brand) => {
    const b = (brand || "").trim();
    if (b && !d.feedBrands.includes(b)) return { ...d, feedBrands: [...d.feedBrands, b] };
    return d;
  };

  if (!data) return <div className="app"><style>{CSS}</style><div className="loading">불러오는 중…</div></div>;

  const lineById = Object.fromEntries(data.lines.map((l) => [l.id, l]));
  const parentById = Object.fromEntries(data.parents.map((p) => [p.id, p]));

  const cur = view.name === "detail" ? data.individuals.find((i) => i.id === view.id) : null;
  if (view.name === "detail" && !cur) { setView({ name: "list" }); return null; }
  const curL = view.name === "lineDetail" ? data.lines.find((l) => l.id === view.id) : null;
  if (view.name === "lineDetail" && !curL) { setView({ name: "list" }); return null; }
  const curP = view.name === "parentDetail" ? data.parents.find((x) => x.id === view.id) : null;
  if (view.name === "parentDetail" && !curP) { setView({ name: "list" }); return null; }

  /* ── 핸들러 ── */
  const saveParent = (f) => {
    if (modal.editId) persist({ ...data, parents: data.parents.map((p) => (p.id === modal.editId ? { ...p, ...f } : p)) });
    else persist({ ...data, parents: [...data.parents, { ...f, id: uid() }] });
    setModal(null); say("✓ 성충 저장됨");
  };
  const saveGrowthRow = (f) => {
    let d = rememberBrand(data, f.feedBrand);
    d = {
      ...d, parents: d.parents.map((p) => {
        if (p.id !== modal.parentId) return p;
        const rows = modal.editId
          ? (p.growthRecords || []).map((r) => (r.id === modal.editId ? { ...r, ...f } : r))
          : [...(p.growthRecords || []), { ...f, id: uid() }];
        return { ...p, growthRecords: rows };
      }),
    };
    persist(d); setModal(null); say("✓ 사육 이력 저장됨");
  };
  const deleteGrowthRow = () => {
    persist({ ...data, parents: data.parents.map((p) => p.id !== modal.parentId ? p : { ...p, growthRecords: (p.growthRecords || []).filter((r) => r.id !== modal.editId) }) });
    setModal(null); say("이력이 삭제됐어요");
  };
  const saveLine = (f) => {
    if (modal.editId) persist({ ...data, lines: data.lines.map((l) => (l.id === modal.editId ? { ...l, ...f } : l)) });
    else {
      const nl = { ...f, id: uid() };
      persist({ ...data, lines: [...data.lines, nl] });
      setModal(null); say("✓ 라인 생성됨"); setView({ name: "lineDetail", id: nl.id });
      return;
    }
    setModal(null); say("✓ 저장됨");
  };
  const addLarvae = (items) => {
    const news = items.map((it) => ({ ...it, id: uid(), lineId: modal.lineId, status: "유충", bottleRecords: [], pupation: null, eclosion: null }));
    persist({ ...data, individuals: [...data.individuals, ...news] });
    setModal(null); say(`✓ ${news.length}마리 추가됨`);
  };
  const saveLarvaEdit = (f) => { updateInd(modal.indId, f); setModal(null); say("✓ 저장됨"); };
  const saveBottle = (f) => {
    let d = rememberBrand(data, f.feedBrand);
    d = {
      ...d, individuals: d.individuals.map((i) => {
        if (i.id !== modal.indId) return i;
        const recs = modal.editId
          ? i.bottleRecords.map((r) => (r.id === modal.editId ? { ...r, ...f } : r))
          : [...(i.bottleRecords || []), { ...f, id: uid() }];
        return { ...i, bottleRecords: recs };
      }),
    };
    persist(d); setModal(null);
    say(f.nextDate ? "✓ 저장됨 — 캘린더 탭에서 확인" : "✓ 저장됨");
  };
  const saveBulkBottle = (ids, f) => {
    let d = rememberBrand(data, f.feedBrand);
    const idset = new Set(ids);
    d = {
      ...d, individuals: d.individuals.map((i) => {
        if (!idset.has(i.id)) return i;
        return { ...i, bottleRecords: [...(i.bottleRecords || []), { ...f, weight: "", headWidth: "", id: uid() }] };
      }),
    };
    persist(d); setModal(null);
    say(`✓ ${ids.length}마리 일괄 병갈이 기록됨`);
  };
  const savePupation = (f) => {
    const ind = data.individuals.find((i) => i.id === modal.indId);
    updateInd(modal.indId, { pupation: f, status: ind.status === "유충" ? "용화" : ind.status });
    setModal(null); say("✓ 용화 기록 저장됨");
  };
  const saveEclosion = (f) => {
    const ind = data.individuals.find((i) => i.id === modal.indId);
    updateInd(modal.indId, { eclosion: f, status: ["유충", "용화"].includes(ind.status) ? "우화" : ind.status });
    setModal(null); say("✓ 우화 기록 저장됨");
  };
  const promoteToParent = (ind) => {
    const L = lineById[ind.lineId] || {};
    const ec = ind.eclosion || {};
    /* 병갈이 기록 → 성충 사육 이력으로 복사 */
    const growthRecords = sortedRecs(ind).map((r) => ({
      id: uid(), date: r.date, instar: r.instar || "", feedType: r.feedType || "",
      feedBrand: r.feedBrand || "", bottleSize: r.bottleSize || "", weight: r.weight || "", memo: r.memo || "",
    }));
    /* 우화일 행도 이력에 추가 */
    if (ec.date) growthRecords.push({ id: uid(), date: ec.date, instar: "우화", feedType: "", feedBrand: "", bottleSize: "", weight: "", memo: num(ec.totalLength) ? `우화 ${ec.totalLength}mm` : "우화" });
    /* 성충 관리번호: 라인코드+유충번호 조합으로 자동 생성, 중복 시 뒤에 숫자 */
    let baseCode = `${L.code ? L.code + "-" : ""}${ind.code}`;
    let code = baseCode, n = 2;
    const exist = new Set(data.parents.map((p) => p.code));
    while (exist.has(code)) { code = `${baseCode}-${n++}`; }
    const newParent = {
      id: uid(), code,
      sex: ind.sex && ind.sex !== "미구분" ? ind.sex : "수컷 ♂",
      species: L.species || "", line: L.code || "", origin: L.origin || "",
      totalLength: ec.totalLength || "", jawLength: ec.jawLength || "", jawWidth: ec.jawWidth || "", jawThick: ec.jawThick || "", thoraxWidth: ec.thoraxWidth || "",
      eclosionDate: ec.date || "", source: "자가", memo: ind.memo || "",
      status: "생존", photo: "", growthRecords,
      bornLineId: ind.lineId || "", bornLarvaId: ind.id,
    };
    persist({
      ...data,
      parents: [...data.parents, newParent],
      individuals: data.individuals.map((i) => i.id === ind.id ? { ...i, promotedToParentId: newParent.id } : i),
    });
    say("✓ 성충으로 등록됐어요 — 사육 이력도 옮겨졌어요");
    setView({ name: "parentDetail", id: newParent.id });
  };
  const importJSON = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!Array.isArray(d.individuals)) throw new Error();
        persist({ individuals: d.individuals, lines: Array.isArray(d.lines) ? d.lines : [], parents: Array.isArray(d.parents) ? d.parents : [], customEvents: Array.isArray(d.customEvents) ? d.customEvents : [], feedBrands: d.feedBrands || [] });
        say(`✓ ${d.individuals.length}개체 복원 완료`);
      } catch { say("⚠️ 올바른 백업 파일이 아니에요"); }
    };
    reader.readAsText(file); e.target.value = "";
  };
  const importXLSX = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { next, report } = parseImportXLSX(reader.result, data);
        const totalNew = report.parentsNew + report.linesNew + report.larvaeNew;
        const totalUpd = report.parentsUpd + report.linesUpd + report.larvaeUpd;
        const bottleNew = report.bottleNew || 0;
        if (totalNew + totalUpd + bottleNew === 0) {
          say(report.skipped > 0 ? "라인/유충을 못 찾아 건너뛴 항목만 있어요" : "⚠️ 양식에서 데이터를 찾지 못했어요");
          return;
        }
        persist(next);
        const parts = [];
        if (totalNew) parts.push(`신규 ${totalNew}`);
        if (totalUpd) parts.push(`갱신 ${totalUpd}`);
        if (bottleNew) parts.push(`병갈이 ${bottleNew}`);
        say(`✓ ${parts.join(" · ")}${report.skipped ? ` · ${report.skipped} 건너뜀` : ""}`);
        setSettingsOpen(false);
      } catch (err) { say("⚠️ 엑셀을 읽지 못했어요 — 양식 파일이 맞는지 확인해주세요"); }
    };
    reader.readAsArrayBuffer(file); e.target.value = "";
  };
  const saveSyncKey = async (k) => { setSyncKey(k); try { await idbSet("beetle-sync-key", k); } catch (e) {} };
  const doUpload = async () => {
    const k = syncKey.trim();
    if (!k) return say("먼저 동기화 키를 입력해주세요");
    setSyncBusy(true);
    try {
      await saveSyncKey(k);
      await cloudUpload(k, data);
      say("☁︎ 클라우드에 올렸어요");
    } catch (e) { say("⚠️ 업로드 실패 — 인터넷을 확인해주세요"); }
    setSyncBusy(false);
  };
  const doDownload = async () => {
    const k = syncKey.trim();
    if (!k) return say("먼저 동기화 키를 입력해주세요");
    setSyncBusy(true);
    try {
      const row = await cloudDownload(k);
      if (!row || !row.data || !Array.isArray(row.data.individuals)) {
        say("이 키로 저장된 데이터가 없어요");
        setSyncBusy(false);
        return;
      }
      await saveSyncKey(k);
      const d = row.data;
      persist({
        individuals: d.individuals,
        lines: Array.isArray(d.lines) ? d.lines : [],
        parents: Array.isArray(d.parents) ? d.parents : [],
        customEvents: Array.isArray(d.customEvents) ? d.customEvents : [],
        feedBrands: Array.isArray(d.feedBrands) ? d.feedBrands : [],
      });
      say(`☁︎ 불러왔어요 — 유충 ${d.individuals.length}`);
      setSettingsOpen(false);
    } catch (e) { say("⚠️ 불러오기 실패 — 인터넷을 확인해주세요"); }
    setSyncBusy(false);
  };

  /* ── 라인 통계 ── */
  const larvaeOf = (lineId) => data.individuals.filter((i) => i.lineId === lineId);
  const lineDday = (lineId) => {
    const ds = larvaeOf(lineId).filter((i) => i.status === "유충").map((i) => latestRec(i)?.nextDate).filter(Boolean).map(dday);
    return ds.length ? Math.min(...ds) : null;
  };
  const pairLabel = (L) => {
    const fa = parentById[L.fatherId], mo = parentById[L.motherId];
    if (!fa && !mo) return null;
    return `${fa ? fa.code : "?"} ♂ × ${mo ? mo.code : "?"} ♀`;
  };

  /* ════════ 렌더 ════════ */
  return (
    <div className="app">
      <style>{CSS}</style>
      <datalist id="dl-species">{SPECIES.map((s) => <option key={s} value={s} />)}</datalist>

      {/* ───── 목록 화면 ───── */}
      {view.name === "list" && (
        <>
          <div className="topbar">
            <div>
              <div className="brand">Beetle<span style={{ fontStyle: "italic" }}>Log</span></div>
              <div className="brand-sub">라인 {data.lines.length} · 유충 {data.individuals.length} · 성충 {data.parents.length}</div>
            </div>
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="설정">⚙️</button>
          </div>

          <div className="tabs">
            <button className={"tab-b" + (tab === "lines" ? " on" : "")} onClick={() => setTab("lines")}>라인 {data.lines.length}</button>
            <button className={"tab-b" + (tab === "parents" ? " on" : "")} onClick={() => { setTab("parents"); setSpeciesFolder(null); }}>성충 {data.parents.length}</button>
            <button className={"tab-b" + (tab === "calendar" ? " on" : "")} onClick={() => setTab("calendar")}>캘린더</button>
          </div>

          {tab === "calendar" && (
            <CalendarView data={data}
              onOpenLine={(id) => setView({ name: "lineDetail", id })}
              onOpenLarva={(id) => setView({ name: "detail", id })}
              onAddEvent={(ev) => { persist({ ...data, customEvents: [...(data.customEvents || []), { ...ev, id: uid() }] }); say("✓ 일정 추가됨"); }}
              onEditEvent={(id, ev) => { persist({ ...data, customEvents: (data.customEvents || []).map((c) => c.id === id ? { ...c, ...ev, id } : c) }); say("✓ 일정 수정됨"); }}
              onDeleteEvent={(id) => { persist({ ...data, customEvents: (data.customEvents || []).filter((c) => c.id !== id) }); say("일정 삭제됨"); }} />
          )}

          {tab === "lines" && <>
            {(() => {
              const ev = collectEvents(data);
              const due = Object.keys(ev).filter((k) => k <= today() && ev[k].some((e) => e.type === "bottle"))
                .reduce((a, k) => a + ev[k].filter((e) => e.type === "bottle").length, 0);
              const soon = (ev[addDays(today(), 1)] || []).filter((e) => e.type === "bottle").length
                + (ev[addDays(today(), 2)] || []).filter((e) => e.type === "bottle").length;
              if (!due && !soon) return null;
              return (
                <div className="alert" onClick={() => setTab("calendar")}>
                  <span className="alert-dot" />
                  {due > 0 ? <b>병갈이할 유충 {due}마리</b> : <b>곧 병갈이 {soon}마리</b>}
                  {due > 0 && soon > 0 && <span className="dim"> · 2일 내 {soon}마리 더</span>}
                  <span className="alert-go">캘린더 ›</span>
                </div>
              );
            })()}

            {/* 직접 추가한 일정 중 오늘~3일 내 임박 알림 (기록일 + 알림일 모두) */}
            {(() => {
              const items = [];
              (data.customEvents || []).forEach((c) => {
                const dd = dday(c.date);
                if (dd >= 0 && dd <= 3) items.push({ id: c.id + "_d", title: c.title, dd });
                if (c.remindDate) {
                  const rd = dday(c.remindDate);
                  if (rd >= 0 && rd <= 3) items.push({ id: c.id + "_r", title: c.remindTitle || `${c.title} 알림`, dd: rd });
                }
              });
              items.sort((a, b) => a.dd - b.dd);
              if (items.length === 0) return null;
              return items.map((it) => (
                <div key={it.id} className="alert custom" onClick={() => setTab("calendar")}>
                  <span className="alert-dot" style={{ background: "#C2705F" }} />
                  <b>{it.title}</b>
                  <span className="alert-go">{it.dd === 0 ? "오늘" : `D-${it.dd}`} ›</span>
                </div>
              ));
            })()}

            {data.lines.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🪲</div>
                <div className="empty-t">첫 라인을 만들어보세요</div>
                <div className="empty-d">라인 = 부♂ × 모♀ 조합 단위예요.<br />성충 탭에서 부모를 먼저 등록한 뒤<br />+ 버튼으로 라인을 만들고 유충을 일괄 추가하세요.</div>
              </div>
            )}
            {data.lines.length > 0 && (
              <div className="view-toggle">
                <button className={"vt-btn" + (lineView === "card" ? " on" : "")} onClick={() => setLineView("card")}>카드</button>
                <button className={"vt-btn" + (lineView === "table" ? " on" : "")} onClick={() => setLineView("table")}>라인표</button>
              </div>
            )}

            {lineView === "card" && [...data.lines].sort((a, b) => a.code.localeCompare(b.code, "ko", { numeric: true })).map((L) => {
              const kids = larvaeOf(L.id);
              const cnt = STATUSES.map((s) => [s, kids.filter((i) => i.status === s).length]).filter(([, n]) => n > 0);
              const dd = lineDday(L.id);
              const avgOf = (sexKey) => {
                const ws = kids.filter((i) => sexKey === "수" ? i.sex?.includes("수") : sexKey === "암" ? i.sex?.includes("암") : !i.sex?.includes("수") && !i.sex?.includes("암"))
                  .map((i) => num(latestRec(i)?.weight)).filter(Boolean);
                return ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
              };
              const avgM = avgOf("수"), avgF = avgOf("암"), avgU = avgOf("미");
              return (
                <div key={L.id} className="card" onClick={() => setView({ name: "lineDetail", id: L.id })}>
                  <div className="card-l">
                    <div className="tagrow">
                      <span className="tag mono">{L.code}</span>
                      {dd != null && <span className={"chip dd" + ddClass(dd)}>{dd <= 0 ? `병갈이 D+${-dd}` : `병갈이 D-${dd}`}</span>}
                    </div>
                    <div className="card-sub">{[L.species, pairLabel(L), L.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
                    <div className="card-val mono" style={{ fontSize: 17 }}>
                      {kids.length ? <>{kids.length}<small>마리</small></> : <span className="dim">유충 없음</span>}
                    </div>
                    {(avgM || avgF || avgU) && (
                      <div className="avg-row">
                        {avgM && <span className="avg-m">♂ 평균 {n1(avgM)}g</span>}
                        {avgF && <span className="avg-f">♀ 평균 {n1(avgF)}g</span>}
                        {avgU && <span className="avg-u">미구분 {n1(avgU)}g</span>}
                      </div>
                    )}
                    {cnt.length > 0 && (
                      <div className="lstat">
                        {cnt.map(([s, n]) => <span key={s} style={{ color: STATUS_COLOR[s] }}>{s} {n}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {lineView === "table" && (
              <div className="ltable">
                {[...data.lines].sort((a, b) => a.code.localeCompare(b.code, "ko", { numeric: true })).map((L) => {
                  const fa = parentById[L.fatherId], mo = parentById[L.motherId];
                  const kids = larvaeOf(L.id);
                  return (
                    <div key={L.id} className="lt-row" onClick={() => setView({ name: "lineDetail", id: L.id })}>
                      <div className="lt-head">
                        <span className="tag mono">{L.code}</span>
                        <span className="lt-sp">{L.species || ""}</span>
                        <span className="lt-cnt">{kids.length}마리</span>
                      </div>
                      <div className="lt-pair">
                        <div className="lt-parent male">
                          <div className="lt-pl">♂ 부</div>
                          {fa ? (
                            <>
                              {fa.photo && <img src={fa.photo} alt="" className="lt-photo" />}
                              <div className="lt-pcode mono">{fa.code}</div>
                              <div className="lt-pspec">{[num(fa.totalLength) ? n1(num(fa.totalLength)) + "mm" : null, fa.line].filter(Boolean).join(" · ")}</div>
                            </>
                          ) : <div className="lt-none">미지정</div>}
                        </div>
                        <div className="lt-x">×</div>
                        <div className="lt-parent female">
                          <div className="lt-pl">♀ 모</div>
                          {mo ? (
                            <>
                              {mo.photo && <img src={mo.photo} alt="" className="lt-photo" />}
                              <div className="lt-pcode mono">{mo.code}</div>
                              <div className="lt-pspec">{[num(mo.totalLength) ? n1(num(mo.totalLength)) + "mm" : null, mo.line].filter(Boolean).join(" · ")}</div>
                            </>
                          ) : <div className="lt-none">미지정</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>}

          {tab === "parents" && <>
            {data.parents.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🪲</div>
                <div className="empty-t">성충을 등록해보세요</div>
                <div className="empty-d">부모 개체를 먼저 등록해두면<br />라인 생성 시 혈통·산지가 자동으로 채워져요.</div>
              </div>
            )}
            {data.parents.length > 0 && (() => {
              /* 폴더 기준(종/혈통)으로 그룹핑. 미입력은 '미지정'으로 */
              const byLabel = folderBy === "line" ? "혈통" : "종";
              const noneKey = byLabel + " 미지정";
              const groups = {};
              data.parents.forEach((p) => {
                const key = (folderBy === "line" ? (p.line || "") : (p.species || "")).trim() || noneKey;
                (groups[key] = groups[key] || []).push(p);
              });
              const groupNames = Object.keys(groups).sort((a, b) => {
                if (a === noneKey) return 1;
                if (b === noneKey) return -1;
                return a.localeCompare(b, "ko");
              });

              /* 종을 선택하지 않았으면 → 폴더 목록 */
              if (!speciesFolder || !groups[speciesFolder]) {
                return (
                  <>
                    <div className="view-toggle">
                      <button className={"vt-btn" + (folderBy === "species" ? " on" : "")} onClick={() => { setFolderBy("species"); setSpeciesFolder(null); }}>종별</button>
                      <button className={"vt-btn" + (folderBy === "line" ? " on" : "")} onClick={() => { setFolderBy("line"); setSpeciesFolder(null); }}>혈통별</button>
                    </div>
                  <div className="sp-grid">
                    {groupNames.map((gname) => {
                      const list = groups[gname];
                      const males = list.filter((p) => p.sex.includes("수")).length;
                      const females = list.filter((p) => p.sex.includes("암")).length;
                      const alive = list.filter((p) => p.status !== "사망").length;
                      return (
                        <div key={gname} className="sp-card" onClick={() => setSpeciesFolder(gname)}>
                          <div className="sp-card-l">
                            <div className="sp-name serif">{gname}</div>
                            <div className="sp-meta">{list.length}마리 · ♂{males} ♀{females}</div>
                          </div>
                          <div className="sp-go">보기 ›</div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                );
              }

              /* 종을 선택했으면 → 그 종의 성충 리스트 */
              const list = groups[speciesFolder].sort((a, b) => {
                const ad = a.status === "사망" ? 1 : 0, bd = b.status === "사망" ? 1 : 0;
                if (ad !== bd) return ad - bd;
                return a.code.localeCompare(b.code, "ko", { numeric: true });
              });
              const males = list.filter((p) => p.sex.includes("수")).length;
              const females = list.filter((p) => p.sex.includes("암")).length;
              return (
                <>
                  <div className="sp-back" onClick={() => setSpeciesFolder(null)}>‹ {folderBy === "line" ? "혈통" : "종"} 목록</div>
                  <div className="grp-head">
                    <span className="grp-name serif">{speciesFolder}</span>
                    <span className="grp-cnt">{list.length}마리 · ♂{males} ♀{females}</span>
                  </div>
                  {list.map((p) => {
                    const myLines = data.lines.filter((l) => l.fatherId === p.id || l.motherId === p.id).length;
                    const dead = p.status === "사망";
                    return (
                      <div key={p.id} className={"card" + (dead ? " dead" : "")} onClick={() => setView({ name: "parentDetail", id: p.id })}>
                        <div className="card-l">
                          <div className="tagrow">
                            <span className={"tag mono" + (dead ? " strike" : "")}>{p.code}</span>
                            <span className="chip" style={{ color: p.sex.includes("수") ? "#5A7A9A" : "#A8884F", borderColor: "#E0DAD0" }}>{p.sex}</span>
                            {dead && <span className="chip" style={{ color: "#9A9088", borderColor: "#9A908855" }}>사망</span>}
                          </div>
                          <div className="card-sub">{[p.line, p.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
                          <div className="card-val mono">
                            {num(p.totalLength) ? <>{n1(num(p.totalLength))}<small>mm</small></> : <span className="dim">사이즈 미입력</span>}
                            {myLines > 0 && <em> 라인 {myLines}</em>}
                          </div>
                        </div>
                        {p.photo && <img src={p.photo} alt="" className="card-thumb" />}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </>}

          <div className="footer">
            <div className="note">데이터는 자동 저장됩니다. 엑셀·JSON으로 주기적으로 백업해두면 안전해요.</div>
            <div className="frow">
              <button className="btn ghost sm" onClick={async () => { const how = await deliverFile(`사육기록_백업_${today()}.json`, JSON.stringify(data, null, 1), "application/json"); say(how === "fail" ? "⚠️ Safari에서 시도해주세요" : "백업 파일 저장됨"); }}>JSON 백업</button>
              <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>백업 복원</button>
              <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={importJSON} />
            </div>
          </div>

          {tab !== "calendar" && (
            <button className="fab" onClick={() => setModal(tab === "parents" ? { type: "parent" } : { type: "line" })}>＋</button>
          )}
        </>
      )}

      {/* ───── 라인 상세 ───── */}
      {view.name === "lineDetail" && curL && (() => {
        const L = curL;
        const kids = larvaeOf(L.id).sort((a, b) => {
          const ad = a.status === "사망" ? 1 : 0, bd = b.status === "사망" ? 1 : 0;
          if (ad !== bd) return ad - bd;
          return a.code.localeCompare(b.code, "ko", { numeric: true });
        });
        const shown = kids.filter((i) => filter === "전체" || i.status === filter);
        const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: kids.filter((i) => i.status === s).length }), {});
        /* 성별별 기대주(👑): 살아있는 개체 중 우화한 게 있으면 총장 최대, 없으면 유충무게 최대 */
        const topOf = (sexKey) => {
          const pool = kids.filter((i) => i.status !== "사망" && i.sex && i.sex.includes(sexKey));
          if (pool.length === 0) return null;
          const eclosed = pool.filter((i) => num(i.eclosion?.totalLength));
          if (eclosed.length) {
            return eclosed.reduce((best, i) => (num(i.eclosion.totalLength) > num(best.eclosion.totalLength) ? i : best)).id;
          }
          const weighed = pool.filter((i) => maxWeight(i));
          if (weighed.length) {
            return weighed.reduce((best, i) => (maxWeight(i) > maxWeight(best) ? i : best)).id;
          }
          return null;
        };
        const crownM = topOf("수"), crownF = topOf("암");
        return (
          <>
            <div className="topbar">
              <button className="hbtn" onClick={() => { setFilter("전체"); setView({ name: "list" }); }}>‹ 목록</button>
              <div className="tagrow"><span className="tag mono big">{L.code}</span></div>
              <button className="hbtn" onClick={() => setModal({ type: "line", editId: L.id })}>수정</button>
            </div>
            <div className="d-sub">{[L.species, pairLabel(L), L.origin].filter(Boolean).join(" · ")}</div>

            <div className="panel">
              <div className="meas mono">
                {L.setDate && <span>셋팅 <b>{shortDate(L.setDate)}</b></span>}
                {L.breakdownDate && <span>해체 <b>{shortDate(L.breakdownDate)}</b></span>}
                {L.hatchDate && <span>부화 <b>{shortDate(L.hatchDate)}</b></span>}
                {L.temp && <span>온도 <b>{L.temp}℃</b></span>}
                {L.place && <span>장소 <b>{L.place}</b></span>}
                {!L.setDate && !L.breakdownDate && !L.hatchDate && !L.temp && !L.place && <span className="dim">라인 정보 미입력 — 우측 상단 '수정'</span>}
              </div>
              {L.setDate && !L.breakdownDate && (() => {
                const ds = dday(addDays(L.setDate, 21)), de = dday(addDays(L.setDate, 60));
                return (
                  <div className="harvest-tip">
                    🥚 해체 권장 <b className="mono">{addDays(L.setDate, 21)}</b> ~ <b className="mono">{addDays(L.setDate, 60)}</b>
                    <span className="dim"> · {ds > 0 ? `해체까지 D-${ds}` : de < 0 ? `권장기간 지남 (${-de}일)` : "지금 해체 가능"}</span>
                  </div>
                );
              })()}
              {L.memo && <div className="r-memo">{L.memo}</div>}
            </div>

            <div className="acts">
              <button className="btn primary" onClick={() => setModal({ type: "larvaAdd", lineId: L.id })}>+ 유충 추가</button>
              {kids.some((i) => i.status === "유충") && (
                <button className="btn" onClick={() => setModal({ type: "bulkBottle", lineId: L.id })}>+ 일괄 병갈이</button>
              )}
            </div>

            {kids.length > 0 && (
              <div className="filters">
                {["전체", ...STATUSES.filter((s) => counts[s] > 0)].map((s) => (
                  <button key={s} className={"fchip" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}
                    style={filter === s && s !== "전체" ? { borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] } : {}}>
                    {s}{s !== "전체" ? ` ${counts[s]}` : ` ${kids.length}`}
                  </button>
                ))}
              </div>
            )}

            {kids.length === 0 && (
              <div className="empty sm"><div className="empty-d">아직 유충이 없어요.<br />+ 유충 추가로 한 번에 여러 마리를 등록할 수 있어요.</div></div>
            )}

            {shown.map((ind) => {
              const lr = latestRec(ind), mw = maxWeight(ind), dl = lastDelta(ind);
              const dd = ind.status === "유충" && lr?.nextDate ? dday(lr.nextDate) : null;
              const red = reduction(ind);
              const dead = ind.status === "사망";
              const isCrown = ind.id === crownM || ind.id === crownF;
              return (
                <div key={ind.id} className={"card" + (dead ? " dead" : "") + (isCrown ? " crown" : "")} onClick={() => setView({ name: "detail", id: ind.id })}>
                  <div className="card-l">
                    <div className="tagrow">
                      {isCrown && <span className="crown-ic" title="기대주">👑</span>}
                      <span className={"tag mono" + (dead ? " strike" : "")}>{ind.code}</span>
                      <span className="chip" style={{ color: STATUS_COLOR[ind.status], borderColor: STATUS_COLOR[ind.status] + "55" }}>{ind.status}</span>
                      {dd != null && <span className={"chip dd" + ddClass(dd)}>{dd <= 0 ? `D+${-dd} 지남` : `D-${dd}`}</span>}
                    </div>
                    <div className="card-sub">{[ind.sex !== "미구분" ? ind.sex : null, lr ? `최근 ${shortDate(lr.date)}` : null].filter(Boolean).join(" · ") || "기록 전"}</div>
                    <div className="card-val mono">
                      {ind.status === "우화" && num(ind.eclosion?.totalLength) ? (
                        <>{n1(num(ind.eclosion.totalLength))}<small>mm</small>{red && <em> 환원율 {n2(red)}</em>}</>
                      ) : lr && num(lr.weight) ? (
                        <>{n1(num(lr.weight))}<small>g</small>
                          {dl != null && <em className={dl >= 0 ? "up" : "down"}> {dl >= 0 ? "▲" : "▼"}{n1(Math.abs(dl))}</em>}
                          {mw && num(lr.weight) < mw && <em> 최대 {n1(mw)}g</em>}</>
                      ) : <span className="dim">기록 없음</span>}
                    </div>
                  </div>
                  <div className="card-r">
                    <Spark ind={ind} />
                    {ind.status === "유충" && (
                      <button className="btn tiny" onClick={(e) => { e.stopPropagation(); setModal({ type: "bottle", indId: ind.id }); }}>+ 병갈이</button>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 18, textAlign: "center" }}>
              <ConfirmBtn className="btn danger sm" label={`라인 삭제${kids.length ? ` (유충 ${kids.length}마리 포함)` : ""}`}
                onConfirm={() => {
                  persist({ ...data, lines: data.lines.filter((l) => l.id !== L.id), individuals: data.individuals.filter((i) => i.lineId !== L.id) });
                  setFilter("전체"); setView({ name: "list" }); say("라인이 삭제됐어요");
                }} />
            </div>
            <div style={{ height: 40 }} />
          </>
        );
      })()}

      {/* ───── 성충 상세 (분양카드) ───── */}
      {view.name === "parentDetail" && curP && (() => {
        const p = curP;
        const myLines = data.lines.filter((l) => l.fatherId === p.id || l.motherId === p.id);
        return (
          <>
            <div className="topbar">
              <button className="hbtn" onClick={() => setView({ name: "list" })}>‹ 목록</button>
              <div className="tagrow"><span className="tag mono big">{p.code}</span></div>
              <button className="hbtn" onClick={() => setModal({ type: "parent", editId: p.id })}>수정</button>
            </div>

            <div className="bcard">
              {p.photo && <img src={p.photo} alt="" className="bc-photo" />}
              <div className="bc-head serif">BREEDING CARD</div>
              <div className="bc-species serif">{p.species || "종 미입력"}</div>
              <div className="bc-sub">{[p.line, p.origin, p.sex].filter(Boolean).join(" · ")}</div>
              {p.status === "사망" && <div className="bc-dead">사망 · 계보 보존</div>}
              {p.bornLineId && lineById[p.bornLineId] && (() => {
                const bl = lineById[p.bornLineId];
                const gf = parentById[bl.fatherId], gm = parentById[bl.motherId];
                return (
                  <div className="bc-lineage">
                    출신 <b>{bl.code}</b>
                    {(gf || gm) && <> · {gf ? gf.code : "?"}♂ × {gm ? gm.code : "?"}♀</>}
                  </div>
                );
              })()}
              {(p.sireId && parentById[p.sireId]) || (p.damId && parentById[p.damId]) ? (
                <div className="bc-lineage">
                  부모 {p.sireId && parentById[p.sireId] ? `${parentById[p.sireId].code}♂` : "?♂"} × {p.damId && parentById[p.damId] ? `${parentById[p.damId].code}♀` : "?♀"}
                </div>
              ) : null}
              <div className="bc-line" />
              <div className="bc-grid">
                <div><div className="s-l">총장</div><div className="s-v mono">{num(p.totalLength) ? n1(num(p.totalLength)) + "mm" : "—"}</div></div>
                <div><div className="s-l">턱 길이</div><div className="s-v mono">{num(p.jawLength) ? n1(num(p.jawLength)) + "mm" : "—"}</div></div>
                <div><div className="s-l">흉폭</div><div className="s-v mono">{num(p.thoraxWidth) ? n1(num(p.thoraxWidth)) + "mm" : "—"}</div></div>
                <div><div className="s-l">우화일</div><div className="s-v mono">{p.eclosionDate ? shortDate(p.eclosionDate) : "—"}</div></div>
              </div>
              {(num(p.jawWidth) || num(p.jawThick)) && (
                <div className="bc-grid" style={{ marginTop: 8 }}>
                  <div><div className="s-l">악폭</div><div className="s-v mono">{num(p.jawWidth) ? n1(num(p.jawWidth)) + "mm" : "—"}</div></div>
                  <div><div className="s-l">악후</div><div className="s-v mono">{num(p.jawThick) ? n1(num(p.jawThick)) + "mm" : "—"}</div></div>
                  <div><div className="s-l">턱 비율</div><div className="s-v mono">{num(p.totalLength) && num(p.jawLength) ? n1(num(p.jawLength) / num(p.totalLength) * 100) + "%" : "—"}</div></div>
                  <div />
                </div>
              )}
              {(p.source || p.memo) && <div className="bc-line" />}
              {p.source && <div className="bc-foot">입수처 · {p.source}</div>}
              {p.memo && <div className="bc-foot">{p.memo}</div>}
              <div className="bc-qr">QR 인증카드는 웹사이트 오픈 시 제공 예정</div>
            </div>

            {/* 사육 이력 표 (라벨지 스타일) */}
            <div className="p-t lt" style={{ display: "flex", alignItems: "center" }}>
              사육 이력 {(p.growthRecords || []).length ? `· ${p.growthRecords.length}건` : ""}
              <button className="btn tiny" style={{ marginLeft: "auto" }} onClick={() => setModal({ type: "growthRow", parentId: p.id })}>+ 추가</button>
            </div>
            {(p.growthRecords || []).length === 0 ? (
              <div className="empty sm"><div className="empty-d">사육 이력이 없어요.<br />+ 추가로 병갈이/측정 기록을 직접 넣거나,<br />나중에 유충이 우화하면 자동으로 채워져요.</div></div>
            ) : (
              <div className="dtable">
                <div className="dt-head">
                  <span className="dt-date">날짜</span>
                  <span className="dt-feed">먹이/병</span>
                  <span className="dt-w">무게</span>
                </div>
                {[...p.growthRecords].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => (
                  <div key={r.id} className="dt-row" onClick={() => setModal({ type: "growthRow", parentId: p.id, editId: r.id, initial: r })}>
                    <span className="dt-date mono">{shortDate(r.date)}{r.instar && <em className="dt-ins">{r.instar}</em>}</span>
                    <span className="dt-feed">{[r.feedBrand || r.feedType, ccLabel(r.bottleSize)].filter(Boolean).join(" · ")}</span>
                    <span className="dt-w mono">{num(r.weight) ? n1(num(r.weight)) + "g" : "—"}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-t lt">이 성충의 라인 {myLines.length ? `· ${myLines.length}개` : ""}</div>
            {myLines.length === 0 && (
              <div className="empty sm"><div className="empty-d">이 성충으로 만든 라인이 아직 없어요.<br />라인 탭에서 + 버튼으로 조합을 만들어보세요.</div></div>
            )}
            {myLines.map((L) => {
              const kids = larvaeOf(L.id);
              return (
                <div key={L.id} className="card" onClick={() => setView({ name: "lineDetail", id: L.id })}>
                  <div className="card-l">
                    <div className="tagrow"><span className="tag mono">{L.code}</span></div>
                    <div className="card-sub">{[L.species, pairLabel(L)].filter(Boolean).join(" · ")}</div>
                    <div className="card-val mono" style={{ fontSize: 17 }}>{kids.length}<small>마리</small></div>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 18 }}>
              {p.status === "사망" ? (
                <button className="btn ghost sm" style={{ width: "100%", marginBottom: 10 }}
                  onClick={() => { persist({ ...data, parents: data.parents.map((x) => x.id === p.id ? { ...x, status: "생존" } : x) }); say("사망 처리를 해제했어요"); }}>
                  ↩ 사망 처리 해제
                </button>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <ConfirmBtn className="btn sm" label="✕ 사망 처리 (정보는 계보에 보존)"
                    onConfirm={() => { persist({ ...data, parents: data.parents.map((x) => x.id === p.id ? { ...x, status: "사망" } : x) }); say("사망 처리됐어요 — 계보 정보는 유지돼요"); }} />
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <ConfirmBtn className="btn danger sm" label="이 성충 완전 삭제"
                  onConfirm={() => { persist({ ...data, parents: data.parents.filter((x) => x.id !== p.id) }); setView({ name: "list" }); say("성충이 삭제됐어요"); }} />
              </div>
            </div>
            <div style={{ height: 40 }} />
          </>
        );
      })()}

      {/* ───── 유충 상세 ───── */}
      {view.name === "detail" && cur && (() => {
        const L = lineById[cur.lineId] || {};
        const recs = sortedRecs(cur);
        const mw = maxWeight(cur), red = reduction(cur), loss = lossRate(cur), ld = larvaDays(cur, L);
        return (
          <>
            <div className="topbar">
              <button className="hbtn" onClick={() => setView(L.id ? { name: "lineDetail", id: L.id } : { name: "list" })}>‹ {L.code || "목록"}</button>
              <div className="tagrow">
                <span className="tag mono big">{cur.code}</span>
                <span className="chip" style={{ color: STATUS_COLOR[cur.status], borderColor: STATUS_COLOR[cur.status] + "55" }}>{cur.status}</span>
              </div>
              <button className="hbtn" onClick={() => setModal({ type: "larvaEdit", indId: cur.id })}>수정</button>
            </div>
            <div className="d-sub">{[L.code, L.species, cur.sex !== "미구분" ? cur.sex : null].filter(Boolean).join(" · ")}</div>

            <div className="stats">
              <div className="stat"><div className="s-l">최대 유충무게</div><div className="s-v mono">{mw ? n1(mw) + "g" : "—"}</div></div>
              <div className="stat"><div className="s-l">번데기 무게</div><div className="s-v mono">{num(cur.pupation?.pupaWeight) ? n1(num(cur.pupation.pupaWeight)) + "g" : "—"}</div></div>
              <div className="stat"><div className="s-l">성충 총장</div><div className="s-v mono">{num(cur.eclosion?.totalLength) ? n1(num(cur.eclosion.totalLength)) + "mm" : "—"}</div></div>
              <div className="stat hl"><div className="s-l">환원율</div><div className="s-v mono">{red ? n2(red) : "—"}</div></div>
              <div className="stat"><div className="s-l">로스율</div><div className="s-v mono">{loss != null ? n1(loss) + "%" : "—"}</div></div>
              <div className="stat"><div className="s-l">유충 기간</div><div className="s-v mono">{ld != null ? ld + "일" : "—"}</div></div>
            </div>

            {sortedRecs(cur).filter((r) => num(r.weight)).length >= 2 && (
              <div className="panel"><div className="p-t">성장 곡선</div><Spark ind={cur} w={300} h={64} big /></div>
            )}

            <div className="acts">
              <button className="btn primary" onClick={() => setModal({ type: "bottle", indId: cur.id })}>+ 병갈이</button>
              <button className="btn" onClick={() => setModal({ type: "pupation", indId: cur.id })}>{cur.pupation ? "용화 수정" : "용화 기록"}</button>
              <button className="btn" onClick={() => setModal({ type: "eclosion", indId: cur.id })}>{cur.eclosion ? "우화 수정" : "우화 기록"}</button>
            </div>

            {cur.eclosion && (
              cur.promotedToParentId && data.parents.find((p) => p.id === cur.promotedToParentId) ? (
                <button className="btn sm" style={{ width: "100%", marginBottom: 16, borderColor: "#A8884F66", color: "#937640" }}
                  onClick={() => setView({ name: "parentDetail", id: cur.promotedToParentId })}>
                  🪲 등록된 성충 보기 ›
                </button>
              ) : (
                <button className="btn primary sm" style={{ width: "100%", marginBottom: 16 }}
                  onClick={() => promoteToParent(cur)}>
                  ⬆ 성충으로 등록 (사육 이력 자동 이관)
                </button>
              )
            )}

            {cur.status === "사망" ? (
              <button className="btn ghost sm" style={{ width: "100%", marginBottom: 16 }}
                onClick={() => { updateInd(cur.id, { status: "유충" }); say("사망 처리를 해제했어요"); }}>
                ↩ 사망 처리 해제 (유충으로 되돌리기)
              </button>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <ConfirmBtn className="btn danger sm" label="✕ 사망 처리"
                  onConfirm={() => { updateInd(cur.id, { status: "사망" }); say("사망 처리됐어요"); }} />
              </div>
            )}

            {cur.eclosion && (
              <div className="panel">
                <div className="p-t">우화 · {cur.eclosion.date}{cur.eclosion.defect && <span className="warn"> 우화부전</span>}</div>
                <div className="meas mono">
                  {[["총장", cur.eclosion.totalLength], ["턱", cur.eclosion.jawLength], ["악폭", cur.eclosion.jawWidth], ["악후", cur.eclosion.jawThick], ["두폭", cur.eclosion.headWidth], ["흉폭", cur.eclosion.thoraxWidth], ["배", cur.eclosion.abdomenLength]]
                    .filter(([, v]) => num(v)).map(([k, v]) => <span key={k}>{k} <b>{v}</b>mm</span>)}
                </div>
                {cur.eclosion.memo && <div className="r-memo">{cur.eclosion.memo}</div>}
              </div>
            )}
            {cur.pupation && (
              <div className="panel">
                <div className="p-t">용화</div>
                <div className="meas mono">
                  {cur.pupation.prepupaDate && <span>전용 <b>{shortDate(cur.pupation.prepupaDate)}</b></span>}
                  {cur.pupation.pupaDate && <span>용화 <b>{shortDate(cur.pupation.pupaDate)}</b></span>}
                  {num(cur.pupation.pupaWeight) && <span>번데기 <b>{cur.pupation.pupaWeight}</b>g</span>}
                </div>
                {cur.pupation.memo && <div className="r-memo">{cur.pupation.memo}</div>}
              </div>
            )}

            <div className="p-t lt">병갈이 기록 {recs.length ? `· ${recs.length}회` : ""}</div>
            {recs.length === 0 && <div className="empty sm"><div className="empty-d">아직 기록이 없어요. + 병갈이로 첫 기록을 남겨보세요.</div></div>}
            {recs.map((r, idx) => {
              const prev = recs[idx - 1];
              const d = num(r.weight) && num(prev?.weight) ? num(r.weight) - num(prev.weight) : null;
              const gap = prev ? daysBetween(prev.date, r.date) : null;
              const isLast = idx === recs.length - 1;
              return (
                <div key={r.id} className="rec" onClick={() => setModal({ type: "bottle", indId: cur.id, editId: r.id, initial: r })}>
                  <div className="r-top">
                    <span className="mono r-date">{r.date}</span>
                    {r.instar && <span className="r-ins">{r.instar}</span>}
                    {gap != null && <span className="r-gap">먹은 기간 {gap}일</span>}
                    {num(r.weight) && <span className="mono r-w">{n1(num(r.weight))}g{d != null && <em className={d >= 0 ? "up" : "down"}> {d >= 0 ? "▲" : "▼"}{n1(Math.abs(d))}</em>}</span>}
                  </div>
                  <div className="r-mid">{[r.feedType, r.feedBrand, ccLabel(r.bottleSize), num(r.headWidth) ? `두폭 ${r.headWidth}` : null].filter(Boolean).join(" · ")}</div>
                  {(r.flags || []).length > 0 && (
                    <div className="flag-show">
                      {r.flags.map((fl) => <span key={fl} className="flag-tag">{fl}</span>)}
                    </div>
                  )}
                  {r.nextDate && (
                    <div className="r-next">
                      다음 예정 <b className="mono">{r.nextDate}</b>{isLast && cur.status === "유충" && <span className="dim"> ({dday(r.nextDate) <= 0 ? `${-dday(r.nextDate)}일 지남` : `D-${dday(r.nextDate)}`})</span>}
                    </div>
                  )}
                  {r.memo && <div className="r-memo">{r.memo}</div>}
                </div>
              );
            })}

            <div className="p-t lt" onClick={() => setInfoOpen(!infoOpen)} style={{ cursor: "pointer" }}>기본 정보 {infoOpen ? "▾" : "▸"}</div>
            {infoOpen && (
              <div className="panel">
                <div className="kv">
                  {[["라인", L.code], ["종", L.species], ["산지", L.origin],
                    ["부♂", parentById[L.fatherId] ? `${parentById[L.fatherId].code}${num(parentById[L.fatherId].totalLength) ? ` / ${parentById[L.fatherId].totalLength}mm` : ""}` : ""],
                    ["모♀", parentById[L.motherId] ? `${parentById[L.motherId].code}${num(parentById[L.motherId].totalLength) ? ` / ${parentById[L.motherId].totalLength}mm` : ""}` : ""],
                    ["해체일", L.breakdownDate], ["부화일", L.hatchDate],
                    ["온도", L.temp && L.temp + "℃"], ["장소", L.place], ["메모", cur.memo],
                  ].filter(([, v]) => v).map(([k, v]) => <div key={k} className="kv-row"><span className="kv-k">{k}</span><span className="kv-v">{v}</span></div>)}
                </div>
                <ConfirmBtn className="btn danger sm mt" label="이 유충 삭제"
                  onConfirm={() => { const lid = cur.lineId; persist({ ...data, individuals: data.individuals.filter((i) => i.id !== cur.id) }); setView(lid ? { name: "lineDetail", id: lid } : { name: "list" }); say("삭제됐어요"); }} />
              </div>
            )}
            <div style={{ height: 40 }} />
          </>
        );
      })()}

      {/* ───── 모달 ───── */}
      {modal?.type === "parent" && (
        <ParentForm
          initial={modal.editId ? data.parents.find((p) => p.id === modal.editId) : null}
          existingCodes={data.parents.map((p) => p.code)}
          allParents={data.parents}
          onSave={saveParent} onClose={() => setModal(null)} />
      )}
      {modal?.type === "growthRow" && (
        <div>
          <GrowthRowForm initial={modal.initial || null} brands={data.feedBrands} onSave={saveGrowthRow} onClose={() => setModal(null)} />
          {modal.editId && (
            <div className="del-float">
              <ConfirmBtn className="btn danger sm" label="이 이력 삭제" onConfirm={deleteGrowthRow} />
            </div>
          )}
        </div>
      )}
      {modal?.type === "line" && (
        <LineForm
          initial={modal.editId ? data.lines.find((l) => l.id === modal.editId) : null}
          parents={data.parents}
          existingCodes={data.lines.map((l) => l.code)}
          onSave={saveLine} onClose={() => setModal(null)} />
      )}
      {modal?.type === "larvaAdd" && (
        <LarvaAddForm
          line={lineById[modal.lineId]}
          existingCodes={larvaeOf(modal.lineId).map((i) => i.code)}
          onSave={addLarvae} onClose={() => setModal(null)} />
      )}
      {modal?.type === "bulkBottle" && (
        <BulkBottleForm
          larvae={larvaeOf(modal.lineId)}
          brands={data.feedBrands}
          onSave={saveBulkBottle} onClose={() => setModal(null)} />
      )}
      {modal?.type === "larvaEdit" && (
        <LarvaEditForm
          initial={data.individuals.find((i) => i.id === modal.indId)}
          lines={data.lines}
          onSave={saveLarvaEdit} onClose={() => setModal(null)} />
      )}
      {modal?.type === "bottle" && (
        <div>
          <BottleForm initial={modal.initial || null} brands={data.feedBrands} onSave={saveBottle} onClose={() => setModal(null)} />
          {modal.editId && (
            <div className="del-float">
              <ConfirmBtn className="btn danger sm" label="이 기록 삭제" onConfirm={() => {
                persist({ ...data, individuals: data.individuals.map((i) => i.id !== modal.indId ? i : { ...i, bottleRecords: i.bottleRecords.filter((r) => r.id !== modal.editId) }) });
                setModal(null); say("기록이 삭제됐어요");
              }} />
            </div>
          )}
        </div>
      )}
      {modal?.type === "pupation" && (
        <PupationForm initial={data.individuals.find((i) => i.id === modal.indId)?.pupation} onSave={savePupation} onClose={() => setModal(null)} />
      )}
      {modal?.type === "eclosion" && (() => {
        const ind = data.individuals.find((i) => i.id === modal.indId);
        const species = (lineById[ind?.lineId]?.species) || "";
        return <EclosionForm initial={ind?.eclosion} species={species} onSave={saveEclosion} onClose={() => setModal(null)} />;
      })()}

      {settingsOpen && (
        <div className="overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <button className="hbtn" onClick={() => setSettingsOpen(false)}>닫기</button>
              <div className="mtitle">설정</div>
              <span style={{ width: 40 }} />
            </div>
            <div className="mbody">
              <div className="sect">클라우드 동기화 (폰 ↔ PC)</div>
              <div className="set-desc">동기화 키를 정해두면, 폰에서 올리고 PC에서 같은 키로 불러올 수 있어요. 기기가 바뀌어도 데이터가 안전해요.</div>
              <input className="in mt" value={syncKey} onChange={(e) => setSyncKey(e.target.value)} placeholder="나만의 동기화 키 (예: beetlelog-2026)" />
              <div className="row mt">
                <button className="btn" style={{ flex: 1 }} disabled={syncBusy} onClick={doUpload}>{syncBusy ? "처리 중…" : "☁︎ 올리기"}</button>
                <button className="btn primary" style={{ flex: 1 }} disabled={syncBusy} onClick={doDownload}>{syncBusy ? "처리 중…" : "⤓ 불러오기"}</button>
              </div>
              <div className="set-desc" style={{ marginTop: 8 }}>⚠️ 키는 비밀번호처럼 본인만 알게 하세요. 같은 키를 다른 기기에 입력하면 그 데이터를 받아올 수 있어요.</div>

              <div className="sect" style={{ marginTop: 24 }}>엑셀로 한 번에 등록</div>
              <div className="set-desc">양식을 받아 성충·라인·유충을 정리한 뒤 불러오면 한 번에 등록돼요. 같은 항목(종+관리번호, 라인명+종)은 최신 정보로 갱신하고, 새 항목은 추가해요. 유충의 병갈이 기록은 보존돼요.</div>
              <button className="btn mt" style={{ width: "100%" }} onClick={async () => { try { await downloadTemplate(); } catch (e) { say("⚠️ 양식 생성 실패 — 새로고침 후 다시 시도"); } }}>① 엑셀 양식 다운로드</button>
              <button className="btn primary mt" style={{ width: "100%" }} onClick={() => xlsxRef.current?.click()}>② 엑셀 불러오기</button>
              <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={importXLSX} />

              <div className="sect" style={{ marginTop: 24 }}>내보내기 / 백업</div>
              <button className="btn mt" style={{ width: "100%" }} onClick={() => (data.individuals.length || data.parents.length) ? exportXLSX(data) : say("내보낼 기록이 아직 없어요")}>전체 기록 엑셀로 내보내기</button>
              <button className="btn mt" style={{ width: "100%" }} onClick={async () => { const how = await deliverFile(`사육기록_백업_${today()}.json`, JSON.stringify(data, null, 1), "application/json"); say(how === "fail" ? "⚠️ Safari에서 시도해주세요" : "백업 파일 저장됨"); }}>JSON 백업 (사진 포함)</button>
              <button className="btn mt" style={{ width: "100%" }} onClick={() => fileRef.current?.click()}>JSON 백업 복원</button>
              <div className="set-desc" style={{ marginTop: 12 }}>데이터는 이 기기에만 저장돼요. 가끔 백업해두면 안전해요.</div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ════════════════════ 스타일 ════════════════════ */

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
