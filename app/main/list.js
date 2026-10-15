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
              <div className="brand">BeetleLog</div>
              <div className="brand-sub">라인 {data.lines.length} · 유충 {data.individuals.length} · 성충 {data.parents.length}</div>
            </div>
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
                <div className="alert" onClick={() => goView({ name: "dueList" }, false)}>
                  <span className="alert-dot" />
                  {due > 0 ? <b>교체할 유충 {due}마리</b> : <b>곧 교체 {soon}마리</b>}
                  {due > 0 && soon > 0 && <span className="dim"> · 2일 내 {soon}마리 더</span>}
                  <span className="alert-go">보기 ›</span>
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
                <div className="empty-d">라인 = ♂︎ 종충 × ♀︎ 종충 조합이에요.<br />성충 탭에서 종충을 먼저 등록한 뒤<br />+ 버튼으로 라인을 만들고 유충을 일괄 추가하세요.</div>
              </div>
            )}

            {data.lines.length > 1 && (
              <div className="order-bar">
                <button className={"btn tiny" + (orderEdit ? " primary" : "")} onClick={() => setOrderEdit(!orderEdit)}>
                  {orderEdit ? "✓ 순서 편집 완료" : "↕ 순서 편집"}
                </button>
              </div>
            )}

            <YearNav value={lineYear} onChange={(y) => { setLineYear(y); setOrderEdit(false); }}
              count={data.lines.filter((l) => itemYear(l) === lineYear).length} />

            <Sortable items={byOrder(data.lines.filter((l) => itemYear(l) === lineYear))} editing={orderEdit} onReorder={(ids) => {
              const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
              persist({ ...data, lines: data.lines.map((l) => ({ ...l, ord: idx[l.id] })) });
              say("순서가 바뀌었어요");
            }}>{(L) => {
              const kids = larvaeOf(L.id);
              const cnt = STATUSES.map((s) => [s, kids.filter((i) => i.status === s).length]).filter(([, n]) => n > 0);
              const dd = lineDday(L.id);
              const avgOf = (sexKey) => {
                const ws = kids.filter(isActive).filter((i) => sexKey === "수" ? i.sex?.includes("수") : sexKey === "암" ? i.sex?.includes("암") : !i.sex?.includes("수") && !i.sex?.includes("암"))
                  .map((i) => num(latestRec(i)?.weight)).filter(Boolean);
                return ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
              };
              const avgM = avgOf("수"), avgF = avgOf("암"), avgU = avgOf("미");
              return (
                <div key={L.id} className="card" onClick={() => goView({ name: "lineDetail", id: L.id }, false)}>
                  <div className="card-l">
                    <div className="tagrow">
                      <span className="tag mono">{L.code}</span>
                      {L.gen && <span className="chip gen mono">{L.gen}</span>}
                      {dd != null && <span className={"chip dd" + ddClass(dd)}>{dd <= 0 ? `교체 D+${-dd}` : `교체 D-${dd}`}</span>}
                    </div>
                    <div className="card-sub">{[L.species, L.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
                    {pairLabel(L) && <div className="card-pair">{pairLabel(L)}</div>}
                    <div className="card-val mono" style={{ fontSize: 17 }}>
                      {kids.length ? <>{kids.length}<small>마리</small></> : <span className="dim">유충 없음</span>}
                    </div>
                    {(avgM || avgF || avgU) && (
                      <div className="avg-row">
                        {avgM && <span className="avg-m"><span className="sx-m">♂︎</span> 평균 {n1(avgM)}g</span>}
                        {avgF && <span className="avg-f"><span className="sx-f">♀︎</span> 평균 {n1(avgF)}g</span>}
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
            }}</Sortable>
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
              /* 연도로 먼저 거른 뒤, 폴더 기준(종/혈통)으로 그룹핑. 미입력은 '미지정'으로 */
              const yearPool = data.parents.filter((p) => itemYear(p) === parentYear);
              const byLabel = folderBy === "line" ? "혈통" : "종";
              const noneKey = byLabel + " 미지정";
              const groups = {};
              yearPool.forEach((p) => {
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
                    <YearNav value={parentYear} onChange={(y) => { setParentYear(y); setSpeciesFolder(null); setOrderEdit(false); }}
                      count={yearPool.length} />
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
                            <div className="sp-name serif" title={gname}>{gname}</div>
                            <div className="sp-meta">{list.length}마리 · ♂︎{males} ♀︎{females}</div>
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
                    <span className="grp-cnt">{list.length}마리 · ♂︎{males} ♀︎{females}</span>
                  </div>
                  {list.length > 1 && (
                    <div className="order-bar">
                      <button className={"btn tiny" + (orderEdit ? " primary" : "")} onClick={() => setOrderEdit(!orderEdit)}>
                        {orderEdit ? "✓ 순서 편집 완료" : "↕ 순서 편집"}
                      </button>
                    </div>
                  )}
                  <Sortable items={byOrder(list)} editing={orderEdit} onReorder={(ids) => {
                    const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
                    persist({ ...data, parents: data.parents.map((x) => (idx[x.id] != null ? { ...x, ord: idx[x.id] } : x)) });
                    say("순서가 바뀌었어요");
                  }}>{(p) => {
                    const myLines = data.lines.filter((l) => l.fatherId === p.id || l.motherId === p.id).length;
                    const dead = p.status === "사망";
                    return (
                      <div key={p.id} className={"card" + (dead ? " dead" : "")} onClick={() => goView({ name: "parentDetail", id: p.id }, false)}>
                        <div className="card-l">
                          <div className="tagrow">
                            <span className={"tag mono" + (dead ? " strike" : "")}>{p.code}</span>
                            <span className={p.sex.includes("수") ? "sx-m" : "sx-f"}>{p.sex.includes("수") ? "♂︎" : "♀︎"}</span>
                            {p.gen && <span className="chip gen mono">{p.gen}</span>}
                            {dead && <span className="chip" style={{ color: "#9A9088", borderColor: "#9A908855" }}>사망</span>}
                          </div>
                          <div className="card-sub">{[p.line, p.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
                          <div className="card-val mono">
                            {num(p.totalLength) ? <>{n1(num(p.totalLength))}<small>mm</small></> : <span className="dim">사이즈 미입력</span>}
                            {myLines > 0 && <em> 라인 {myLines}</em>}
                          </div>
                        </div>
                        <SpeciesPhoto photo={p.photo} species={p.species} className="card-thumb" />
                      </div>
                    );
                  }}</Sortable>
                </>
              );
            })()}
          </>}

          {tab !== "calendar" && (
            <button className="fab" onClick={() => setModal(tab === "parents" ? { type: "parent" } : { type: "line" })}>＋</button>
          )}
        </>
      )}

