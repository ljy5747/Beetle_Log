/* ════════════════════ 성충 등록/수정 폼 ════════════════════ */
function ParentForm({ initial, existingCodes, allParents, preset, onSave, onClose }) {
  const [f, setF] = useState({
    code: "", sex: "수컷 ♂", species: "", line: "", origin: "", gen: "",
    totalLength: "", jawLength: "", jawWidth: "", jawThick: "", headWidth: "", thoraxWidth: "", eclosionDate: "", source: "", memo: "", photo: "",
    sireId: "", damId: "", year: "",
    ...(preset || {}), /* 종/혈통 폴더 안에서 추가하면 그 값이 미리 채워짐 */
    ...(initial || {}),
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
  /* 측정 항목은 필요한 것만 켜서 입력 (값이 이미 있거나 극태면 자동으로 켜짐) */
  const [msOn, setMsOn] = useState({
    jaw: !!(initial && initial.jawLength),
    head: !!(initial && initial.headWidth),
    thorax: !!(initial && initial.thoraxWidth),
    jawwt: !!(initial && (initial.jawWidth || initial.jawThick)) || (initial ? false : false),
  });
  useEffect(() => { if (isGeuktae) setMsOn((p) => (p.jawwt ? p : { ...p, jawwt: true })); }, [isGeuktae]);
  const save = () => {
    if (!f.code.trim()) return alert("관리번호는 필수입니다");
    /* 관리번호는 '같은 종' 안에서만 중복을 막음 (종이 다르면 같은 번호 사용 가능) */
    const dup = (allParents || []).some((p) =>
      p.id !== (initial && initial.id) &&
      norm(p.code) === norm(f.code) &&
      norm(p.species) === norm(f.species));
    if (dup) return alert(`'${f.code.trim()}' 번호는 ${norm(f.species) || "종 미입력"}에 이미 있어요`);
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
      <F label="종"><SpeciesPicker value={f.species} onChange={(v) => set("species", v)} placeholder="탭하여 선택" /></F>
      <div className="row">
        <F label="혈통 / 계보" half><input className="in" value={f.line} onChange={(e) => set("line", e.target.value)} /></F>
        <F label="산지" half><input className="in" value={f.origin} onChange={(e) => set("origin", e.target.value)} /></F>
      </div>
      <F label="연도">
        <SimplePicker options={yearOptions()} value={String(f.year || BASE_YEAR)} onChange={(v) => set("year", v)} placeholder="탭하여 선택" />
      </F>
      <F label="누대수">
        <SimplePicker options={GENS} value={f.gen} onChange={(v) => set("gen", v)} placeholder="탭하여 선택 (WD=와일드)" />
        <div className="hint" style={{ marginTop: 6 }}>
          와일드는 <b>WD</b>. 이 값으로 라인의 누대수가 자동 계산돼요 —
          같은 혈통·산지끼리면 세대가 올라가고(WF1→F2→F3), 다르면 <b>CBF1</b>이 돼요.
        </div>
      </F>
      <div className="sect">측정값</div>
      <F label="총장(체장) mm"><input className="in mono" inputMode="decimal" value={f.totalLength} onChange={(e) => set("totalLength", e.target.value)} /></F>
      {/* 필요한 항목만 켜서 입력 */}
      <div className="chiprow" style={{ marginTop: -4, marginBottom: 12 }}>
        {[["jaw", "턱 길이"], ["head", "두폭"], ["thorax", "흉폭"], ["jawwt", "악폭·악후"]].map(([k, label]) => (
          <button key={k} className={"chipbtn" + (msOn[k] ? " on" : "")}
            onClick={() => setMsOn((p) => ({ ...p, [k]: !p[k] }))}>{msOn[k] ? "− " : "+ "}{label}</button>
        ))}
      </div>
      {msOn.jaw && (
        <>
          <F label="턱 길이 mm"><input className="in mono" inputMode="decimal" value={f.jawLength} onChange={(e) => set("jawLength", e.target.value)} /></F>
          {num(f.totalLength) && num(f.jawLength) && (
            <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>
              턱 비율 <b>{n1(num(f.jawLength) / num(f.totalLength) * 100)}%</b> (턱÷체장){isDanchi ? " · 단치 평가" : ""}
            </div>
          )}
        </>
      )}
      {msOn.jawwt && (
        <>
          {isGeuktae && <div className="hint" style={{ marginTop: -4, marginBottom: 8, color: "#937640" }}>극태 종 — 악폭·악후를 기록하세요</div>}
          <div className="row">
            <F label="악폭 mm" half><input className="in mono" inputMode="decimal" value={f.jawWidth} onChange={(e) => set("jawWidth", e.target.value)} /></F>
            <F label="악후 mm" half><input className="in mono" inputMode="decimal" value={f.jawThick} onChange={(e) => set("jawThick", e.target.value)} /></F>
          </div>
        </>
      )}
      {msOn.head && (
        <F label="두폭 mm"><input className="in mono" inputMode="decimal" value={f.headWidth} onChange={(e) => set("headWidth", e.target.value)} /></F>
      )}
      {msOn.thorax && (
        <F label="흉폭 mm"><input className="in mono" inputMode="decimal" value={f.thoraxWidth} onChange={(e) => set("thoraxWidth", e.target.value)} /></F>
      )}
      <div className="sect">부모 (혈통 연결)</div>
      {(!allParents || allParents.length === 0) && <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>다른 성충을 등록하면 이 성충의 부모로 연결할 수 있어요</div>}
      <div className="row">
        <F label="부 성충 ♂︎" half>
          <select className="in" value={f.sireId || ""} onChange={(e) => set("sireId", e.target.value)}>
            <option value="">미지정</option>
            {(allParents || []).filter((p) => p.sex.includes("수") && p.id !== (initial && initial.id)).map((p) => (
              <option key={p.id} value={p.id}>{[p.code, p.species, num(p.totalLength) ? `${n1(num(p.totalLength))}mm` : null].filter(Boolean).join(" · ")}</option>
            ))}
          </select>
        </F>
        <F label="모 성충 ♀︎" half>
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
function GrowthRowForm({ initial, brands, onSave, onClose, onDelete, individuals }) {
  const [f, setF] = useState({
    date: today(), instar: "", feedType: "균사", feedBrand: "", bottleSize: "", weight: "", memo: "",
    ...(initial || {}),
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => { if (!f.date) return alert("날짜는 필수입니다"); const { nextDays, ...rest } = f; onSave(rest); };
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
        <F label="브랜드" half><FeedPicker feedType={f.feedType} value={f.feedBrand} brands={brands} individuals={individuals} onChange={(v) => set("feedBrand", v)} placeholder="탭하여 선택" /></F>
      </div>
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
      {onDelete && (
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px dashed var(--line)", textAlign: "center" }}>
          <ConfirmBtn className="btn danger sm" label="이 이력 삭제" onConfirm={onDelete} />
        </div>
      )}
      <datalist id="dl-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
    </Modal>
  );
}

/* ════════════════════ 라인 등록/수정 폼 ════════════════════ */
function LineForm({ initial, parents, existingCodes, onSave, onClose, onRenumber, hasLarvae, defaultYear: dy }) {
  const [f, setF] = useState({
    code: "", fatherId: "", motherId: "", species: "", origin: "", gen: "",
    pairDate: "", setDate: "", breakdownDate: "", memo: "", year: dy || "",
    ...(initial || {}),
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isEdit = !!initial;
  const pick = (role, pid) => {
    const p = parents.find((x) => x.id === pid);
    setF((prev) => {
      const next = {
        ...prev, [role]: pid,
        species: prev.species || p?.species || "",
        origin: prev.origin || p?.origin || "",
      };
      /* 부·모가 모두 정해지면 누대수 자동 계산 (직접 수정 가능) */
      const fa = parents.find((x) => x.id === next.fatherId);
      const mo = parents.find((x) => x.id === next.motherId);
      const auto = calcGen(fa, mo);
      if (auto) next.gen = auto;
      return next;
    });
  };
  const save = () => {
    if (!f.code.trim()) return alert("라인명은 필수입니다");
    if (!isEdit && existingCodes.includes(f.code.trim())) return alert("이미 사용 중인 라인명입니다");
    onSave({ ...f, code: f.code.trim() });
  };
  return (
    <Modal title={isEdit ? "라인 정보 수정" : "새 라인 만들기"} onClose={onClose} onSave={save}>
      <F label="라인명 *"><input className="in mono" value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="26-A" /></F>
      <F label="연도">
        <SimplePicker options={yearOptions()} value={String(f.year || BASE_YEAR)} onChange={(v) => set("year", v)} placeholder="탭하여 선택" />
        <div className="hint" style={{ marginTop: 6 }}>선택한 연도의 성충만 아래 종충 목록에 나와요</div>
      </F>
      <div className="sect">성충 조합</div>
      {parents.length === 0 && <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>성충 탭에서 부모를 먼저 등록하면 여기서 선택할 수 있어요</div>}
      <div className="row">
        <F label="♂︎ 종충" half>
          <select className="in" value={f.fatherId || ""} onChange={(e) => pick("fatherId", e.target.value)}>
            <option value="">미지정</option>
            {parents.filter((p) => p.sex.includes("수") && (itemYear(p) === String(f.year || BASE_YEAR) || p.id === f.fatherId)).map((p) => <option key={p.id} value={p.id}>{[p.code, p.species, num(p.totalLength) ? `${n1(num(p.totalLength))}mm` : null, p.line].filter(Boolean).join(" · ")}</option>)}
          </select>
        </F>
        <F label="♀︎ 종충" half>
          <select className="in" value={f.motherId || ""} onChange={(e) => pick("motherId", e.target.value)}>
            <option value="">미지정</option>
            {parents.filter((p) => p.sex.includes("암") && (itemYear(p) === String(f.year || BASE_YEAR) || p.id === f.motherId)).map((p) => <option key={p.id} value={p.id}>{[p.code, p.species, num(p.totalLength) ? `${n1(num(p.totalLength))}mm` : null, p.line].filter(Boolean).join(" · ")}</option>)}
          </select>
        </F>
      </div>
      <div className="row">
        <F label="종" half><SpeciesPicker value={f.species} onChange={(v) => set("species", v)} placeholder="탭하여 선택" /></F>
        <F label="산지" half><input className="in" value={f.origin} onChange={(e) => set("origin", e.target.value)} /></F>
      </div>
      <F label="누대수">
        <SimplePicker options={GENS} value={f.gen} onChange={(v) => set("gen", v)} placeholder="부·모를 고르면 자동 계산돼요" />
        {(() => {
          const fa = parents.find((x) => x.id === f.fatherId), mo = parents.find((x) => x.id === f.motherId);
          const auto = calcGen(fa, mo);
          if (!auto) return <div className="hint" style={{ marginTop: 6 }}>부·모 성충에 누대수를 입력해두면 자동으로 계산돼요</div>;
          return (
            <div className="hint" style={{ marginTop: 6 }}>
              자동 계산 <b className="mono">{auto}</b>
              {f.gen !== auto && <button className="btn tiny" style={{ marginLeft: 8 }} onClick={() => set("gen", auto)}>적용</button>}
            </div>
          );
        })()}
      </F>
      <div className="sect">날짜</div>
      <F label="페어링일"><input type="date" className="in" value={f.pairDate} onChange={(e) => set("pairDate", e.target.value)} /></F>
      <F label="산란 셋팅일"><input type="date" className="in" value={f.setDate} onChange={(e) => set("setDate", e.target.value)} /></F>
      <F label="산란 해체일"><input type="date" className="in" value={f.breakdownDate} onChange={(e) => set("breakdownDate", e.target.value)} /></F>
      {f.setDate && !f.breakdownDate && (
        <div className="hint" style={{ marginTop: -4, marginBottom: 11 }}>
          비워두면 캘린더에 <b className="mono">{addDays(f.setDate, 30)}</b> 해체 예정으로 표시돼요 (셋팅 +1달). 실제 해체일을 넣으면 그 날짜로 바뀝니다.
        </div>
      )}
      <F label="메모"><textarea className="in ta" value={f.memo} onChange={(e) => set("memo", e.target.value)} /></F>
      {isEdit && hasLarvae && (
        <>
          <div className="sect">유충 관리</div>
          <button className="btn" style={{ width: "100%" }} onClick={onRenumber}>유충 번호 일괄 변경</button>
          <div className="hint" style={{ marginTop: 7 }}>이 라인 유충들의 관리번호 앞부분(접두어)을 한 번에 바꿔요. 예: A-01 → B-01</div>
        </>
      )}
    </Modal>
  );
}

