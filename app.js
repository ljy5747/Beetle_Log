/* ════════ 앱 본체 — 기능 추가/수정은 여기서 ════════ */
const { useState, useEffect, useRef } = React;
/* 설정값과 CSS는 data.js / styles.js 에서 불러옵니다 */
const { KEY, SPECIES, INSTARS, FEED_TYPES, BOTTLES, FLAGS, STATUS_COLOR, STATUSES } = window.APP_DATA;
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

/* ════════════════════ 성충 등록/수정 폼 ════════════════════ */
function ParentForm({ initial, existingCodes, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    code: "", sex: "수컷 ♂", species: "", line: "", origin: "",
    totalLength: "", jawLength: "", thoraxWidth: "", eclosionDate: "", source: "", memo: "", photo: "",
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
      <F label="종"><input className="in" list="dl-species" value={f.species} onChange={(e) => set("species", e.target.value)} placeholder="왕사슴벌레" /></F>
      <div className="row">
        <F label="혈통 / 계보" half><input className="in" value={f.line} onChange={(e) => set("line", e.target.value)} /></F>
        <F label="산지" half><input className="in" value={f.origin} onChange={(e) => set("origin", e.target.value)} /></F>
      </div>
      <div className="sect">측정값</div>
      <div className="row">
        <F label="총장 mm" half><input className="in mono" inputMode="decimal" value={f.totalLength} onChange={(e) => set("totalLength", e.target.value)} /></F>
        <F label="턱 길이 mm" half><input className="in mono" inputMode="decimal" value={f.jawLength} onChange={(e) => set("jawLength", e.target.value)} /></F>
      </div>
      <F label="흉폭 mm"><input className="in mono" inputMode="decimal" value={f.thoraxWidth} onChange={(e) => set("thoraxWidth", e.target.value)} /></F>
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
        <F label="브랜드" half><input className="in" list="dl-brands" value={f.feedBrand} onChange={(e) => set("feedBrand", e.target.value)} /></F>
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
            {parents.filter((p) => p.sex.includes("수")).map((p) => <option key={p.id} value={p.id}>{p.code}{p.species ? ` · ${p.species}` : ""}</option>)}
          </select>
        </F>
        <F label="모♀" half>
          <select className="in" value={f.motherId || ""} onChange={(e) => pick("motherId", e.target.value)}>
            <option value="">미지정</option>
            {parents.filter((p) => p.sex.includes("암")).map((p) => <option key={p.id} value={p.id}>{p.code}{p.species ? ` · ${p.species}` : ""}</option>)}
          </select>
        </F>
      </div>
      <div className="row">
        <F label="종" half><input className="in" list="dl-species" value={f.species} onChange={(e) => set("species", e.target.value)} /></F>
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
      <F label="브랜드 · 제품명"><input className="in" list="dl-brands" value={f.feedBrand} onChange={(e) => set("feedBrand", e.target.value)} placeholder="자주 쓰는 제품은 자동 저장돼요" /></F>
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
          <F label="브랜드 · 제품명"><input className="in" list="dl-brands" value={f.feedBrand} onChange={(e) => set("feedBrand", e.target.value)} /></F>
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
function EclosionForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { date: today(), totalLength: "", jawLength: "", headWidth: "", thoraxWidth: "", abdomenLength: "", defect: false, memo: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="우화 기록" onClose={onClose} onSave={() => onSave(f)}>
      <F label="우화일"><input type="date" className="in" value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
      <div className="row">
        <F label="총장 mm" half><input className="in mono" inputMode="decimal" value={f.totalLength} onChange={(e) => set("totalLength", e.target.value)} /></F>
        <F label="턱 길이 mm" half><input className="in mono" inputMode="decimal" value={f.jawLength} onChange={(e) => set("jawLength", e.target.value)} /></F>
      </div>
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
    "총장(mm)": p.totalLength, "턱 길이(mm)": p.jawLength, "흉폭(mm)": p.thoraxWidth,
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
function CalendarView({ data, onOpenLine, onOpenLarva, onAddEvent, onDeleteEvent }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(today());
  const [adding, setAdding] = useState(false);
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
            {e.customId && <button className="cal-del" onClick={() => onDeleteEvent(e.customId)}>삭제</button>}
          </div>
        ))}

        {adding ? (
          <div className="cal-add">
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
              <button className="btn ghost sm" onClick={() => { setAdding(false); setDraft({ title: "", memo: "", date: today(), useRemind: false, remindDate: "", remindTitle: "", remindMemo: "" }); }}>취소</button>
              <button className="btn primary sm" onClick={() => {
                if (!draft.title.trim()) return;
                if (!draft.date) return;
                const ev = { date: draft.date, title: draft.title.trim(), memo: draft.memo.trim() };
                if (draft.useRemind && draft.remindDate) {
                  ev.remindDate = draft.remindDate;
                  ev.remindTitle = draft.remindTitle.trim();
                  ev.remindMemo = draft.remindMemo.trim();
                }
                onAddEvent(ev);
                setDraft({ title: "", memo: "", date: today(), useRemind: false, remindDate: "", remindTitle: "", remindMemo: "" }); setAdding(false);
              }}>추가</button>
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
  const [lineView, setLineView] = useState("card");
  const [infoOpen, setInfoOpen] = useState(false);
  const fileRef = useRef(null);
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
      totalLength: ec.totalLength || "", jawLength: ec.jawLength || "", thoraxWidth: ec.thoraxWidth || "",
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
            <button className="btn ghost sm" onClick={() => (data.individuals.length || data.parents.length) ? exportXLSX(data) : say("내보낼 기록이 아직 없어요")}>⬇ 엑셀</button>
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
              const ws = kids.map((i) => num(latestRec(i)?.weight)).filter(Boolean);
              const avg = ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
              return (
                <div key={L.id} className="card" onClick={() => setView({ name: "lineDetail", id: L.id })}>
                  <div className="card-l">
                    <div className="tagrow">
                      <span className="tag mono">{L.code}</span>
                      {dd != null && <span className={"chip dd" + (dd <= 0 ? " over" : dd <= 3 ? " soon" : "")}>{dd <= 0 ? `병갈이 D+${-dd}` : `병갈이 D-${dd}`}</span>}
                    </div>
                    <div className="card-sub">{[L.species, pairLabel(L), L.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
                    <div className="card-val mono" style={{ fontSize: 17 }}>
                      {kids.length ? <>{kids.length}<small>마리</small>{avg && <em> 평균 {n1(avg)}g</em>}</> : <span className="dim">유충 없음</span>}
                    </div>
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
              /* 종별 그룹핑: 종 미입력은 '종 미지정'으로 */
              const groups = {};
              data.parents.forEach((p) => {
                const key = (p.species || "").trim() || "종 미지정";
                (groups[key] = groups[key] || []).push(p);
              });
              const groupNames = Object.keys(groups).sort((a, b) => {
                if (a === "종 미지정") return 1;
                if (b === "종 미지정") return -1;
                return a.localeCompare(b, "ko");
              });

              /* 종을 선택하지 않았으면 → 종 폴더 목록 */
              if (!speciesFolder || !groups[speciesFolder]) {
                return (
                  <div className="sp-grid">
                    {groupNames.map((gname) => {
                      const list = groups[gname];
                      const males = list.filter((p) => p.sex.includes("수")).length;
                      const females = list.filter((p) => p.sex.includes("암")).length;
                      const alive = list.filter((p) => p.status !== "사망").length;
                      return (
                        <div key={gname} className="sp-card" onClick={() => setSpeciesFolder(gname)}>
                          <div className="sp-name serif">{gname}</div>
                          <div className="sp-meta">{list.length}마리 · ♂{males} ♀{females}</div>
                          <div className="sp-go">보기 ›</div>
                        </div>
                      );
                    })}
                  </div>
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
                  <div className="sp-back" onClick={() => setSpeciesFolder(null)}>‹ 종 목록</div>
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
              return (
                <div key={ind.id} className={"card" + (dead ? " dead" : "")} onClick={() => setView({ name: "detail", id: ind.id })}>
                  <div className="card-l">
                    <div className="tagrow">
                      <span className={"tag mono" + (dead ? " strike" : "")}>{ind.code}</span>
                      <span className="chip" style={{ color: STATUS_COLOR[ind.status], borderColor: STATUS_COLOR[ind.status] + "55" }}>{ind.status}</span>
                      {dd != null && <span className={"chip dd" + (dd <= 0 ? " over" : dd <= 3 ? " soon" : "")}>{dd <= 0 ? `D+${-dd} 지남` : `D-${dd}`}</span>}
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
              <div className="bc-line" />
              <div className="bc-grid">
                <div><div className="s-l">총장</div><div className="s-v mono">{num(p.totalLength) ? n1(num(p.totalLength)) + "mm" : "—"}</div></div>
                <div><div className="s-l">턱 길이</div><div className="s-v mono">{num(p.jawLength) ? n1(num(p.jawLength)) + "mm" : "—"}</div></div>
                <div><div className="s-l">흉폭</div><div className="s-v mono">{num(p.thoraxWidth) ? n1(num(p.thoraxWidth)) + "mm" : "—"}</div></div>
                <div><div className="s-l">우화일</div><div className="s-v mono">{p.eclosionDate ? shortDate(p.eclosionDate) : "—"}</div></div>
              </div>
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
                  {[["총장", cur.eclosion.totalLength], ["턱", cur.eclosion.jawLength], ["두폭", cur.eclosion.headWidth], ["흉폭", cur.eclosion.thoraxWidth], ["배", cur.eclosion.abdomenLength]]
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
              const isLast = idx === recs.length - 1;
              return (
                <div key={r.id} className="rec" onClick={() => setModal({ type: "bottle", indId: cur.id, editId: r.id, initial: r })}>
                  <div className="r-top">
                    <span className="mono r-date">{r.date}</span>
                    {r.instar && <span className="r-ins">{r.instar}</span>}
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
      {modal?.type === "eclosion" && (
        <EclosionForm initial={data.individuals.find((i) => i.id === modal.indId)?.eclosion} onSave={saveEclosion} onClose={() => setModal(null)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ════════════════════ 스타일 ════════════════════ */

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
