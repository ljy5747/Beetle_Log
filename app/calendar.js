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
      push(last.nextDate, { type: "bottle", label: `${ind.code} 교체`, sub: [L.code, L.species].filter(Boolean).join(" · "), lineId: ind.lineId, indId: ind.id });
    }
  });
  data.lines.forEach((L) => {
    if (L.pairDate) push(L.pairDate, { type: "pair", label: `${L.code} 페어링`, sub: L.species || "", lineId: L.id });
    if (L.setDate) push(L.setDate, { type: "setting", label: `${L.code} 산란 셋팅`, sub: L.species || "", lineId: L.id });
    if (L.breakdownDate) push(L.breakdownDate, { type: "breakdown", label: `${L.code} 산란 해체`, sub: L.species || "", lineId: L.id });
    /* 해체일을 아직 안 적었으면 셋팅 +1달을 '예정'으로 표시 (기록은 비워둔 채) */
    else if (L.setDate) push(addDays(L.setDate, 30), { type: "breakdownPlan", label: `${L.code} 해체 예정`, sub: `셋팅 +1달 · ${L.species || ""}`.trim(), lineId: L.id });
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
const EV_COLOR = { pair: "#B0698F", setting: "#C2705F", bottle: "#A8884F", breakdown: "#6E8494", breakdownPlan: "#A9B5C0", custom: "#5A7A9A", remind: "#C2705F" };

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

