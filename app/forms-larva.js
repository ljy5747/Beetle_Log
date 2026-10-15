/* ════════════════════ 번호 일괄 변경 폼 (접두어 바꾸기) ════════════════════ */
function RenumberForm({ line, larvae, onSave, onClose }) {
  const splitCode = (code) => {
    const m = String(code).match(/^(.*?)(\d+)\s*$/); /* 접두어 + 끝 숫자 */
    return m ? { prefix: m[1], num: m[2] } : { prefix: code, num: "" };
  };
  const guessPrefix = (() => {
    const counts = {};
    larvae.forEach((i) => { const p = splitCode(i.code).prefix; counts[p] = (counts[p] || 0) + 1; });
    let best = "", bestN = -1;
    Object.keys(counts).forEach((p) => { if (counts[p] > bestN) { best = p; bestN = counts[p]; } });
    return best;
  })();
  const [newPrefix, setNewPrefix] = useState(guessPrefix);
  const sorted = [...larvae].sort((a, b) => a.code.localeCompare(b.code, "ko", { numeric: true }));
  const preview = sorted.map((i) => {
    const { num } = splitCode(i.code);
    const newCode = num ? `${newPrefix}${num}` : `${newPrefix}${i.code}`;
    return { id: i.id, old: i.code, neu: newCode };
  });
  const newCodes = preview.map((p) => p.neu);
  const dupCode = newCodes.find((c, idx) => newCodes.indexOf(c) !== idx);
  const save = () => {
    if (dupCode) return alert(`'${dupCode}' 번호가 겹쳐요. 접두어를 다시 확인해주세요`);
    onSave(preview.filter((p) => p.old !== p.neu).map((p) => ({ id: p.id, code: p.neu })));
  };
  return (
    <Modal title={`${line.code} 번호 일괄 변경`} onClose={onClose} onSave={save}>
      <div className="hint" style={{ marginTop: -2, marginBottom: 12 }}>
        끝 번호(01, 02…)는 그대로 두고 <b>앞부분(접두어)만</b> 한 번에 바꿔요. 예: <b className="mono">A-01</b> → 접두어 <b className="mono">B-</b> → <b className="mono">B-01</b>
      </div>
      <F label="새 접두어"><input className="in mono" value={newPrefix} onChange={(e) => setNewPrefix(e.target.value)} placeholder="예: B-" /></F>
      <div className="sect">변경 미리보기 ({preview.length}마리)</div>
      <div className="panel" style={{ maxHeight: 280, overflowY: "auto" }}>
        {preview.map((p) => (
          <div key={p.id} className="kv-row">
            <span className="kv-k mono" style={{ width: "auto", flex: 1 }}>{p.old}</span>
            <span className="dim">→</span>
            <span className="kv-v mono" style={{ flex: 1, textAlign: "right", color: p.old !== p.neu ? "var(--gold-d)" : "var(--dim)", fontWeight: 700 }}>{p.neu}</span>
          </div>
        ))}
      </div>
      {dupCode && <div className="hint" style={{ color: "#B4503F" }}>⚠️ '{dupCode}' 번호가 겹쳐요. 접두어를 확인해주세요</div>}
    </Modal>
  );
}

/* ════════════════════ 유충 일괄 추가 폼 ════════════════════ */
function LarvaAddForm({ line, existingCodes, onSave, onClose }) {
  /* 기존 번호에서 접두어와 다음 번호를 이어받음 (예: SK-20 → 접두어 "SK-", 다음 21) */
  const parsed = existingCodes.map((c) => {
    const m = String(c).match(/^(.*?)(\d+)\s*$/);
    return m ? { prefix: m[1], num: parseInt(m[2]), pad: m[2].length } : null;
  }).filter(Boolean);
  /* 가장 많이 쓰인 접두어를 기본값으로 */
  const guessPrefix = (() => {
    if (!parsed.length) return "";
    const cnt = {};
    parsed.forEach((p) => { cnt[p.prefix] = (cnt[p.prefix] || 0) + 1; });
    return Object.keys(cnt).reduce((a, b) => (cnt[b] > cnt[a] ? b : a));
  })();
  /* 그 접두어를 쓰는 번호들 중 가장 큰 값 다음부터 */
  const sameGroup = parsed.filter((p) => p.prefix === guessPrefix);
  const nextStart = sameGroup.length ? Math.max(...sameGroup.map((p) => p.num)) + 1 : 1;
  const [f, setF] = useState({ prefix: guessPrefix, start: String(nextStart), count: "1", sex: "미구분", memo: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const start = parseInt(f.start), count = parseInt(f.count);
  const valid = isFinite(start) && start >= 0 && isFinite(count) && count >= 1 && count <= 100;
  /* 기존 번호와 같은 자릿수로 맞춤 (01 / 001 등) */
  const padLen = sameGroup.length ? Math.max(2, ...sameGroup.map((p) => p.pad)) : 2;
  const padN = (n) => String(n).padStart(padLen, "0");
  const codes = valid ? Array.from({ length: count }, (_, i) => `${f.prefix}${padN(start + i)}`) : [];
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
function BottleForm({ initial, brands, onSave, onClose, onDelete, individuals }) {
  const [f, setF] = useState({
    date: today(), instar: "", weight: "", headWidth: "",
    feedType: "균사", feedBrand: "", bottleSize: "", nextDate: "", memo: "", flags: [], pudding: false, photo: "",
    ...(initial || {}),
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const [photoBusy, setPhotoBusy] = useState(false);
  /* 교체 기록은 개수가 많아 사진을 작게 압축해 저장 */
  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoBusy(true);
    try { set("photo", await resizeImage(file, 560, 0.62)); }
    catch (err) { alert("사진을 불러오지 못했어요"); }
    setPhotoBusy(false);
    e.target.value = "";
  };
  const save = () => { if (!f.date) return alert("날짜는 필수입니다"); const { nextDays, ...rest } = f; onSave(rest); };
  return (
    <Modal title={initial ? "교체 기록 수정" : "교체 기록"} onClose={onClose} onSave={save}>
      <div className="row">
        <F label="교체 날짜 *" half><input type="date" className="in" value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
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
      <F label="푸딩컵">
        <button className={"chipbtn" + (f.pudding ? " on" : "")} onClick={() => set("pudding", !f.pudding)}>
          {f.pudding ? "✓ 푸딩컵" : "+ 푸딩컵"}
        </button>
        <div className="hint" style={{ marginTop: 6 }}>푸딩컵으로 먹인 기록이면 켜주세요. 그래프에서 <b>푸딩 다음에 넣은 병이 1병</b>으로 잡혀요.</div>
      </F>
      <F label="브랜드 · 제품명"><FeedPicker feedType={f.feedType} value={f.feedBrand} brands={brands} individuals={individuals} onChange={(v) => set("feedBrand", v)} placeholder="탭하여 선택" /></F>
      <F label="다음 교체 예정일">
        <input type="date" className="in" value={f.nextDate} onChange={(e) => set("nextDate", e.target.value)} />
        <div className="row" style={{ marginTop: 8, alignItems: "center", gap: 8 }}>
          <input className="in mono" inputMode="numeric" style={{ flex: "0 0 96px" }}
            value={f.nextDays || ""} placeholder="일수"
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              setF((p) => ({ ...p, nextDays: v, nextDate: v ? addDays(p.date || today(), parseInt(v)) : p.nextDate }));
            }} />
          <span className="hint" style={{ margin: 0 }}>
            일 뒤{f.nextDays ? <> → <b className="mono">{addDays(f.date || today(), parseInt(f.nextDays))}</b></> : " (숫자만 입력하면 자동 계산)"}
          </span>
        </div>
        <div className="chiprow">
          {[40, 90, 100, 120].map((d) => (
            <button key={d} className="chipbtn" onClick={() => setF((p) => ({ ...p, nextDays: String(d), nextDate: addDays(p.date || today(), d) }))}>+{d}일</button>
          ))}
        </div>
        <div className="hint">예정일을 정하면 캘린더 탭에 자동으로 표시돼요</div>
      </F>
      <F label="사진">
        <label className="photo-pick">
          {f.photo ? (
            <img src={f.photo} alt="" className="photo-prev sm" />
          ) : (
            <div className="photo-empty sm">{photoBusy ? "처리 중…" : "📷 사진 추가 (탭하여 선택)"}</div>
          )}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={pickPhoto} />
        </label>
        {f.photo && (
          <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => set("photo", "")}>사진 제거</button>
        )}
      </F>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} placeholder="식흔 상태 등" /></F>
      {onDelete && (
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px dashed var(--line)", textAlign: "center" }}>
          <ConfirmBtn className="btn danger sm" label="이 기록 삭제" onConfirm={onDelete} />
        </div>
      )}
      <datalist id="dl-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
    </Modal>
  );
}

/* ════════════════════ 일괄 병갈이 폼 ════════════════════ */
function BulkBottleForm({ larvae, brands, onSave, onClose, individuals }) {
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
    const { nextDays, ...rest } = f;
    onSave([...picked], rest);
  };
  return (
    <Modal title="일괄 교체" onClose={onClose} onSave={save}>
      {targets.length === 0 ? (
        <div className="hint">교체할 수 있는 유충(상태=유충)이 없어요.</div>
      ) : (
        <>
          <div className="sect">공통 입력값 (선택한 유충에 동일 적용)</div>
          <div className="row">
            <F label="교체 날짜 *" half><input type="date" className="in" value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
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
          <F label="브랜드 · 제품명"><FeedPicker feedType={f.feedType} value={f.feedBrand} brands={brands} individuals={individuals} onChange={(v) => set("feedBrand", v)} placeholder="탭하여 선택" /></F>
          <F label="다음 교체 예정일">
            <input type="date" className="in" value={f.nextDate} onChange={(e) => set("nextDate", e.target.value)} />
            <div className="row" style={{ marginTop: 8, alignItems: "center", gap: 8 }}>
              <input className="in mono" inputMode="numeric" style={{ flex: "0 0 96px" }}
                value={f.nextDays || ""} placeholder="일수"
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setF((p) => ({ ...p, nextDays: v, nextDate: v ? addDays(p.date || today(), parseInt(v)) : p.nextDate }));
                }} />
              <span className="hint" style={{ margin: 0 }}>
                일 뒤{f.nextDays ? <> → <b className="mono">{addDays(f.date || today(), parseInt(f.nextDays))}</b></> : " (숫자만 입력)"}
              </span>
            </div>
            <div className="chiprow">
              {[40, 90, 100, 120].map((d) => (
                <button key={d} className="chipbtn" onClick={() => setF((p) => ({ ...p, nextDays: String(d), nextDate: addDays(p.date || today(), d) }))}>+{d}일</button>
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
  const [f, setF] = useState({ prepupaDate: "", pupaDate: "", pupaWeight: "", memo: "", ...(initial || {}) });
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
  const [f, setF] = useState({ date: today(), totalLength: "", jawLength: "", jawWidth: "", jawThick: "", headWidth: "", thoraxWidth: "", abdomenLength: "", defect: false, memo: "", ...(initial || {}) });
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

